import { Module } from "@nestjs/common";
import { EimsBulkCallbackController } from "./callbacks/eims-bulk-callback.controller";
import { EimsBulkCallbackService } from "./callbacks/eims-bulk-callback.service";
import { EimsBulkCallbackPersistenceService } from "./callbacks/eims-bulk-callback-persistence.service";
import { EIMS_EXTERNAL_CLIENT } from "./client/eims-external-client";
import { EimsSdkClientProvider } from "./client/eims-sdk-client.provider";
import { EimsSdkExternalClient } from "./client/eims-sdk-external.client";
import { MockEimsExternalClient } from "./client/mock-eims-external.client";
import { EimsCredentialPersistenceService } from "./crypto/eims-credential-persistence.service";
import { EimsCredentialSecretService } from "./crypto/eims-credential-secret.service";
import { EimsCredentialValidationService } from "./crypto/eims-credential-validation.service";
import { EimsLookupController } from "./lookups/eims-lookup.controller";
import { EimsLookupService } from "./lookups/eims-lookup.service";
import { EIMS_BACKEND_REPOSITORY } from "./mock/eims-backend.repository";
import { EimsMockService } from "./mock/eims-mock.service";
import { EimsOfflinePendingSyncCacheService } from "./offline/eims-offline-pending-sync-cache.service";
import { EimsOfflinePendingSyncPersistenceService } from "./offline/eims-offline-pending-sync-persistence.service";
import { EimsOfflineReplayService } from "./offline/eims-offline-replay.service";
import { EimsOfflineReplaySchedulerService } from "./offline/eims-offline-replay-scheduler.service";
import { EimsSupportingResourcesController } from "./presentation/eims-supporting-resources.controller";
import { EimsPrintProofService } from "./printing/eims-print-proof.service";
import { EimsOfflineReplayQueueService } from "./queues/eims-offline-replay-queue.service";
import { EimsSubmissionQueueService } from "./queues/eims-submission-queue.service";
import { EimsSubmissionQueuePersistenceService } from "./queues/eims-submission-queue-persistence.service";
import { EimsSubmissionSourceLockService } from "./queues/eims-submission-source-lock.service";

@Module({
	controllers: [EimsLookupController, EimsSupportingResourcesController, EimsBulkCallbackController],
	providers: [
		EimsLookupService,
		EimsBulkCallbackService,
		EimsBulkCallbackPersistenceService,
		EimsSubmissionQueueService,
		EimsSubmissionQueuePersistenceService,
		EimsCredentialPersistenceService,
		EimsCredentialSecretService,
		EimsCredentialValidationService,
		EimsOfflinePendingSyncCacheService,
		EimsOfflinePendingSyncPersistenceService,
		EimsOfflineReplayService,
		EimsOfflineReplaySchedulerService,
		EimsOfflineReplayQueueService,
		EimsPrintProofService,
		EimsSubmissionSourceLockService,
		EimsMockService,
		MockEimsExternalClient,
		EimsSdkClientProvider,
		EimsSdkExternalClient,
		{ provide: EIMS_BACKEND_REPOSITORY, useExisting: EimsMockService },
		{
			provide: EIMS_EXTERNAL_CLIENT,
			inject: [MockEimsExternalClient, EimsSdkExternalClient],
			useFactory: (mockClient: MockEimsExternalClient, sdkClient: EimsSdkExternalClient) =>
				process.env.EIMS_MOCK_MODE === "false" ? sdkClient : mockClient,
		},
	],
	exports: [
		EimsLookupService,
		EimsBulkCallbackService,
		EimsBulkCallbackPersistenceService,
		EimsSubmissionQueueService,
		EimsSubmissionQueuePersistenceService,
		EimsCredentialPersistenceService,
		EimsCredentialSecretService,
		EimsCredentialValidationService,
		EimsOfflinePendingSyncCacheService,
		EimsOfflinePendingSyncPersistenceService,
		EimsOfflineReplayService,
		EimsOfflineReplaySchedulerService,
		EimsOfflineReplayQueueService,
		EimsPrintProofService,
		EimsSubmissionSourceLockService,
		EimsMockService,
		EimsSdkExternalClient,
		EIMS_BACKEND_REPOSITORY,
		EIMS_EXTERNAL_CLIENT,
	],
})
export class EimsSharedModule {}
