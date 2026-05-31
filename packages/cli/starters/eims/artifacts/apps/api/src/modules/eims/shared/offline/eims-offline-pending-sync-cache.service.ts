import { createHash } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CipherService } from "#shared/crypto/cipher.service";

export interface EimsOfflinePendingInvoiceInput {
	organizationId: string;
	sourceSystemId: string;
	documentNumber: string;
	payload: unknown;
	counter?: number;
	previousIrn?: string | null;
	capturedAt?: string;
	reason?: string;
}

export interface EimsOfflinePendingRecord {
	offlineId: string;
	organizationId: string;
	sourceSystemId: string;
	documentNumber: string;
	counter: number | null;
	previousIrn: string | null;
	capturedAt: string;
	reason: string;
	encryptedPayload: string;
	payloadSha256: string;
	payloadBytes: number;
	syncStatus: "pending_offline" | "syncing" | "synced" | "poisoned";
	attempts: number;
	acceptedIrn: string | null;
	lastError: string | null;
}

export interface EimsOfflinePendingSnapshot {
	offlineId: string;
	organizationId: string;
	sourceSystemId: string;
	documentNumber: string;
	counter: number | null;
	previousIrn: string | null;
	capturedAt: string;
	reason: string;
	payloadSha256: string;
	payloadBytes: number;
	syncStatus: EimsOfflinePendingRecord["syncStatus"];
	attempts: number;
	acceptedIrn: string | null;
	lastError: string | null;
	payloadReturned: false;
	encryptedPayloadReturned: false;
}

export interface EimsOfflineSyncClaim extends Omit<EimsOfflinePendingSnapshot, "payloadReturned"> {
	payloadReturned: true;
	payload: unknown;
}

export const stableEimsOfflineJson = (value: unknown): string => {
	if (Array.isArray(value)) return `[${value.map((item) => stableEimsOfflineJson(item)).join(",")}]`;
	if (value && typeof value === "object") {
		return `{${Object.keys(value as Record<string, unknown>)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${stableEimsOfflineJson((value as Record<string, unknown>)[key])}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
};

@Injectable()
export class EimsOfflinePendingSyncCacheService {
	private readonly records = new Map<string, EimsOfflinePendingRecord>();

	constructor(private readonly cipher: CipherService) {}

	storePending(input: EimsOfflinePendingInvoiceInput): EimsOfflinePendingSnapshot {
		if (!input.organizationId) throw new BadRequestException("organizationId is required for offline EIMS cache");
		if (!input.sourceSystemId) throw new BadRequestException("sourceSystemId is required for offline EIMS cache");
		if (!input.documentNumber) throw new BadRequestException("documentNumber is required for offline EIMS cache");

		const payloadJson = stableEimsOfflineJson(input.payload);
		const payloadSha256 = this.sha256(payloadJson);
		const offlineId = this.offlineId(input.organizationId, input.sourceSystemId, input.documentNumber, payloadSha256);
		const record: EimsOfflinePendingRecord = {
			offlineId,
			organizationId: input.organizationId,
			sourceSystemId: input.sourceSystemId,
			documentNumber: input.documentNumber,
			counter: input.counter ?? null,
			previousIrn: input.previousIrn ?? null,
			capturedAt: input.capturedAt ?? new Date().toISOString(),
			reason: input.reason ?? "network_unavailable",
			encryptedPayload: this.cipher.encrypt(payloadJson),
			payloadSha256,
			payloadBytes: Buffer.byteLength(payloadJson, "utf8"),
			syncStatus: "pending_offline",
			attempts: 0,
			acceptedIrn: null,
			lastError: null,
		};
		this.records.set(this.recordKey(input.organizationId, offlineId), record);
		return this.redacted(record);
	}

	listPending(organizationId: string): EimsOfflinePendingSnapshot[] {
		return [...this.records.values()]
			.filter((record) => record.organizationId === organizationId && record.syncStatus !== "synced")
			.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
			.map((record) => this.redacted(record));
	}

	claimForSync(organizationId: string, offlineId: string): EimsOfflineSyncClaim {
		const record = this.recordFor(organizationId, offlineId);
		const payloadJson = this.cipher.decrypt(record.encryptedPayload);
		if (this.sha256(payloadJson) !== record.payloadSha256) {
			record.syncStatus = "poisoned";
			record.lastError = "payload_integrity_failed";
			throw new BadRequestException("Offline EIMS payload integrity check failed");
		}

		record.syncStatus = "syncing";
		record.attempts += 1;
		record.lastError = null;

		return {
			...this.redacted(record),
			payloadReturned: true,
			payload: JSON.parse(payloadJson),
		};
	}

	markSynced(organizationId: string, offlineId: string, acceptedIrn: string): EimsOfflinePendingSnapshot {
		const record = this.recordFor(organizationId, offlineId);
		record.syncStatus = "synced";
		record.acceptedIrn = acceptedIrn;
		record.lastError = null;
		return this.redacted(record);
	}

	markRetryableFailure(organizationId: string, offlineId: string, error: string): EimsOfflinePendingSnapshot {
		const record = this.recordFor(organizationId, offlineId);
		record.syncStatus = "pending_offline";
		record.lastError = error;
		return this.redacted(record);
	}

	private recordFor(organizationId: string, offlineId: string) {
		const record = this.records.get(this.recordKey(organizationId, offlineId));
		if (!record) throw new NotFoundException("Offline EIMS cache record was not found");
		return record;
	}

	private redacted(record: EimsOfflinePendingRecord): EimsOfflinePendingSnapshot {
		return {
			offlineId: record.offlineId,
			organizationId: record.organizationId,
			sourceSystemId: record.sourceSystemId,
			documentNumber: record.documentNumber,
			counter: record.counter,
			previousIrn: record.previousIrn,
			capturedAt: record.capturedAt,
			reason: record.reason,
			payloadSha256: record.payloadSha256,
			payloadBytes: record.payloadBytes,
			syncStatus: record.syncStatus,
			attempts: record.attempts,
			acceptedIrn: record.acceptedIrn,
			lastError: record.lastError,
			payloadReturned: false,
			encryptedPayloadReturned: false,
		};
	}

	private offlineId(organizationId: string, sourceSystemId: string, documentNumber: string, payloadSha256: string) {
		return `offline_${this.sha256(`${organizationId}:${sourceSystemId}:${documentNumber}:${payloadSha256}`).slice(0, 20)}`;
	}

	private recordKey(organizationId: string, offlineId: string) {
		return `${organizationId}:${offlineId}`;
	}

	private sha256(value: string) {
		return createHash("sha256").update(value).digest("hex");
	}
}
