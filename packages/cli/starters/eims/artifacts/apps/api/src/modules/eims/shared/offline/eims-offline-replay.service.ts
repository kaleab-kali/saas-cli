import { Inject, Injectable } from "@nestjs/common";
import {
	EIMS_EXTERNAL_CLIENT,
	type EimsExternalClient,
	type EimsExternalResponse,
} from "../client/eims-external-client";
import type { EimsOfflinePendingSnapshot } from "./eims-offline-pending-sync-cache.service";
import { EimsOfflinePendingSyncPersistenceService } from "./eims-offline-pending-sync-persistence.service";

export interface EimsOfflineReplayResult {
	offlineId: string;
	documentNumber: string;
	sourceSystemId: string;
	replayStatus: "synced" | "retryable";
	acceptedIrn: string | null;
	error: string | null;
	record: EimsOfflinePendingSnapshot;
	externalResponse?: EimsExternalResponse;
}

@Injectable()
export class EimsOfflineReplayService {
	constructor(
		@Inject(EIMS_EXTERNAL_CLIENT) private readonly client: EimsExternalClient,
		private readonly pendingSync: EimsOfflinePendingSyncPersistenceService,
	) {}

	async replayOne(organizationId: string, offlineId: string): Promise<EimsOfflineReplayResult> {
		const claim = await this.pendingSync.claimForSync(organizationId, offlineId);
		try {
			const response = await this.client.registerInvoice({
				organizationId,
				sourceSystemId: claim.sourceSystemId,
				documentNumber: claim.documentNumber,
				payload: claim.payload,
				counter: claim.counter ?? undefined,
				previousIrn: claim.previousIrn,
			});
			const acceptedIrn = this.acceptedIrn(response);
			if (acceptedIrn) {
				return {
					offlineId,
					documentNumber: claim.documentNumber,
					sourceSystemId: claim.sourceSystemId,
					replayStatus: "synced",
					acceptedIrn,
					error: null,
					record: await this.pendingSync.markSynced(organizationId, offlineId, acceptedIrn),
					externalResponse: response,
				};
			}

			return this.markRetryable(organizationId, offlineId, claim, this.retryableError(response), response);
		} catch (error) {
			return this.markRetryable(organizationId, offlineId, claim, this.errorMessage(error));
		}
	}

	async replayPending(organizationId: string, limit = 10): Promise<EimsOfflineReplayResult[]> {
		const pending = await this.pendingSync.listPending(organizationId);
		const candidates = pending
			.filter((record) => record.syncStatus === "pending_offline")
			.slice(0, Math.max(1, Math.min(limit, 50)));
		const results: EimsOfflineReplayResult[] = [];
		for (const record of candidates) {
			results.push(await this.replayOne(organizationId, record.offlineId));
		}
		return results;
	}

	private async markRetryable(
		organizationId: string,
		offlineId: string,
		claim: { documentNumber: string; sourceSystemId: string },
		error: string,
		externalResponse?: EimsExternalResponse,
	): Promise<EimsOfflineReplayResult> {
		return {
			offlineId,
			documentNumber: claim.documentNumber,
			sourceSystemId: claim.sourceSystemId,
			replayStatus: "retryable",
			acceptedIrn: null,
			error,
			record: await this.pendingSync.markRetryableFailure(organizationId, offlineId, error),
			externalResponse,
		};
	}

	private acceptedIrn(response: EimsExternalResponse) {
		const data = this.objectValue(response.data);
		const status = typeof data.status === "string" ? data.status : null;
		const irn = typeof data.irn === "string" && data.irn.length > 0 ? data.irn : null;
		return status === "accepted" && irn ? irn : null;
	}

	private retryableError(response: EimsExternalResponse) {
		const data = this.objectValue(response.data);
		const status = typeof data.status === "string" ? data.status : "unknown";
		const errorCode = typeof data.errorCode === "string" ? ` (${data.errorCode})` : "";
		return `EIMS offline replay returned ${status}${errorCode}`;
	}

	private errorMessage(error: unknown) {
		return error instanceof Error ? error.message : "EIMS offline replay failed";
	}

	private objectValue(value: unknown): Record<string, unknown> {
		return typeof value === "object" && value !== null && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: {};
	}
}
