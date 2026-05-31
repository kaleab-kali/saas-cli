import { createHash } from "node:crypto";
import type { EimsBulkCallbackPayload, EimsBulkCallbackSummary } from "./eims-bulk-callback.service";
import { stableEimsCallbackJson } from "./eims-bulk-callback.service";
import { EimsBulkCallbackPersistenceService } from "./eims-bulk-callback-persistence.service";

class FakeCipher {
	encrypt(plaintext: string) {
		return `enc:${Buffer.from(plaintext, "utf8").toString("base64url")}`;
	}

	decrypt(ciphertext: string) {
		if (!ciphertext.startsWith("enc:")) throw new Error("Invalid ciphertext format");
		return Buffer.from(ciphertext.slice(4), "base64url").toString("utf8");
	}
}

const processedAt = new Date("2026-05-26T10:30:00.000Z");
const payload: EimsBulkCallbackPayload = {
	organizationId: "org_1",
	conversationId: "BATCH-20260526-001",
	callbackId: "callback-1",
	results: [
		{ documentNumber: "INV-001", status: "accepted", irn: "IRN-001" },
		{ documentNumber: "INV-002", status: "failed", errorCode: "67005", errorMessage: "Invalid sequence" },
		{ documentNumber: "INV-003", status: "pending" },
	],
};

const summary: EimsBulkCallbackSummary = {
	organizationId: "org_1",
	conversationId: "BATCH-20260526-001",
	idempotencyKey: "idem-1",
	duplicate: false,
	signatureStatus: "verified",
	reconciliationStatus: "attention",
	totals: {
		submitted: 3,
		accepted: 1,
		failed: 1,
		pending: 1,
	},
	failures: [{ documentNumber: "INV-002", errorCode: "67005", errorMessage: "Invalid sequence" }],
	processedAt: processedAt.toISOString(),
};

function callbackReceiptRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "receipt_1",
		organizationId: "org_1",
		conversationId: "BATCH-20260526-001",
		callbackId: "callback-1",
		idempotencyKey: "idem-1",
		encryptedPayload: Buffer.from(new FakeCipher().encrypt(stableEimsCallbackJson(payload)), "utf8"),
		payloadKeyVersion: "cipher:v1",
		payloadSha256: sha256(stableEimsCallbackJson(payload)),
		payloadBytes: 228,
		signatureSha256: sha256("signature"),
		signatureStatus: "verified",
		reconciliationStatus: "attention",
		submitted: 3,
		accepted: 1,
		failed: 1,
		pending: 1,
		failures: summary.failures,
		processedAt,
		duplicateCount: 0,
		lastDuplicateAt: null,
		createdAt: processedAt,
		updatedAt: processedAt,
		...overrides,
	};
}

function prismaMock() {
	return {
		eimsBulkCallbackReceipt: {
			create: jest.fn(),
			findMany: jest.fn(),
			findUnique: jest.fn(),
			update: jest.fn(),
		},
	};
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

describe("EimsBulkCallbackPersistenceService", () => {
	it("stores verified callback receipts durably with encrypted payloads", async () => {
		const prisma = prismaMock();
		prisma.eimsBulkCallbackReceipt.findUnique.mockResolvedValue(null);
		prisma.eimsBulkCallbackReceipt.create.mockImplementation((args: { data: Record<string, unknown> }) =>
			Promise.resolve(
				callbackReceiptRow({ ...args.data, id: "receipt_1", createdAt: processedAt, updatedAt: processedAt }),
			),
		);
		const service = new EimsBulkCallbackPersistenceService(new FakeCipher() as never, prisma as never);

		const stored = await service.storeVerifiedCallback({
			payload,
			signature: "sha256=signature",
			summary,
		});
		const createData = prisma.eimsBulkCallbackReceipt.create.mock.calls[0][0].data;

		expect(createData).toMatchObject({
			organizationId: "org_1",
			conversationId: "BATCH-20260526-001",
			callbackId: "callback-1",
			idempotencyKey: "idem-1",
			encryptedPayload: expect.any(Buffer),
			payloadKeyVersion: "cipher:v1",
			signatureStatus: "verified",
			reconciliationStatus: "attention",
			submitted: 3,
			accepted: 1,
			failed: 1,
			pending: 1,
		});
		expect(createData.payloadSha256).toBe(sha256(stableEimsCallbackJson(payload)));
		expect(createData.signatureSha256).toBe(sha256("signature"));
		expect(stored).toMatchObject({
			organizationId: "org_1",
			conversationId: "BATCH-20260526-001",
			duplicate: false,
			reconciliationStatus: "attention",
			totals: { submitted: 3, accepted: 1, failed: 1, pending: 1 },
		});
		expect(stored).not.toHaveProperty("encryptedPayload");
	});

	it("keeps callback retry idempotency durable across process restarts", async () => {
		const prisma = prismaMock();
		prisma.eimsBulkCallbackReceipt.findUnique.mockResolvedValue(callbackReceiptRow());
		prisma.eimsBulkCallbackReceipt.update.mockResolvedValue(
			callbackReceiptRow({ duplicateCount: 1, lastDuplicateAt: new Date("2026-05-26T10:31:00.000Z") }),
		);
		const service = new EimsBulkCallbackPersistenceService(new FakeCipher() as never, prisma as never);

		const duplicate = await service.storeVerifiedCallback({
			payload,
			signature: "sha256=signature",
			summary,
		});

		expect(prisma.eimsBulkCallbackReceipt.update).toHaveBeenCalledWith({
			where: { id: "receipt_1" },
			data: {
				duplicateCount: { increment: 1 },
				lastDuplicateAt: expect.any(Date),
			},
		});
		expect(duplicate).toMatchObject({
			duplicate: true,
			idempotencyKey: "idem-1",
			totals: summary.totals,
		});
	});

	it("lists tenant-scoped callback receipts without exposing encrypted payloads", async () => {
		const prisma = prismaMock();
		prisma.eimsBulkCallbackReceipt.findMany.mockResolvedValue([
			callbackReceiptRow({ id: "receipt_a", duplicateCount: 0 }),
			callbackReceiptRow({ id: "receipt_b", duplicateCount: 2, idempotencyKey: "idem-2" }),
		]);
		const service = new EimsBulkCallbackPersistenceService(new FakeCipher() as never, prisma as never);

		const receipts = await service.listReceipts("org_1", "BATCH-20260526-001");

		expect(prisma.eimsBulkCallbackReceipt.findMany).toHaveBeenCalledWith({
			where: {
				organizationId: "org_1",
				conversationId: "BATCH-20260526-001",
			},
			orderBy: [{ processedAt: "desc" }, { createdAt: "desc" }],
		});
		expect(receipts).toHaveLength(2);
		expect(receipts[0]).toMatchObject({ duplicate: false, idempotencyKey: "idem-1" });
		expect(receipts[1]).toMatchObject({ duplicate: true, idempotencyKey: "idem-2" });
		expect(receipts[0]).not.toHaveProperty("encryptedPayload");
	});
});
