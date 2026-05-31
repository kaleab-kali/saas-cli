import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { CipherService } from "#shared/crypto/cipher.service";
import { PrismaService } from "#shared/database/prisma.service";
import {
	type EimsBulkCallbackPayload,
	type EimsBulkCallbackSummary,
	stableEimsCallbackJson,
} from "./eims-bulk-callback.service";

interface EimsBulkCallbackReceiptRow {
	id: string;
	organizationId: string;
	conversationId: string;
	callbackId: string | null;
	idempotencyKey: string;
	encryptedPayload: Uint8Array;
	payloadKeyVersion: string | null;
	payloadSha256: string;
	payloadBytes: number;
	signatureSha256: string | null;
	signatureStatus: "verified" | "polled" | "submitted";
	reconciliationStatus: "accepted" | "attention" | "processing";
	submitted: number;
	accepted: number;
	failed: number;
	pending: number;
	failures: unknown;
	processedAt: Date;
	duplicateCount: number;
	lastDuplicateAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

@Injectable()
export class EimsBulkCallbackPersistenceService {
	constructor(
		private readonly cipher: CipherService,
		private readonly prisma: PrismaService,
	) {}

	async storeVerifiedCallback({
		payload,
		rawBody,
		signature,
		summary,
	}: {
		payload: EimsBulkCallbackPayload;
		rawBody?: string;
		signature?: string;
		summary: EimsBulkCallbackSummary;
	}): Promise<EimsBulkCallbackSummary> {
		return this.storeReceipt({ payload, rawBody, signature, summary, callbackId: payload.callbackId ?? null });
	}

	async storePolledReconciliation({
		payload,
		rawBody,
		summary,
	}: {
		payload: EimsBulkCallbackPayload;
		rawBody?: string;
		summary: EimsBulkCallbackSummary;
	}): Promise<EimsBulkCallbackSummary> {
		return this.storeReceipt({ payload, rawBody, summary, callbackId: `poll:${payload.conversationId}` });
	}

	async storeSubmittedBatch({
		payload,
		rawBody,
		summary,
	}: {
		payload: EimsBulkCallbackPayload;
		rawBody?: string;
		summary: EimsBulkCallbackSummary;
	}): Promise<EimsBulkCallbackSummary> {
		return this.storeReceipt({ payload, rawBody, summary, callbackId: `submitted:${payload.conversationId}` });
	}

	async listReceipts(organizationId: string, conversationId?: string): Promise<EimsBulkCallbackSummary[]> {
		const rows = await this.prisma.eimsBulkCallbackReceipt.findMany({
			where: {
				organizationId,
				...(conversationId ? { conversationId } : {}),
			},
			orderBy: [{ processedAt: "desc" }, { createdAt: "desc" }],
		});
		return rows.map((row) => this.toSummary(row as EimsBulkCallbackReceiptRow, row.duplicateCount > 0));
	}

	async listPendingPollingConversations(limit = 50): Promise<
		Array<{
			organizationId: string;
			conversationId: string;
			submitted: number;
			pending: number;
			processedAt: string;
		}>
	> {
		const boundedLimit = this.positiveLimit(limit, 50);
		const rows = await this.prisma.eimsBulkCallbackReceipt.findMany({
			where: { reconciliationStatus: "processing" },
			orderBy: [{ processedAt: "asc" }, { createdAt: "asc" }],
			take: boundedLimit * 3,
		});
		const seen = new Set<string>();
		const conversations: Array<{
			organizationId: string;
			conversationId: string;
			submitted: number;
			pending: number;
			processedAt: string;
		}> = [];
		for (const row of rows as EimsBulkCallbackReceiptRow[]) {
			const key = `${row.organizationId}:${row.conversationId}`;
			if (seen.has(key)) continue;
			seen.add(key);
			conversations.push({
				organizationId: row.organizationId,
				conversationId: row.conversationId,
				submitted: row.submitted,
				pending: row.pending,
				processedAt: row.processedAt.toISOString(),
			});
			if (conversations.length >= boundedLimit) break;
		}
		return conversations;
	}

	private async storeReceipt({
		payload,
		rawBody,
		signature,
		summary,
		callbackId,
	}: {
		payload: EimsBulkCallbackPayload;
		rawBody?: string;
		signature?: string;
		summary: EimsBulkCallbackSummary;
		callbackId: string | null;
	}): Promise<EimsBulkCallbackSummary> {
		const payloadJson = rawBody ?? stableEimsCallbackJson(payload);
		const payloadSha256 = this.sha256(payloadJson);
		const existing = await this.prisma.eimsBulkCallbackReceipt.findUnique({
			where: {
				organizationId_idempotencyKey: {
					organizationId: summary.organizationId,
					idempotencyKey: summary.idempotencyKey,
				},
			},
		});

		if (existing) {
			const duplicate = await this.prisma.eimsBulkCallbackReceipt.update({
				where: { id: existing.id },
				data: {
					duplicateCount: { increment: 1 },
					lastDuplicateAt: new Date(),
				},
			});
			return this.toSummary(duplicate as EimsBulkCallbackReceiptRow, true);
		}

		const receipt = await this.prisma.eimsBulkCallbackReceipt.create({
			data: {
				organizationId: summary.organizationId,
				conversationId: summary.conversationId,
				callbackId,
				idempotencyKey: summary.idempotencyKey,
				encryptedPayload: Buffer.from(this.cipher.encrypt(payloadJson), "utf8"),
				payloadKeyVersion: "cipher:v1",
				payloadSha256,
				payloadBytes: Buffer.byteLength(payloadJson, "utf8"),
				signatureSha256: signature ? this.sha256(signature.replace(/^sha256=/, "")) : null,
				signatureStatus: summary.signatureStatus,
				reconciliationStatus: summary.reconciliationStatus,
				submitted: summary.totals.submitted,
				accepted: summary.totals.accepted,
				failed: summary.totals.failed,
				pending: summary.totals.pending,
				failures: summary.failures,
				processedAt: new Date(summary.processedAt),
			},
		});

		return this.toSummary(receipt as EimsBulkCallbackReceiptRow, false);
	}

	private toSummary(row: EimsBulkCallbackReceiptRow, duplicate: boolean): EimsBulkCallbackSummary {
		return {
			organizationId: row.organizationId,
			conversationId: row.conversationId,
			idempotencyKey: row.idempotencyKey,
			duplicate,
			signatureStatus: row.signatureStatus,
			reconciliationStatus: row.reconciliationStatus,
			totals: {
				submitted: row.submitted,
				accepted: row.accepted,
				failed: row.failed,
				pending: row.pending,
			},
			failures: Array.isArray(row.failures) ? (row.failures as EimsBulkCallbackSummary["failures"]) : [],
			processedAt: row.processedAt.toISOString(),
		};
	}

	private sha256(value: string) {
		return createHash("sha256").update(value).digest("hex");
	}

	private positiveLimit(value: unknown, fallback: number) {
		const parsed = Number(value);
		return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
	}
}
