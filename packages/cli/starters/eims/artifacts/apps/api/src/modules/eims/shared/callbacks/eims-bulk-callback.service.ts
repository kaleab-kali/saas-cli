import { createHmac, timingSafeEqual } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";

const PLACEHOLDER_SECRET_PATTERN = /change-me|replace-with|example|your-domain/i;

export interface EimsBulkCallbackDocumentResult {
	documentNumber: string;
	status: "accepted" | "failed" | "pending" | string;
	irn?: string | null;
	errorCode?: string | null;
	errorMessage?: string | null;
}

export interface EimsBulkCallbackPayload {
	organizationId: string;
	conversationId: string;
	callbackId?: string;
	results: EimsBulkCallbackDocumentResult[];
}

export interface EimsBulkCallbackVerificationInput {
	payload: EimsBulkCallbackPayload;
	timestamp: string;
	signature: string;
	secret?: string;
	rawBody?: string;
	idempotencyKey?: string;
	knownConversationIds?: string[];
	now?: Date;
	maxSkewSeconds?: number;
}

export interface EimsBulkCallbackSummary {
	organizationId: string;
	conversationId: string;
	idempotencyKey: string;
	duplicate: boolean;
	signatureStatus: "verified" | "polled" | "submitted";
	reconciliationStatus: "accepted" | "attention" | "processing";
	totals: {
		submitted: number;
		accepted: number;
		failed: number;
		pending: number;
	};
	failures: Array<{
		documentNumber: string;
		errorCode: string | null;
		errorMessage: string | null;
	}>;
	processedAt: string;
}

export const stableEimsCallbackJson = (value: unknown): string => {
	if (Array.isArray(value)) return `[${value.map((item) => stableEimsCallbackJson(item)).join(",")}]`;
	if (value && typeof value === "object") {
		return `{${Object.keys(value as Record<string, unknown>)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${stableEimsCallbackJson((value as Record<string, unknown>)[key])}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
};

export const createEimsBulkCallbackSignature = ({
	payload,
	rawBody,
	secret,
	timestamp,
}: {
	payload: EimsBulkCallbackPayload;
	rawBody?: string;
	secret: string;
	timestamp: string;
}) =>
	createHmac("sha256", secret)
		.update(`${timestamp}.${rawBody ?? stableEimsCallbackJson(payload)}`)
		.digest("hex");

export const summarizeEimsBulkCallbackPayload = (
	payload: EimsBulkCallbackPayload,
	idempotencyKey: string,
	now: Date,
	signatureStatus: EimsBulkCallbackSummary["signatureStatus"] = "verified",
): EimsBulkCallbackSummary => {
	const accepted = payload.results.filter((row) => row.status === "accepted").length;
	const failed = payload.results.filter((row) => row.status === "failed").length;
	const pending = payload.results.filter((row) => row.status === "pending").length;
	const reconciliationStatus = failed > 0 ? "attention" : pending > 0 ? "processing" : "accepted";

	return {
		organizationId: payload.organizationId,
		conversationId: payload.conversationId,
		idempotencyKey,
		duplicate: false,
		signatureStatus,
		reconciliationStatus,
		totals: {
			submitted: payload.results.length,
			accepted,
			failed,
			pending,
		},
		failures: payload.results
			.filter((row) => row.status === "failed")
			.map((row) => ({
				documentNumber: row.documentNumber,
				errorCode: row.errorCode ?? null,
				errorMessage: row.errorMessage ?? null,
			})),
		processedAt: now.toISOString(),
	};
};

@Injectable()
export class EimsBulkCallbackService {
	private readonly processed = new Map<string, EimsBulkCallbackSummary>();

	verify(input: EimsBulkCallbackVerificationInput): EimsBulkCallbackSummary {
		const secret = this.usableSecret(input.secret ?? process.env.EIMS_CALLBACK_HMAC_SECRET);
		this.assertFreshTimestamp(input.timestamp, input.now ?? new Date(), input.maxSkewSeconds ?? 300);
		this.assertConversationAllowed(input.payload.conversationId, input.knownConversationIds);
		this.assertSignature(input, secret);
		this.assertPayloadShape(input.payload);

		const idempotencyKey = this.idempotencyKey(input);
		const previous = this.processed.get(idempotencyKey);
		if (previous) return { ...previous, duplicate: true };

		const summary = summarizeEimsBulkCallbackPayload(input.payload, idempotencyKey, input.now ?? new Date());
		this.processed.set(idempotencyKey, summary);
		return summary;
	}

	private usableSecret(secret?: string) {
		if (!secret || secret.length < 32 || PLACEHOLDER_SECRET_PATTERN.test(secret)) {
			throw new UnauthorizedException("EIMS callback HMAC secret is not configured");
		}
		return secret;
	}

	private assertFreshTimestamp(timestamp: string, now: Date, maxSkewSeconds: number) {
		const parsed = new Date(timestamp);
		if (Number.isNaN(parsed.getTime())) throw new BadRequestException("EIMS callback timestamp is invalid");
		const skewSeconds = Math.abs(now.getTime() - parsed.getTime()) / 1000;
		if (skewSeconds > maxSkewSeconds)
			throw new UnauthorizedException("EIMS callback timestamp is outside the allowed skew");
	}

	private assertConversationAllowed(conversationId: string, knownConversationIds?: string[]) {
		if (!conversationId) throw new BadRequestException("EIMS callback conversationId is required");
		if (knownConversationIds && !knownConversationIds.includes(conversationId)) {
			throw new ConflictException("EIMS callback conversationId is not known for this tenant");
		}
	}

	private assertSignature(input: EimsBulkCallbackVerificationInput, secret: string) {
		const expected = createEimsBulkCallbackSignature({
			payload: input.payload,
			rawBody: input.rawBody,
			secret,
			timestamp: input.timestamp,
		});
		const actual = input.signature.replace(/^sha256=/, "");
		const expectedBuffer = Buffer.from(expected, "hex");
		const actualBuffer = Buffer.from(actual, "hex");
		if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
			throw new UnauthorizedException("EIMS callback signature verification failed");
		}
	}

	private assertPayloadShape(payload: EimsBulkCallbackPayload) {
		if (!payload.organizationId) throw new BadRequestException("EIMS callback organizationId is required");
		if (!Array.isArray(payload.results) || payload.results.length === 0) {
			throw new BadRequestException("EIMS callback results are required");
		}
		for (const result of payload.results) {
			if (!result.documentNumber) throw new BadRequestException("EIMS callback documentNumber is required");
		}
	}

	private idempotencyKey(input: EimsBulkCallbackVerificationInput) {
		return (
			input.idempotencyKey ??
			input.payload.callbackId ??
			`${input.payload.organizationId}:${input.payload.conversationId}:${input.timestamp}`
		);
	}
}
