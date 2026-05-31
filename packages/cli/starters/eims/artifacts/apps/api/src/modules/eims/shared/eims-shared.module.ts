import { Module } from "@nestjs/common";
import { EimsBulkCallbackController } from "./callbacks/eims-bulk-callback.controller";
import { EimsBulkCallbackService } from "./callbacks/eims-bulk-callback.service";
import { EIMS_EXTERNAL_CLIENT } from "./client/eims-external-client";
import { MockEimsExternalClient } from "./client/mock-eims-external.client";
import { EimsCredentialSecretService } from "./crypto/eims-credential-secret.service";
import { EimsLookupController } from "./lookups/eims-lookup.controller";
import { EimsLookupService } from "./lookups/eims-lookup.service";
import { EIMS_BACKEND_REPOSITORY } from "./mock/eims-backend.repository";
import { EimsMockService } from "./mock/eims-mock.service";
import { EimsOfflinePendingSyncCacheService } from "./offline/eims-offline-pending-sync-cache.service";
import { EimsSupportingResourcesController } from "./presentation/eims-supporting-resources.controller";
import { EimsPrintProofService } from "./printing/eims-print-proof.service";
import { EimsSubmissionQueueService } from "./queues/eims-submission-queue.service";

@Module({
	controllers: [EimsLookupController, EimsSupportingResourcesController, EimsBulkCallbackController],
	providers: [
		EimsLookupService,
		EimsBulkCallbackService,
		EimsSubmissionQueueService,
		EimsCredentialSecretService,
		EimsOfflinePendingSyncCacheService,
		EimsPrintProofService,
		EimsMockService,
		MockEimsExternalClient,
		{ provide: EIMS_BACKEND_REPOSITORY, useExisting: EimsMockService },
		{ provide: EIMS_EXTERNAL_CLIENT, useExisting: MockEimsExternalClient },
	],
	exports: [
		EimsLookupService,
		EimsBulkCallbackService,
		EimsSubmissionQueueService,
		EimsCredentialSecretService,
		EimsOfflinePendingSyncCacheService,
		EimsPrintProofService,
		EimsMockService,
		EIMS_BACKEND_REPOSITORY,
		EIMS_EXTERNAL_CLIENT,
	],
})
export class EimsSharedModule {}
