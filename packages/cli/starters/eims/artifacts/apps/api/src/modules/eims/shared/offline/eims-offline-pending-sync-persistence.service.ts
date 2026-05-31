import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CipherService } from "#shared/crypto/cipher.service";
import { PrismaService } from "#shared/database/prisma.service";
import {
	type EimsOfflinePendingInvoiceInput,
	type EimsOfflinePendingSnapshot,
	type EimsOfflineSyncClaim,
	stableEimsOfflineJson,
} from "./eims-offline-pending-sync-cache.service";

interface EimsOfflinePendingSyncRow {
	id: string;
	offlineId: string;
	organizationId: string;
	sourceSystemId: string;
	documentNumber: string;
	counter: bigint | number | null;
	previousIrn: string | null;
	capturedAt: Date;
	reason: string;
	encryptedPayload: Uint8Array;
	payloadKeyVersion: string | null;
	payloadSha256: string;
	payloadBytes: number;
	syncStatus: "pending_offline" | "syncing" | "synced" | "poisoned";
	attempts: number;
	acceptedIrn: string | null;
	lastError: string | null;
	claimedAt: Date | null;
	syncedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

@Injectable()
export class EimsOfflinePendingSyncPersistenceService {
	constructor(
		private readonly cipher: CipherService,
		private readonly prisma: PrismaService,
	) {}

	async storePending(input: EimsOfflinePendingInvoiceInput): Promise<EimsOfflinePendingSnapshot> {
		if (!input.organizationId) throw new BadRequestException("organizationId is required for offline EIMS persistence");
		if (!input.sourceSystemId) throw new BadRequestException("sourceSystemId is required for offline EIMS persistence");
		if (!input.documentNumber) throw new BadRequestException("documentNumber is required for offline EIMS persistence");

		const payloadJson = stableEimsOfflineJson(input.payload);
		const payloadSha256 = this.sha256(payloadJson);
		const offlineId = this.offlineId(input.organizationId, input.sourceSystemId, input.documentNumber, payloadSha256);
		const encryptedPayload = Buffer.from(this.cipher.encrypt(payloadJson), "utf8");
		const capturedAt = input.capturedAt ? new Date(input.capturedAt) : new Date();

		const row = await this.prisma.eimsOfflinePendingSync.upsert({
			where: {
				organizationId_offlineId: {
					organizationId: input.organizationId,
					offlineId,
				},
			},
			update: {
				counter: input.counter === undefined ? null : BigInt(input.counter),
				previousIrn: input.previousIrn ?? null,
				capturedAt,
				reason: input.reason ?? "network_unavailable",
				encryptedPayload,
				payloadKeyVersion: "cipher:v1",
				payloadSha256,
				payloadBytes: Buffer.byteLength(payloadJson, "utf8"),
				syncStatus: "pending_offline",
				acceptedIrn: null,
				lastError: null,
				claimedAt: null,
				syncedAt: null,
			},
			create: {
				offlineId,
				organizationId: input.organizationId,
				sourceSystemId: input.sourceSystemId,
				documentNumber: input.documentNumber,
				counter: input.counter === undefined ? null : BigInt(input.counter),
				previousIrn: input.previousIrn ?? null,
				capturedAt,
				reason: input.reason ?? "network_unavailable",
				encryptedPayload,
				payloadKeyVersion: "cipher:v1",
				payloadSha256,
				payloadBytes: Buffer.byteLength(payloadJson, "utf8"),
				syncStatus: "pending_offline",
			},
		});

		return this.redacted(row as EimsOfflinePendingSyncRow);
	}

	async listPending(organizationId: string): Promise<EimsOfflinePendingSnapshot[]> {
		const rows = await this.prisma.eimsOfflinePendingSync.findMany({
			where: { organizationId, syncStatus: { not: "synced" } },
			orderBy: [{ capturedAt: "asc" }, { createdAt: "asc" }],
		});
		return rows.map((row) => this.redacted(row as EimsOfflinePendingSyncRow));
	}

	async listPendingOrganizations(limit = 50): Promise<string[]> {
		const rows = await this.prisma.eimsOfflinePendingSync.findMany({
			where: { syncStatus: "pending_offline" },
			select: { organizationId: true },
			distinct: ["organizationId"],
			orderBy: { updatedAt: "asc" },
			take: Math.max(1, Math.min(limit, 500)),
		});
		return rows.map((row: { organizationId: string }) => row.organizationId);
	}

	async claimForSync(organizationId: string, offlineId: string): Promise<EimsOfflineSyncClaim> {
		const row = await this.recordFor(organizationId, offlineId);
		const payloadJson = this.cipher.decrypt(Buffer.from(row.encryptedPayload).toString("utf8"));
		if (this.sha256(payloadJson) !== row.payloadSha256) {
			await this.prisma.eimsOfflinePendingSync.update({
				where: { id: row.id },
				data: {
					syncStatus: "poisoned",
					lastError: "payload_integrity_failed",
				},
			});
			throw new BadRequestException("Offline EIMS payload integrity check failed");
		}

		const claimed = await this.prisma.eimsOfflinePendingSync.update({
			where: { id: row.id },
			data: {
				syncStatus: "syncing",
				attempts: { increment: 1 },
				lastError: null,
				claimedAt: new Date(),
			},
		});

		return {
			...this.redacted(claimed as EimsOfflinePendingSyncRow),
			payloadReturned: true,
			payload: JSON.parse(payloadJson),
		};
	}

	async markSynced(
		organizationId: string,
		offlineId: string,
		acceptedIrn: string,
	): Promise<EimsOfflinePendingSnapshot> {
		const row = await this.recordFor(organizationId, offlineId);
		const synced = await this.prisma.eimsOfflinePendingSync.update({
			where: { id: row.id },
			data: {
				syncStatus: "synced",
				acceptedIrn,
				lastError: null,
				syncedAt: new Date(),
			},
		});
		return this.redacted(synced as EimsOfflinePendingSyncRow);
	}

	async markRetryableFailure(
		organizationId: string,
		offlineId: string,
		error: string,
	): Promise<EimsOfflinePendingSnapshot> {
		const row = await this.recordFor(organizationId, offlineId);
		const retryable = await this.prisma.eimsOfflinePendingSync.update({
			where: { id: row.id },
			data: {
				syncStatus: "pending_offline",
				lastError: error,
			},
		});
		return this.redacted(retryable as EimsOfflinePendingSyncRow);
	}

	private async recordFor(organizationId: string, offlineId: string): Promise<EimsOfflinePendingSyncRow> {
		const row = await this.prisma.eimsOfflinePendingSync.findUnique({
			where: {
				organizationId_offlineId: {
					organizationId,
					offlineId,
				},
			},
		});
		if (!row) throw new NotFoundException("Offline EIMS pending-sync record was not found");
		return row as EimsOfflinePendingSyncRow;
	}

	private redacted(row: EimsOfflinePendingSyncRow): EimsOfflinePendingSnapshot {
		return {
			offlineId: row.offlineId,
			organizationId: row.organizationId,
			sourceSystemId: row.sourceSystemId,
			documentNumber: row.documentNumber,
			counter: row.counter === null ? null : Number(row.counter),
			previousIrn: row.previousIrn,
			capturedAt: row.capturedAt.toISOString(),
			reason: row.reason,
			payloadSha256: row.payloadSha256,
			payloadBytes: row.payloadBytes,
			syncStatus: row.syncStatus,
			attempts: row.attempts,
			acceptedIrn: row.acceptedIrn,
			lastError: row.lastError,
			payloadReturned: false,
			encryptedPayloadReturned: false,
		};
	}

	private offlineId(organizationId: string, sourceSystemId: string, documentNumber: string, payloadSha256: string) {
		return `offline_${this.sha256(`${organizationId}:${sourceSystemId}:${documentNumber}:${payloadSha256}`).slice(0, 20)}`;
	}

	private sha256(value: string) {
		return createHash("sha256").update(value).digest("hex");
	}
}
