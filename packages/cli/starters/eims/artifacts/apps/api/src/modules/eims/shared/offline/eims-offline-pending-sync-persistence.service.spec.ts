import { createHash } from "node:crypto";
import { EimsOfflinePendingSyncPersistenceService } from "./eims-offline-pending-sync-persistence.service";

class FakeCipher {
	encrypt(plaintext: string) {
		return `enc:${Buffer.from(plaintext, "utf8").toString("base64url")}`;
	}

	decrypt(ciphertext: string) {
		if (!ciphertext.startsWith("enc:")) throw new Error("Invalid ciphertext format");
		return Buffer.from(ciphertext.slice(4), "base64url").toString("utf8");
	}
}

const baseDate = new Date("2026-05-26T10:30:00.000Z");
const pendingPayload = {
	documentType: "INV",
	totalValue: "115.00",
	lines: [{ itemCode: "SKU-001", quantity: "1", unitPrice: "100.00" }],
};

const pendingInput = {
	organizationId: "org_1",
	sourceSystemId: "src_pos_1",
	documentNumber: "INV-OFFLINE-001",
	counter: 130,
	previousIrn: "IRN-PREVIOUS",
	capturedAt: baseDate.toISOString(),
	payload: pendingPayload,
};

function pendingRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "offline_row_1",
		offlineId: "offline_test",
		organizationId: "org_1",
		sourceSystemId: "src_pos_1",
		documentNumber: "INV-OFFLINE-001",
		counter: 130n,
		previousIrn: "IRN-PREVIOUS",
		capturedAt: baseDate,
		reason: "network_unavailable",
		encryptedPayload: Buffer.from(new FakeCipher().encrypt(JSON.stringify(pendingPayload)), "utf8"),
		payloadKeyVersion: "cipher:v1",
		payloadSha256: "a".repeat(64),
		payloadBytes: 128,
		syncStatus: "pending_offline",
		attempts: 0,
		acceptedIrn: null,
		lastError: null,
		claimedAt: null,
		syncedAt: null,
		createdAt: baseDate,
		updatedAt: baseDate,
		...overrides,
	};
}

function prismaMock() {
	return {
		eimsOfflinePendingSync: {
			upsert: jest.fn(),
			findMany: jest.fn(),
			findUnique: jest.fn(),
			update: jest.fn(),
		},
	};
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

describe("EimsOfflinePendingSyncPersistenceService", () => {
	it("stores encrypted pending payloads durably and returns only redacted metadata", async () => {
		const prisma = prismaMock();
		prisma.eimsOfflinePendingSync.upsert.mockImplementation((args: { create: Record<string, unknown> }) =>
			Promise.resolve(pendingRow({ ...args.create, id: "offline_row_1", createdAt: baseDate, updatedAt: baseDate })),
		);
		const service = new EimsOfflinePendingSyncPersistenceService(new FakeCipher() as never, prisma as never);

		const stored = await service.storePending(pendingInput);
		const createData = prisma.eimsOfflinePendingSync.upsert.mock.calls[0][0].create;

		expect(createData).toMatchObject({
			organizationId: "org_1",
			sourceSystemId: "src_pos_1",
			documentNumber: "INV-OFFLINE-001",
			counter: 130n,
			previousIrn: "IRN-PREVIOUS",
			encryptedPayload: expect.any(Buffer),
			payloadKeyVersion: "cipher:v1",
			syncStatus: "pending_offline",
		});
		expect(createData.payloadSha256).toMatch(/^[a-f0-9]{64}$/);
		expect(stored).toMatchObject({
			organizationId: "org_1",
			sourceSystemId: "src_pos_1",
			documentNumber: "INV-OFFLINE-001",
			counter: 130,
			previousIrn: "IRN-PREVIOUS",
			syncStatus: "pending_offline",
			payloadReturned: false,
			encryptedPayloadReturned: false,
		});
		expect(stored).not.toHaveProperty("payload");
		expect(stored).not.toHaveProperty("encryptedPayload");
	});

	it("lists tenant-scoped pending records without returning encrypted payloads", async () => {
		const prisma = prismaMock();
		prisma.eimsOfflinePendingSync.findMany.mockResolvedValue([
			pendingRow({ offlineId: "offline_a", capturedAt: new Date("2026-05-26T10:00:00.000Z") }),
			pendingRow({ offlineId: "offline_b", capturedAt: new Date("2026-05-26T10:01:00.000Z") }),
		]);
		const service = new EimsOfflinePendingSyncPersistenceService(new FakeCipher() as never, prisma as never);

		const pending = await service.listPending("org_1");

		expect(prisma.eimsOfflinePendingSync.findMany).toHaveBeenCalledWith({
			where: { organizationId: "org_1", syncStatus: { not: "synced" } },
			orderBy: [{ capturedAt: "asc" }, { createdAt: "asc" }],
		});
		expect(pending.map((row) => row.offlineId)).toEqual(["offline_a", "offline_b"]);
		expect(pending[0]).toMatchObject({ payloadReturned: false, encryptedPayloadReturned: false });
	});

	it("decrypts and claims payloads for sync only after integrity verification", async () => {
		const prisma = prismaMock();
		const cipher = new FakeCipher();
		const payloadJson = JSON.stringify(pendingPayload);
		const existing = pendingRow({
			offlineId: "offline_claim",
			encryptedPayload: Buffer.from(cipher.encrypt(payloadJson), "utf8"),
			payloadSha256: sha256(payloadJson),
		});
		prisma.eimsOfflinePendingSync.findUnique.mockResolvedValue(existing);
		prisma.eimsOfflinePendingSync.update.mockResolvedValue(
			pendingRow({ ...existing, syncStatus: "syncing", attempts: 1, claimedAt: new Date() }),
		);
		const service = new EimsOfflinePendingSyncPersistenceService(cipher as never, prisma as never);

		const claimed = await service.claimForSync("org_1", "offline_claim");

		expect(prisma.eimsOfflinePendingSync.update).toHaveBeenCalledWith({
			where: { id: "offline_row_1" },
			data: {
				syncStatus: "syncing",
				attempts: { increment: 1 },
				lastError: null,
				claimedAt: expect.any(Date),
			},
		});
		expect(claimed).toMatchObject({
			offlineId: "offline_claim",
			syncStatus: "syncing",
			attempts: 1,
			payloadReturned: true,
			payload: pendingPayload,
		});
		expect(claimed).not.toHaveProperty("encryptedPayload");
	});

	it("poisons tampered durable payloads before dispatch", async () => {
		const prisma = prismaMock();
		const cipher = new FakeCipher();
		const existing = pendingRow({
			offlineId: "offline_tampered",
			encryptedPayload: Buffer.from(cipher.encrypt(JSON.stringify({ changed: true })), "utf8"),
			payloadSha256: "a".repeat(64),
		});
		prisma.eimsOfflinePendingSync.findUnique.mockResolvedValue(existing);
		prisma.eimsOfflinePendingSync.update.mockResolvedValue(
			pendingRow({ ...existing, syncStatus: "poisoned", lastError: "payload_integrity_failed" }),
		);
		const service = new EimsOfflinePendingSyncPersistenceService(cipher as never, prisma as never);

		await expect(service.claimForSync("org_1", "offline_tampered")).rejects.toThrow("integrity check failed");
		expect(prisma.eimsOfflinePendingSync.update).toHaveBeenCalledWith({
			where: { id: "offline_row_1" },
			data: {
				syncStatus: "poisoned",
				lastError: "payload_integrity_failed",
			},
		});
	});

	it("records durable sync success and retryable failures", async () => {
		const prisma = prismaMock();
		const existing = pendingRow({ offlineId: "offline_done" });
		prisma.eimsOfflinePendingSync.findUnique.mockResolvedValue(existing);
		prisma.eimsOfflinePendingSync.update
			.mockResolvedValueOnce(pendingRow({ ...existing, syncStatus: "synced", acceptedIrn: "IRN-ACCEPTED" }))
			.mockResolvedValueOnce(pendingRow({ ...existing, syncStatus: "pending_offline", lastError: "EIMS timeout" }));
		const service = new EimsOfflinePendingSyncPersistenceService(new FakeCipher() as never, prisma as never);

		await expect(service.markSynced("org_1", "offline_done", "IRN-ACCEPTED")).resolves.toMatchObject({
			syncStatus: "synced",
			acceptedIrn: "IRN-ACCEPTED",
		});
		await expect(service.markRetryableFailure("org_1", "offline_done", "EIMS timeout")).resolves.toMatchObject({
			syncStatus: "pending_offline",
			lastError: "EIMS timeout",
		});
	});
});
