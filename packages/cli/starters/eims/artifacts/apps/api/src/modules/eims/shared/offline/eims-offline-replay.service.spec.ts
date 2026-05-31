import type { EimsExternalClient } from "../client/eims-external-client";
import type { EimsOfflineSyncClaim } from "./eims-offline-pending-sync-cache.service";
import { EimsOfflineReplayService } from "./eims-offline-replay.service";

const claim: EimsOfflineSyncClaim = {
	offlineId: "offline_1",
	organizationId: "org_1",
	sourceSystemId: "src_pos_1",
	documentNumber: "INV-OFFLINE-001",
	counter: 42,
	previousIrn: "IRN-PREVIOUS",
	capturedAt: "2026-05-26T10:30:00.000Z",
	reason: "network_unavailable",
	payloadSha256: "a".repeat(64),
	payloadBytes: 128,
	syncStatus: "syncing",
	attempts: 1,
	acceptedIrn: null,
	lastError: null,
	payloadReturned: true,
	encryptedPayloadReturned: false,
	payload: { documentType: "INV", totalValue: "115.00" },
};

function pendingStoreMock() {
	return {
		claimForSync: jest.fn(),
		listPending: jest.fn(),
		markRetryableFailure: jest.fn(),
		markSynced: jest.fn(),
	};
}

describe("EimsOfflineReplayService", () => {
	it("replays a durable offline invoice through the EIMS external client and marks it synced", async () => {
		const client: EimsExternalClient = {
			registerInvoice: jest.fn().mockResolvedValue({ data: { status: "accepted", irn: "IRN-ACCEPTED" } }),
			registerReceipt: jest.fn(),
			verifyIrn: jest.fn(),
			validateCredential: jest.fn(),
			pollBulkStatus: jest.fn(),
			cancelInvoice: jest.fn(),
		};
		const pending = pendingStoreMock();
		pending.claimForSync.mockResolvedValue(claim);
		pending.markSynced.mockResolvedValue({
			...claim,
			payloadReturned: false,
			syncStatus: "synced",
			acceptedIrn: "IRN-ACCEPTED",
		});
		const service = new EimsOfflineReplayService(client, pending as never);

		const result = await service.replayOne("org_1", "offline_1");

		expect(client.registerInvoice).toHaveBeenCalledWith({
			organizationId: "org_1",
			sourceSystemId: "src_pos_1",
			documentNumber: "INV-OFFLINE-001",
			payload: { documentType: "INV", totalValue: "115.00" },
			counter: 42,
			previousIrn: "IRN-PREVIOUS",
		});
		expect(pending.markSynced).toHaveBeenCalledWith("org_1", "offline_1", "IRN-ACCEPTED");
		expect(result).toMatchObject({
			offlineId: "offline_1",
			replayStatus: "synced",
			acceptedIrn: "IRN-ACCEPTED",
			error: null,
		});
	});

	it("marks non-accepted SDK responses retryable without losing the durable row", async () => {
		const client: EimsExternalClient = {
			registerInvoice: jest.fn().mockResolvedValue({ data: { status: "failed_retryable", errorCode: "EIMS_TIMEOUT" } }),
			registerReceipt: jest.fn(),
			verifyIrn: jest.fn(),
			validateCredential: jest.fn(),
			pollBulkStatus: jest.fn(),
			cancelInvoice: jest.fn(),
		};
		const pending = pendingStoreMock();
		pending.claimForSync.mockResolvedValue(claim);
		pending.markRetryableFailure.mockResolvedValue({
			...claim,
			payloadReturned: false,
			syncStatus: "pending_offline",
			lastError: "EIMS offline replay returned failed_retryable (EIMS_TIMEOUT)",
		});
		const service = new EimsOfflineReplayService(client, pending as never);

		const result = await service.replayOne("org_1", "offline_1");

		expect(pending.markRetryableFailure).toHaveBeenCalledWith(
			"org_1",
			"offline_1",
			"EIMS offline replay returned failed_retryable (EIMS_TIMEOUT)",
		);
		expect(result).toMatchObject({
			replayStatus: "retryable",
			acceptedIrn: null,
			error: "EIMS offline replay returned failed_retryable (EIMS_TIMEOUT)",
		});
	});

	it("marks thrown SDK errors retryable for later replay", async () => {
		const client: EimsExternalClient = {
			registerInvoice: jest.fn().mockRejectedValue(new Error("SDK network timeout")),
			registerReceipt: jest.fn(),
			verifyIrn: jest.fn(),
			validateCredential: jest.fn(),
			pollBulkStatus: jest.fn(),
			cancelInvoice: jest.fn(),
		};
		const pending = pendingStoreMock();
		pending.claimForSync.mockResolvedValue(claim);
		pending.markRetryableFailure.mockResolvedValue({
			...claim,
			payloadReturned: false,
			syncStatus: "pending_offline",
			lastError: "SDK network timeout",
		});
		const service = new EimsOfflineReplayService(client, pending as never);

		const result = await service.replayOne("org_1", "offline_1");

		expect(pending.markRetryableFailure).toHaveBeenCalledWith("org_1", "offline_1", "SDK network timeout");
		expect(result).toMatchObject({
			replayStatus: "retryable",
			error: "SDK network timeout",
		});
	});

	it("replays pending records sequentially with a bounded limit", async () => {
		const client: EimsExternalClient = {
			registerInvoice: jest.fn().mockResolvedValue({ data: { status: "accepted", irn: "IRN-ACCEPTED" } }),
			registerReceipt: jest.fn(),
			verifyIrn: jest.fn(),
			validateCredential: jest.fn(),
			pollBulkStatus: jest.fn(),
			cancelInvoice: jest.fn(),
		};
		const pending = pendingStoreMock();
		pending.listPending.mockResolvedValue([
			{ ...claim, offlineId: "offline_a", syncStatus: "pending_offline" },
			{ ...claim, offlineId: "offline_b", syncStatus: "syncing" },
			{ ...claim, offlineId: "offline_c", syncStatus: "pending_offline" },
		]);
		pending.claimForSync.mockImplementation((_organizationId: string, offlineId: string) =>
			Promise.resolve({ ...claim, offlineId }),
		);
		pending.markSynced.mockImplementation((_organizationId: string, offlineId: string, acceptedIrn: string) =>
			Promise.resolve({ ...claim, offlineId, payloadReturned: false, syncStatus: "synced", acceptedIrn }),
		);
		const service = new EimsOfflineReplayService(client, pending as never);

		const results = await service.replayPending("org_1", 1);

		expect(results.map((row) => row.offlineId)).toEqual(["offline_a"]);
		expect(pending.claimForSync).toHaveBeenCalledTimes(1);
	});
});
