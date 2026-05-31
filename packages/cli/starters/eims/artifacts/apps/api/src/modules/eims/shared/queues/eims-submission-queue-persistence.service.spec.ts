import { createHash } from "node:crypto";
import type { EimsQueuedSubmissionInput } from "./eims-submission-queue.service";
import {
	EimsSubmissionQueuePersistenceService,
	stableEimsQueueJson,
} from "./eims-submission-queue-persistence.service";

function queued(overrides: Partial<EimsQueuedSubmissionInput> = {}): EimsQueuedSubmissionInput {
	return {
		organizationId: "org_1",
		sourceSystemId: "src_1",
		documentNumber: "INV-001",
		payload: { documentType: "INV", totalValue: "115.00" },
		queueName: "eims:submission:org_1:src_1",
		reservationId: "org_1:src_1:9",
		counter: 9,
		previousIrn: "IRN-008",
		...overrides,
	};
}

function prismaMock() {
	return {
		eimsSourceSystemCounter: {
			findUnique: jest.fn(),
			upsert: jest.fn(),
		},
		eimsCounterReservation: {
			findFirst: jest.fn(),
			update: jest.fn(),
			upsert: jest.fn(),
		},
	};
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

describe("EimsSubmissionQueuePersistenceService", () => {
	it("hydrates the next counter from durable accepted and reserved rows", async () => {
		const prisma = prismaMock();
		prisma.eimsSourceSystemCounter.findUnique.mockResolvedValue({
			lastAcceptedCounter: BigInt(8),
			lastAcceptedIrn: "IRN-008",
			status: "healthy",
		});
		prisma.eimsCounterReservation.findFirst.mockResolvedValue({
			counter: BigInt(12),
			status: "submitting",
		});
		const service = new EimsSubmissionQueuePersistenceService(prisma as never);

		const state = await service.loadSourceState("org_1", "src_1");

		expect(prisma.eimsSourceSystemCounter.findUnique).toHaveBeenCalledWith({
			where: { sourceSystemId: "src_1" },
		});
		expect(prisma.eimsCounterReservation.findFirst).toHaveBeenCalledWith({
			where: { organizationId: "org_1", sourceSystemId: "src_1" },
			orderBy: { counter: "desc" },
		});
		expect(state).toEqual({
			lastAcceptedCounter: 8,
			lastAcceptedIrn: "IRN-008",
			nextCounter: 13,
			lastReservationStatus: "submitting",
		});
	});

	it("stores a durable reservation before SDK dispatch", async () => {
		const prisma = prismaMock();
		prisma.eimsSourceSystemCounter.upsert.mockResolvedValue({});
		prisma.eimsCounterReservation.upsert.mockResolvedValue({});
		const service = new EimsSubmissionQueuePersistenceService(prisma as never);

		await service.recordReservation(queued());
		const reservationData = prisma.eimsCounterReservation.upsert.mock.calls[0][0].create;
		const expectedHash = sha256(
			stableEimsQueueJson({
				counter: 9,
				documentNumber: "INV-001",
				payload: { documentType: "INV", totalValue: "115.00" },
				previousIrn: "IRN-008",
				sourceSystemId: "src_1",
			}),
		);

		expect(prisma.eimsSourceSystemCounter.upsert).toHaveBeenCalledWith({
			where: { sourceSystemId: "src_1" },
			create: expect.objectContaining({
				organizationId: "org_1",
				sourceSystemId: "src_1",
				lastAcceptedCounter: BigInt(0),
				lastAcceptedIrn: "IRN-008",
				status: "reservation_created",
			}),
			update: expect.objectContaining({
				status: "reservation_created",
				version: { increment: 1 },
			}),
		});
		expect(reservationData).toMatchObject({
			organizationId: "org_1",
			sourceSystemId: "src_1",
			invoiceId: "INV-001",
			counter: BigInt(9),
			previousIrn: "IRN-008",
			payloadHash: expectedHash,
			status: "submitting",
		});
	});

	it("marks accepted counters and failed outcomes durably", async () => {
		const prisma = prismaMock();
		prisma.eimsCounterReservation.update.mockResolvedValue({});
		prisma.eimsSourceSystemCounter.upsert.mockResolvedValue({});
		const service = new EimsSubmissionQueuePersistenceService(prisma as never);

		await service.markAccepted(queued(), "IRN-009");
		await service.markOutcome(queued({ counter: 10, reservationId: "org_1:src_1:10" }), "rejected_consumed", {
			errorCode: "67005",
			errorMessage: "Invalid sequence",
		});

		expect(prisma.eimsCounterReservation.update).toHaveBeenNthCalledWith(1, {
			where: { sourceSystemId_counter: { sourceSystemId: "src_1", counter: BigInt(9) } },
			data: expect.objectContaining({
				status: "accepted",
				eimsRequestId: "IRN-009",
				acceptedAt: expect.any(Date),
			}),
		});
		expect(prisma.eimsSourceSystemCounter.upsert).toHaveBeenCalledWith({
			where: { sourceSystemId: "src_1" },
			create: expect.objectContaining({
				lastAcceptedCounter: BigInt(9),
				lastAcceptedIrn: "IRN-009",
				status: "healthy",
			}),
			update: expect.objectContaining({
				lastAcceptedCounter: BigInt(9),
				lastAcceptedIrn: "IRN-009",
				status: "healthy",
			}),
		});
		expect(prisma.eimsCounterReservation.update).toHaveBeenNthCalledWith(2, {
			where: { sourceSystemId_counter: { sourceSystemId: "src_1", counter: BigInt(10) } },
			data: expect.objectContaining({
				status: "rejected_consumed",
				failedAt: expect.any(Date),
				errorCode: "67005",
				errorDetail: {
					errorCode: "67005",
					errorMessage: "Invalid sequence",
				},
			}),
		});
	});
});
