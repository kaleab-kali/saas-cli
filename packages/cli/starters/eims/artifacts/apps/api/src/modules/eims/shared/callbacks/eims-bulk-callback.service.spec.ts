import {
	createEimsBulkCallbackSignature,
	type EimsBulkCallbackPayload,
	EimsBulkCallbackService,
} from "./eims-bulk-callback.service";

const secret = "0123456789abcdef0123456789abcdef";
const now = new Date("2026-05-26T10:30:00.000Z");
const timestamp = now.toISOString();

const payload: EimsBulkCallbackPayload = {
	organizationId: "org_1",
	conversationId: "BATCH-20260526-001",
	callbackId: "callback-1",
	results: [
		{ documentNumber: "INV-001", status: "accepted", irn: "TEST-IRN-001" },
		{ documentNumber: "INV-002", status: "failed", errorCode: "67005", errorMessage: "Invalid sequence" },
		{ documentNumber: "INV-003", status: "pending" },
	],
};

const sign = (body: EimsBulkCallbackPayload = payload, at = timestamp) =>
	createEimsBulkCallbackSignature({ payload: body, secret, timestamp: at });

describe("EimsBulkCallbackService", () => {
	it("verifies signed bulk callbacks and reconciles mixed results", () => {
		const service = new EimsBulkCallbackService();

		const summary = service.verify({
			payload,
			timestamp,
			signature: sign(),
			secret,
			now,
			knownConversationIds: ["BATCH-20260526-001"],
		});

		expect(summary).toMatchObject({
			organizationId: "org_1",
			conversationId: "BATCH-20260526-001",
			duplicate: false,
			signatureStatus: "verified",
			reconciliationStatus: "attention",
			totals: { submitted: 3, accepted: 1, failed: 1, pending: 1 },
			failures: [{ documentNumber: "INV-002", errorCode: "67005" }],
		});
	});

	it("rejects callback payloads with an invalid HMAC signature", () => {
		const service = new EimsBulkCallbackService();

		expect(() =>
			service.verify({
				payload,
				timestamp,
				signature: "sha256=deadbeef",
				secret,
				now,
				knownConversationIds: ["BATCH-20260526-001"],
			}),
		).toThrow("signature verification failed");
	});

	it("rejects stale callback timestamps", () => {
		const service = new EimsBulkCallbackService();
		const staleTimestamp = "2026-05-26T09:30:00.000Z";

		expect(() =>
			service.verify({
				payload,
				timestamp: staleTimestamp,
				signature: sign(payload, staleTimestamp),
				secret,
				now,
				knownConversationIds: ["BATCH-20260526-001"],
			}),
		).toThrow("outside the allowed skew");
	});

	it("rejects unknown bulk conversations before reconciliation", () => {
		const service = new EimsBulkCallbackService();

		expect(() =>
			service.verify({
				payload,
				timestamp,
				signature: sign(),
				secret,
				now,
				knownConversationIds: ["BATCH-OTHER"],
			}),
		).toThrow("conversationId is not known");
	});

	it("deduplicates callback retries by idempotency key", () => {
		const service = new EimsBulkCallbackService();
		const input = {
			payload,
			timestamp,
			signature: sign(),
			secret,
			now,
			idempotencyKey: "idem-1",
			knownConversationIds: ["BATCH-20260526-001"],
		};

		const first = service.verify(input);
		const second = service.verify(input);

		expect(first.duplicate).toBe(false);
		expect(second).toMatchObject({
			duplicate: true,
			idempotencyKey: "idem-1",
			totals: first.totals,
		});
		expect(second.processedAt).toBe(first.processedAt);
	});
});
