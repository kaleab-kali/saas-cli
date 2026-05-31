import { Body, Controller, Get, Inject, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { EimsBulkCallbackPersistenceService } from "../callbacks/eims-bulk-callback-persistence.service";
import { EimsCredentialPersistenceService } from "../crypto/eims-credential-persistence.service";
import { EimsCredentialSecretService } from "../crypto/eims-credential-secret.service";
import { EimsCredentialValidationService } from "../crypto/eims-credential-validation.service";
import { EIMS_BACKEND_REPOSITORY, type EimsBackendRepository } from "../mock/eims-backend.repository";
import type { EimsOfflinePendingInvoiceInput } from "../offline/eims-offline-pending-sync-cache.service";
import { EimsOfflinePendingSyncPersistenceService } from "../offline/eims-offline-pending-sync-persistence.service";
import { EimsOfflineReplayService } from "../offline/eims-offline-replay.service";
import { type EimsPrintProofInput, EimsPrintProofService } from "../printing/eims-print-proof.service";
import { EimsOfflineReplayQueueService } from "../queues/eims-offline-replay-queue.service";

interface AuthedRequest {
	organizationId: string;
}

@Controller("eims")
@UseGuards(AuthGuard, PermissionsGuard)
export class EimsSupportingResourcesController {
	constructor(
		@Inject(EIMS_BACKEND_REPOSITORY) private readonly repository: EimsBackendRepository,
		private readonly credentialStore: EimsCredentialPersistenceService,
		private readonly credentialSecrets: EimsCredentialSecretService,
		private readonly credentialValidation: EimsCredentialValidationService,
		private readonly bulkReceiptStore: EimsBulkCallbackPersistenceService,
		private readonly offlinePending: EimsOfflinePendingSyncPersistenceService,
		private readonly offlineReplay: EimsOfflineReplayService,
		private readonly offlineReplayQueue: EimsOfflineReplayQueueService,
		private readonly printProof: EimsPrintProofService,
	) {}

	@Get("credentials")
	@RequirePermissions("eims-credential:read")
	credentials(@Req() req: AuthedRequest) {
		return this.credentialStore.listCredentials(req.organizationId);
	}

	@Post("credentials")
	@RequirePermissions("eims-credential:create")
	async saveCredential(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
		const sealed = this.credentialSecrets.sealPayload(body);
		return this.credentialSecrets.withRedactionMetadata(
			await this.credentialStore.saveCredential(req.organizationId, sealed.persistablePayload),
			sealed,
		);
	}

	@Post("credentials/test")
	@RequirePermissions("eims-credential:create")
	testCredential(@Req() req: AuthedRequest, @Body() body: { sourceSystemId?: string }) {
		return this.credentialValidation.testCredential(req.organizationId, body.sourceSystemId);
	}

	@Post("credentials/rotate")
	@RequirePermissions("eims-credential:rotate")
	async rotateCredential(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
		const rotated = this.credentialSecrets.sealRotationPayload(body);
		return this.credentialSecrets.withRedactionMetadata(
			await this.credentialStore.saveCredential(req.organizationId, rotated.persistablePayload),
			rotated,
		);
	}

	@Get("certificates")
	@RequirePermissions("eims-certificate:read")
	certificates(@Req() req: AuthedRequest) {
		return this.repository.certificates(req.organizationId);
	}

	@Post("certificates/generate-csr")
	@RequirePermissions("eims-certificate:import")
	generateCsr(@Req() req: AuthedRequest, @Body() body: { sourceSystemId?: string }) {
		return this.repository.generateCsr(req.organizationId, body.sourceSystemId);
	}

	@Post("certificates/import")
	@RequirePermissions("eims-certificate:import")
	importCertificate(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
		return this.repository.importCertificate(req.organizationId, body);
	}

	@Get("bulk")
	@RequirePermissions("eims-bulk:read")
	bulk(@Req() req: AuthedRequest) {
		return this.repository.bulkBatches(req.organizationId);
	}

	@Post("bulk")
	@RequirePermissions("eims-bulk:create")
	submitBulk(@Req() req: AuthedRequest) {
		return this.repository.submitBulk(req.organizationId);
	}

	@Post("bulk/reconcile")
	@RequirePermissions("eims-bulk:retry")
	reconcileBulk(@Req() req: AuthedRequest, @Body() body: { conversationId?: string }) {
		return this.repository.reconcileBulk(req.organizationId, body.conversationId);
	}

	@Get("bulk/callback-receipts")
	@RequirePermissions("eims-bulk:read")
	bulkCallbackReceipts(@Req() req: AuthedRequest, @Query("conversationId") conversationId?: string) {
		return this.bulkReceiptStore.listReceipts(req.organizationId, conversationId);
	}

	@Get("offline-pending")
	@RequirePermissions("eims-submission:read")
	offlinePendingRecords(@Req() req: AuthedRequest) {
		return this.offlinePending.listPending(req.organizationId);
	}

	@Post("offline-pending")
	@RequirePermissions("eims-submission:create")
	captureOfflinePending(
		@Req() req: AuthedRequest,
		@Body() body: Omit<EimsOfflinePendingInvoiceInput, "organizationId">,
	) {
		return this.offlinePending.storePending({ ...body, organizationId: req.organizationId });
	}

	@Post("offline-pending/claim")
	@RequirePermissions("eims-submission:retry")
	claimOfflinePending(@Req() req: AuthedRequest, @Body() body: { offlineId: string }) {
		return this.offlinePending.claimForSync(req.organizationId, body.offlineId);
	}

	@Post("offline-pending/synced")
	@RequirePermissions("eims-submission:retry")
	markOfflinePendingSynced(@Req() req: AuthedRequest, @Body() body: { offlineId: string; acceptedIrn: string }) {
		return this.offlinePending.markSynced(req.organizationId, body.offlineId, body.acceptedIrn);
	}

	@Post("offline-pending/retryable-failure")
	@RequirePermissions("eims-submission:retry")
	markOfflinePendingRetryableFailure(@Req() req: AuthedRequest, @Body() body: { offlineId: string; error: string }) {
		return this.offlinePending.markRetryableFailure(req.organizationId, body.offlineId, body.error);
	}

	@Post("offline-pending/replay")
	@RequirePermissions("eims-submission:retry")
	replayOfflinePending(@Req() req: AuthedRequest, @Body() body: { offlineId?: string; limit?: number }) {
		if (body.offlineId) return this.offlineReplay.replayOne(req.organizationId, body.offlineId);
		return this.offlineReplay.replayPending(req.organizationId, body.limit);
	}

	@Post("offline-pending/replay-job")
	@RequirePermissions("eims-submission:retry")
	queueOfflinePendingReplay(@Req() req: AuthedRequest, @Body() body: { offlineId?: string; limit?: number }) {
		return this.offlineReplayQueue.enqueueReplay(req.organizationId, body);
	}

	@Get("cancellations")
	@RequirePermissions("invoice:read")
	cancellations(@Req() req: AuthedRequest) {
		return this.repository.cancellations(req.organizationId);
	}

	@Post("cancellations")
	@RequirePermissions("invoice:cancel")
	cancelInvoice(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
		return this.repository.cancelInvoice(req.organizationId, body);
	}

	@Get("buyers")
	@RequirePermissions("invoice:read")
	buyers(@Req() req: AuthedRequest) {
		return this.repository.buyers(req.organizationId);
	}

	@Get("print-layouts")
	@RequirePermissions("invoice:read")
	printLayouts(@Req() req: AuthedRequest) {
		return this.repository.printLayouts(req.organizationId);
	}

	@Post("print-layouts/proof")
	@RequirePermissions("invoice:read")
	printLayoutProof(@Req() req: AuthedRequest, @Body() body: Omit<EimsPrintProofInput, "organizationId">) {
		return this.printProof.generate({ ...body, organizationId: req.organizationId });
	}

	@Get("notifications")
	@RequirePermissions("invoice:read")
	notifications(@Req() req: AuthedRequest) {
		return this.repository.notificationLogs(req.organizationId);
	}

	@Get("branch-health")
	@RequirePermissions("eims-source:read")
	branchHealth(@Req() req: AuthedRequest) {
		return this.repository.branchHealth(req.organizationId);
	}

	@Post("compliance/evidence")
	@RequirePermissions("eims-compliance:export")
	generateEvidence(@Req() req: AuthedRequest) {
		return this.repository.generateEvidence(req.organizationId);
	}
}
