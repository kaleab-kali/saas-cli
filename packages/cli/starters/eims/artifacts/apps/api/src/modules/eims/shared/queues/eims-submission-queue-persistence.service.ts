import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { Prisma } from "../../../../generated/prisma/client";
import type { EimsQueuedSubmissionInput } from "./eims-submission-queue.service";

export type EimsQueueReservationOutcome =
	| "accepted"
	| "failed_retryable"
	| "manual_review"
	| "rejected_consumed"
	| "unknown";

export interface EimsDurableSourceQueueState {
	lastAcceptedCounter: number;
	lastAcceptedIrn: string | null;
	nextCounter: number;
	lastReservationStatus: string | null;
}

interface EimsSourceSystemCounterRow {
	lastAcceptedCounter: bigint | number;
	lastAcceptedIrn: string | null;
	status: string;
}

interface EimsCounterReservationRow {
	counter: bigint | number;
	status: string;
}

export const stableEimsQueueJson = (value: unknown): string => {
	if (typeof value === "bigint") return JSON.stringify(value.toString());
	if (value instanceof Date) return JSON.stringify(value.toISOString());
	if (Array.isArray(value)) return `[${value.map((item) => stableEimsQueueJson(item)).join(",")}]`;
	if (value && typeof value === "object") {
		return `{${Object.keys(value as Record<string, unknown>)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${stableEimsQueueJson((value as Record<string, unknown>)[key])}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
};

@Injectable()
export class EimsSubmissionQueuePersistenceService {
	constructor(private readonly prisma: PrismaService) {}

	async loadSourceState(organizationId: string, sourceSystemId: string): Promise<EimsDurableSourceQueueState | null> {
		const [counter, latestReservation] = await Promise.all([
			this.prisma.eimsSourceSystemCounter.findUnique({
				where: { sourceSystemId },
			}),
			this.prisma.eimsCounterReservation.findFirst({
				where: { organizationId, sourceSystemId },
				orderBy: { counter: "desc" },
			}),
		]);
		if (!counter && !latestReservation) return null;

		const lastAcceptedCounter = counter
			? this.numberFromBigInt((counter as EimsSourceSystemCounterRow).lastAcceptedCounter)
			: 0;
		const latestReservationCounter = latestReservation
			? this.numberFromBigInt((latestReservation as EimsCounterReservationRow).counter)
			: 0;

		return {
			lastAcceptedCounter,
			lastAcceptedIrn: counter ? (counter as EimsSourceSystemCounterRow).lastAcceptedIrn : null,
			nextCounter: Math.max(lastAcceptedCounter + 1, latestReservationCounter + 1),
			lastReservationStatus: latestReservation
				? (latestReservation as EimsCounterReservationRow).status
				: ((counter as EimsSourceSystemCounterRow | null)?.status ?? null),
		};
	}

	async recordReservation(queued: EimsQueuedSubmissionInput) {
		const payloadJson = stableEimsQueueJson({
			counter: queued.counter,
			documentNumber: queued.documentNumber ?? null,
			payload: queued.payload ?? null,
			previousIrn: queued.previousIrn,
			sourceSystemId: queued.sourceSystemId,
		});
		const payloadHash = this.sha256(payloadJson);
		const now = new Date();

		await this.prisma.eimsSourceSystemCounter.upsert({
			where: { sourceSystemId: queued.sourceSystemId },
			create: {
				organizationId: queued.organizationId,
				sourceSystemId: queued.sourceSystemId,
				lastAcceptedCounter: BigInt(0),
				lastAcceptedIrn: queued.previousIrn,
				lastIssuedAt: now,
				status: "reservation_created",
			},
			update: {
				lastIssuedAt: now,
				status: "reservation_created",
				version: { increment: 1 },
			},
		});

		return this.prisma.eimsCounterReservation.upsert({
			where: {
				sourceSystemId_counter: {
					sourceSystemId: queued.sourceSystemId,
					counter: BigInt(queued.counter),
				},
			},
			create: {
				organizationId: queued.organizationId,
				sourceSystemId: queued.sourceSystemId,
				invoiceId: queued.documentNumber ?? queued.reservationId,
				counter: BigInt(queued.counter),
				previousIrn: queued.previousIrn,
				payloadHash,
				status: "submitting",
				submittedAt: now,
			},
			update: {
				previousIrn: queued.previousIrn,
				payloadHash,
				status: "submitting",
				submittedAt: now,
				failedAt: null,
				errorCode: null,
				errorDetail: Prisma.DbNull,
			},
		});
	}

	async markAccepted(queued: EimsQueuedSubmissionInput, acceptedIrn: string | null) {
		const acceptedAt = new Date();
		const irn = acceptedIrn ?? queued.previousIrn;

		await this.prisma.eimsCounterReservation.update({
			where: {
				sourceSystemId_counter: {
					sourceSystemId: queued.sourceSystemId,
					counter: BigInt(queued.counter),
				},
			},
			data: {
				status: "accepted",
				eimsRequestId: irn,
				acceptedAt,
				failedAt: null,
				errorCode: null,
				errorDetail: Prisma.DbNull,
			},
		});

		return this.prisma.eimsSourceSystemCounter.upsert({
			where: { sourceSystemId: queued.sourceSystemId },
			create: {
				organizationId: queued.organizationId,
				sourceSystemId: queued.sourceSystemId,
				lastAcceptedCounter: BigInt(queued.counter),
				lastAcceptedIrn: irn,
				lastIssuedAt: acceptedAt,
				status: "healthy",
			},
			update: {
				lastAcceptedCounter: BigInt(queued.counter),
				lastAcceptedIrn: irn,
				status: "healthy",
				version: { increment: 1 },
			},
		});
	}

	async markOutcome(
		queued: EimsQueuedSubmissionInput,
		status: Exclude<EimsQueueReservationOutcome, "accepted">,
		detail?: unknown,
	) {
		return this.prisma.eimsCounterReservation.update({
			where: {
				sourceSystemId_counter: {
					sourceSystemId: queued.sourceSystemId,
					counter: BigInt(queued.counter),
				},
			},
			data: {
				status,
				failedAt: new Date(),
				errorCode: this.errorCode(detail),
				errorDetail: this.errorDetail(detail) as Prisma.InputJsonValue,
			},
		});
	}

	private errorCode(detail: unknown) {
		const value = this.objectValue(detail);
		if (typeof value?.errorCode === "string") return value.errorCode;
		if (typeof value?.code === "string") return value.code;
		return null;
	}

	private errorDetail(detail: unknown): Record<string, unknown> {
		const value = this.objectValue(detail);
		if (value) return value;
		if (detail instanceof Error) return { name: detail.name, message: detail.message };
		return { message: String(detail ?? "unknown") };
	}

	private numberFromBigInt(value: bigint | number) {
		return typeof value === "bigint" ? Number(value) : value;
	}

	private objectValue(value: unknown): Record<string, unknown> | null {
		return typeof value === "object" && value !== null && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: null;
	}

	private sha256(value: string) {
		return createHash("sha256").update(value).digest("hex");
	}
}
