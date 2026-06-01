import { ForbiddenException } from "@nestjs/common";
import type { EimsSetupRepository } from "../../setup/domain/eims-setup.repository";
import type { EimsExternalClient } from "../../shared/client/eims-external-client";
import { EimsMockService } from "../../shared/mock/eims-mock.service";
import { EimsSubmissionQueueService } from "../../shared/queues/eims-submission-queue.service";
import { EimsSubmissionService } from "./eims-submission.service";

describe("EimsSubmissionService", () => {
	const organizationId = "org_test";
	const setupRepository = (overrides: Partial<EimsSetupRepository> = {}) =>
		({
			createEnterprise: jest.fn(),
			listEnterprises: jest.fn(),
			createEstablishment: jest.fn(),
			listEstablishments: jest.fn(),
			createSourceSystem: jest.fn(),
			listSourceSystems: jest.fn(),
			updateSourceApproval: jest.fn(),
			getSourceSubmissionReadiness: jest.fn(async () => ({
				approvalStatus: "approved",
				active: true,
				systemNumber: "SYS-1",
				credentialLastTestedAt: new Date("2026-05-26T08:00:00Z"),
				certificateValidTo: new Date("2027-05-26T08:00:00Z"),
				counterInitialized: true,
			})),
			...overrides,
		}) as EimsSetupRepository;

	it("submits invoices through the backend EIMS external client boundary", async () => {
		const client: EimsExternalClient = {
			registerInvoice: jest.fn(async (input) => ({
				data: {
					id: "sub_test",
					documentNumber: input.documentNumber,
					irn: "MOCK-IRN-SERVICE-001",
					status: "accepted",
				},
			})),
			registerReceipt: jest.fn(),
			verifyIrn: jest.fn(),
			validateCredential: jest.fn(),
			submitBulk: jest.fn(),
			pollBulkStatus: jest.fn(),
			cancelInvoice: jest.fn(),
		};
		const sourceRepo = setupRepository();
		const service = new EimsSubmissionService(
			client,
			new EimsMockService(),
			new EimsSubmissionQueueService(),
			sourceRepo,
		);

		const result = await service.submitInvoice({
			organizationId,
			sourceSystemId: "src_test",
			documentNumber: "INV-TEST-001",
			payload: { documentType: "INV" },
		});

		expect(client.registerInvoice).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId,
				sourceSystemId: "src_test",
				documentNumber: "INV-TEST-001",
				payload: { documentType: "INV" },
				queueName: "eims:submission:org_test:src_test",
				counter: 1,
				previousIrn: null,
			}),
		);
		expect(sourceRepo.getSourceSubmissionReadiness).toHaveBeenCalledWith(organizationId, "src_test");
		expect(result).toMatchObject({
			data: {
				id: "sub_test",
				documentNumber: "INV-TEST-001",
				irn: "MOCK-IRN-SERVICE-001",
				status: "accepted",
			},
			meta: {
				queue: {
					sourceSystemId: "src_test",
					counter: 1,
					reservationStatus: "accepted",
				},
			},
		});
	});

	it("keeps tenant overview data on the backend fixture service", () => {
		const client: EimsExternalClient = {
			registerInvoice: jest.fn(),
			registerReceipt: jest.fn(),
			verifyIrn: jest.fn(),
			validateCredential: jest.fn(),
			submitBulk: jest.fn(),
			pollBulkStatus: jest.fn(),
			cancelInvoice: jest.fn(),
		};
		const service = new EimsSubmissionService(
			client,
			new EimsMockService(),
			new EimsSubmissionQueueService(),
			setupRepository(),
		);

		const overview = service.getOverview(organizationId);

		expect(overview.data.organizationId).toBe(organizationId);
		expect(overview.data.setupProgress).toContainEqual(expect.objectContaining({ key: "source", status: "attention" }));
		expect(overview.data.setupProgress).not.toContainEqual(expect.objectContaining({ key: "phase0" }));
		expect(overview.data.sourceSystems).toContainEqual(
			expect.objectContaining({ id: "src_mock_1", approvalStatus: "approved" }),
		);
	});

	it("blocks SDK dispatch until the selected source is approved and configured", async () => {
		const client: EimsExternalClient = {
			registerInvoice: jest.fn(),
			registerReceipt: jest.fn(),
			verifyIrn: jest.fn(),
			validateCredential: jest.fn(),
			submitBulk: jest.fn(),
			pollBulkStatus: jest.fn(),
			cancelInvoice: jest.fn(),
		};
		const service = new EimsSubmissionService(
			client,
			new EimsMockService(),
			new EimsSubmissionQueueService(),
			setupRepository({
				getSourceSubmissionReadiness: jest.fn(async () => ({
					approvalStatus: "pending_mor_approval",
					active: false,
					systemNumber: null,
					credentialLastTestedAt: null,
					certificateValidTo: null,
					counterInitialized: false,
				})),
			}),
		);

		await expect(
			service.submitInvoice({
				organizationId,
				sourceSystemId: "src_pending",
				documentNumber: "INV-TEST-002",
			}),
		).rejects.toThrow(ForbiddenException);
		expect(client.registerInvoice).not.toHaveBeenCalled();
	});

	it("verifies IRNs through the backend external client boundary", async () => {
		const client: EimsExternalClient = {
			registerInvoice: jest.fn(),
			registerReceipt: jest.fn(),
			verifyIrn: jest.fn(async (input) => ({
				data: { ...input, status: "active", verifiedAt: "2026-05-26T10:30:00.000Z" },
			})),
			validateCredential: jest.fn(),
			submitBulk: jest.fn(),
			pollBulkStatus: jest.fn(),
			cancelInvoice: jest.fn(),
		};
		const service = new EimsSubmissionService(
			client,
			new EimsMockService(),
			new EimsSubmissionQueueService(),
			setupRepository(),
		);

		await expect(service.verifyIrn(organizationId, "MOCK-IRN-001")).resolves.toEqual({
			data: {
				organizationId,
				irn: "MOCK-IRN-001",
				status: "active",
				verifiedAt: "2026-05-26T10:30:00.000Z",
			},
		});
		expect(client.verifyIrn).toHaveBeenCalledWith({ organizationId, irn: "MOCK-IRN-001" });
	});
});
