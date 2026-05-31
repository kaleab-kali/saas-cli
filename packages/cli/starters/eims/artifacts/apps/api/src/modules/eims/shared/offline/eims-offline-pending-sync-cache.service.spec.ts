import { EimsOfflinePendingSyncCacheService } from "./eims-offline-pending-sync-cache.service";

class FakeCipher {
	encrypt(plaintext: string) {
		return `enc:${Buffer.from(plaintext, "utf8").toString("base64url")}`;
	}

	decrypt(ciphertext: string) {
		if (!ciphertext.startsWith("enc:")) throw new Error("Invalid ciphertext format");
		return Buffer.from(ciphertext.slice(4), "base64url").toString("utf8");
	}
}

const pendingInput = {
	organizationId: "org_1",
	sourceSystemId: "src_pos_1",
	documentNumber: "INV-OFFLINE-001",
	counter: 130,
	previousIrn: "IRN-PREVIOUS",
	capturedAt: "2026-05-26T10:30:00.000Z",
	payload: {
		documentType: "INV",
		totalValue: "115.00",
		lines: [{ itemCode: "SKU-001", quantity: "1", unitPrice: "100.00" }],
	},
};

describe("EimsOfflinePendingSyncCacheService", () => {
	it("encrypts pending offline payloads and returns only redacted metadata", () => {
		const cache = new EimsOfflinePendingSyncCacheService(new FakeCipher() as never);

		const stored = cache.storePending(pendingInput);

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
		expect(stored.payloadSha256).toMatch(/^[a-f0-9]{64}$/);
		expect(stored.payloadBytes).toBeGreaterThan(0);
		expect(stored).not.toHaveProperty("payload");
		expect(stored).not.toHaveProperty("encryptedPayload");
	});

	it("decrypts and verifies payload integrity only when claimed for sync", () => {
		const cache = new EimsOfflinePendingSyncCacheService(new FakeCipher() as never);
		const stored = cache.storePending(pendingInput);

		const claim = cache.claimForSync("org_1", stored.offlineId);

		expect(claim).toMatchObject({
			offlineId: stored.offlineId,
			payloadReturned: true,
			syncStatus: "syncing",
			attempts: 1,
			payload: pendingInput.payload,
		});
		expect(claim).not.toHaveProperty("encryptedPayload");
	});

	it("keeps offline queues tenant-scoped and hides synced records from pending lists", () => {
		const cache = new EimsOfflinePendingSyncCacheService(new FakeCipher() as never);
		const first = cache.storePending(pendingInput);
		cache.storePending({ ...pendingInput, organizationId: "org_2", documentNumber: "INV-OFFLINE-002" });

		expect(cache.listPending("org_1").map((row) => row.offlineId)).toEqual([first.offlineId]);

		const synced = cache.markSynced("org_1", first.offlineId, "IRN-OFFLINE-ACCEPTED");

		expect(synced).toMatchObject({ syncStatus: "synced", acceptedIrn: "IRN-OFFLINE-ACCEPTED" });
		expect(cache.listPending("org_1")).toEqual([]);
		expect(cache.listPending("org_2")).toHaveLength(1);
	});

	it("poisons tampered offline cache entries before dispatch", () => {
		const cache = new EimsOfflinePendingSyncCacheService(new FakeCipher() as never);
		const stored = cache.storePending(pendingInput);
		const records = cache as unknown as {
			records: Map<string, { encryptedPayload: string }>;
		};
		const record = records.records.get(`org_1:${stored.offlineId}`);
		if (!record) throw new Error("expected test cache record");
		record.encryptedPayload = new FakeCipher().encrypt(JSON.stringify({ changed: true }));

		expect(() => cache.claimForSync("org_1", stored.offlineId)).toThrow("integrity check failed");
		expect(cache.listPending("org_1")[0]).toMatchObject({
			syncStatus: "poisoned",
			lastError: "payload_integrity_failed",
		});
	});
});
