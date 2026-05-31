import { Injectable, Optional } from "@nestjs/common";
import {
	type EimsQueueReservationOutcome,
	EimsSubmissionQueuePersistenceService,
} from "./eims-submission-queue-persistence.service";
import { EimsSubmissionSourceLockService } from "./eims-submission-source-lock.service";

export interface EimsSubmissionQueueInput {
	organizationId: string;
	sourceSystemId?: string;
	documentNumber?: string;
	payload?: unknown;
}

export interface EimsQueuedSubmissionInput extends EimsSubmissionQueueInput {
	sourceSystemId: string;
	queueName: string;
	reservationId: string;
	counter: number;
	previousIrn: string | null;
}

export interface EimsSourceQueueSeed {
	lastAcceptedCounter?: number;
	lastAcceptedIrn?: string | null;
	nextCounter?: number;
}

interface SourceQueueState {
	lastAcceptedCounter: number;
	lastAcceptedIrn: string | null;
	nextCounter: number;
	pendingDepth: number;
	inFlight: number;
	lastReservationStatus: string | null;
}

export interface QueueMetadata {
	queueName: string;
	sourceSystemId: string;
	reservationId: string;
	counter: number;
	previousIrn: string | null;
	reservationStatus: string;
	persistenceStatus: "not_configured" | "reservation_recorded" | "outcome_recorded" | "outcome_persist_failed";
	pendingDepth: number;
}

interface DispatchResult {
	data?: unknown;
	meta?: unknown;
}
type EimsQueuedResponse<T extends DispatchResult> = T & { meta: Record<string, unknown> & { queue: QueueMetadata } };

@Injectable()
export class EimsSubmissionQueueService {
	private readonly states = new Map<string, SourceQueueState>();
	private readonly tails = new Map<string, Promise<unknown>>();

	constructor(
		@Optional()
		private readonly persistence?: EimsSubmissionQueuePersistenceService,
		@Optional()
		private readonly sourceLock?: EimsSubmissionSourceLockService,
	) {}

	seedSourceState(organizationId: string, sourceSystemId: string, seed: EimsSourceQueueSeed) {
		const key = this.sourceKey(organizationId, sourceSystemId);
		const lastAcceptedCounter = seed.lastAcceptedCounter ?? 0;
		this.states.set(key, {
			lastAcceptedCounter,
			lastAcceptedIrn: seed.lastAcceptedIrn ?? null,
			nextCounter: seed.nextCounter ?? lastAcceptedCounter + 1,
			pendingDepth: 0,
			inFlight: 0,
			lastReservationStatus: null,
		});
	}

	snapshotSource(organizationId: string, sourceSystemId: string) {
		const state = this.stateFor(organizationId, sourceSystemId);
		return {
			queueName: this.queueName(organizationId, sourceSystemId),
			sourceSystemId,
			lastAcceptedCounter: state.lastAcceptedCounter,
			lastAcceptedIrn: state.lastAcceptedIrn,
			nextCounter: state.nextCounter,
			pendingDepth: state.pendingDepth,
			inFlight: state.inFlight,
			lastReservationStatus: state.lastReservationStatus,
		};
	}

	async enqueueInvoice<T extends DispatchResult>(
		input: EimsSubmissionQueueInput,
		dispatch: (queued: EimsQueuedSubmissionInput) => Promise<T>,
	): Promise<EimsQueuedResponse<T>> {
		const sourceSystemId = this.normalizeSourceSystemId(input.sourceSystemId);
		const key = this.sourceKey(input.organizationId, sourceSystemId);
		const state = this.stateFor(input.organizationId, sourceSystemId);
		state.pendingDepth += 1;

		const previousTail = this.tails.get(key) ?? Promise.resolve();
		const run = previousTail
			.catch(() => undefined)
			.then(() => this.processInvoiceWithLock(input, sourceSystemId, state, dispatch));
		this.tails.set(
			key,
			run.then(
				() => undefined,
				() => undefined,
			),
		);
		return run;
	}

	private async processInvoiceWithLock<T extends DispatchResult>(
		input: EimsSubmissionQueueInput,
		sourceSystemId: string,
		state: SourceQueueState,
		dispatch: (queued: EimsQueuedSubmissionInput) => Promise<T>,
	): Promise<EimsQueuedResponse<T>> {
		let started = false;
		const process = () => {
			started = true;
			return this.processInvoice(input, sourceSystemId, state, dispatch);
		};
		try {
			return this.sourceLock
				? await this.sourceLock.withSourceLock(input.organizationId, sourceSystemId, process)
				: await process();
		} catch (error) {
			if (!started) {
				state.pendingDepth = Math.max(0, state.pendingDepth - 1);
				state.lastReservationStatus = "lock_unavailable";
			}
			throw error;
		}
	}

	private async processInvoice<T extends DispatchResult>(
		input: EimsSubmissionQueueInput,
		sourceSystemId: string,
		state: SourceQueueState,
		dispatch: (queued: EimsQueuedSubmissionInput) => Promise<T>,
	): Promise<EimsQueuedResponse<T>> {
		await this.hydrateFromPersistence(input.organizationId, sourceSystemId, state);
		state.pendingDepth = Math.max(0, state.pendingDepth - 1);
		state.inFlight += 1;
		const counter = state.nextCounter;
		state.nextCounter += 1;
		const previousIrn = state.lastAcceptedIrn;
		const reservationId = `${input.organizationId}:${sourceSystemId}:${counter}`;
		const queued: EimsQueuedSubmissionInput = {
			...input,
			sourceSystemId,
			queueName: this.queueName(input.organizationId, sourceSystemId),
			reservationId,
			counter,
			previousIrn,
		};
		let persistenceStatus: QueueMetadata["persistenceStatus"] = "not_configured";
		if (this.persistence) {
			await this.persistence.recordReservation(queued);
			persistenceStatus = "reservation_recorded";
		}

		try {
			const response = await dispatch(queued);
			const reservationStatus = this.reservationStatusFromResponse(response);
			const acceptedIrn = this.extractIrn(response) ?? previousIrn;
			state.lastReservationStatus = reservationStatus;
			if (reservationStatus === "accepted") {
				state.lastAcceptedCounter = counter;
				state.lastAcceptedIrn = acceptedIrn;
			}
			persistenceStatus = await this.persistOutcome(queued, reservationStatus, acceptedIrn, response);

			return this.withQueueMetadata(response, {
				queueName: queued.queueName,
				sourceSystemId,
				reservationId,
				counter,
				previousIrn,
				reservationStatus,
				persistenceStatus,
				pendingDepth: state.pendingDepth,
			});
		} catch (error) {
			state.lastReservationStatus = "failed_retryable";
			await this.persistOutcome(queued, "failed_retryable", null, error);
			throw error;
		} finally {
			state.inFlight = Math.max(0, state.inFlight - 1);
		}
	}

	private async hydrateFromPersistence(organizationId: string, sourceSystemId: string, state: SourceQueueState) {
		if (!this.persistence) return;
		const durable = await this.persistence.loadSourceState(organizationId, sourceSystemId);
		if (!durable) return;
		state.lastAcceptedCounter = Math.max(state.lastAcceptedCounter, durable.lastAcceptedCounter);
		state.lastAcceptedIrn = durable.lastAcceptedIrn ?? state.lastAcceptedIrn;
		state.nextCounter = Math.max(state.nextCounter, durable.nextCounter);
		state.lastReservationStatus = durable.lastReservationStatus ?? state.lastReservationStatus;
	}

	private async persistOutcome<T extends DispatchResult>(
		queued: EimsQueuedSubmissionInput,
		reservationStatus: string,
		acceptedIrn: string | null,
		detail: T | unknown,
	): Promise<QueueMetadata["persistenceStatus"]> {
		if (!this.persistence) return "not_configured";
		try {
			if (reservationStatus === "accepted") {
				await this.persistence.markAccepted(queued, acceptedIrn);
			} else {
				await this.persistence.markOutcome(
					queued,
					this.durableOutcomeStatus(reservationStatus),
					this.objectValue((detail as DispatchResult)?.data) ?? detail,
				);
			}
			return "outcome_recorded";
		} catch {
			return "outcome_persist_failed";
		}
	}

	private reservationStatusFromResponse(response: DispatchResult) {
		const data = this.objectValue(response.data);
		const status = typeof data?.status === "string" ? data.status : "unknown";
		if (status === "accepted") return "accepted";
		if (status === "failed_retryable") return "unknown";
		if (status === "rejected") return "rejected_consumed";
		return "manual_review";
	}

	private durableOutcomeStatus(status: string): Exclude<EimsQueueReservationOutcome, "accepted"> {
		if (status === "rejected_consumed") return "rejected_consumed";
		if (status === "manual_review") return "manual_review";
		if (status === "failed_retryable") return "failed_retryable";
		return "unknown";
	}

	private extractIrn(response: DispatchResult) {
		const data = this.objectValue(response.data);
		return typeof data?.irn === "string" && data.irn.length > 0 ? data.irn : null;
	}

	private withQueueMetadata<T extends DispatchResult>(response: T, queue: QueueMetadata): EimsQueuedResponse<T> {
		const meta = this.objectValue(response.meta) ?? {};
		return {
			...response,
			meta: {
				...meta,
				queue,
			},
		} as EimsQueuedResponse<T>;
	}

	private stateFor(organizationId: string, sourceSystemId: string) {
		const key = this.sourceKey(organizationId, sourceSystemId);
		const existing = this.states.get(key);
		if (existing) return existing;
		const created: SourceQueueState = {
			lastAcceptedCounter: 0,
			lastAcceptedIrn: null,
			nextCounter: 1,
			pendingDepth: 0,
			inFlight: 0,
			lastReservationStatus: null,
		};
		this.states.set(key, created);
		return created;
	}

	private sourceKey(organizationId: string, sourceSystemId: string) {
		return `${organizationId}:${sourceSystemId}`;
	}

	private queueName(organizationId: string, sourceSystemId: string) {
		return `eims:submission:${organizationId}:${sourceSystemId}`;
	}

	private normalizeSourceSystemId(sourceSystemId: string | undefined) {
		const normalized = sourceSystemId?.trim();
		return normalized && normalized.length > 0 ? normalized : "default-source";
	}

	private objectValue(value: unknown): Record<string, unknown> | null {
		return typeof value === "object" && value !== null && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: null;
	}
}
