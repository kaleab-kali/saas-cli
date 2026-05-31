import { Module } from "@nestjs/common";
import { EIMS_EXTERNAL_CLIENT } from "./client/eims-external-client";
import { MockEimsExternalClient } from "./client/mock-eims-external.client";
import { EimsLookupController } from "./lookups/eims-lookup.controller";
import { EimsLookupService } from "./lookups/eims-lookup.service";
import { EIMS_BACKEND_REPOSITORY } from "./mock/eims-backend.repository";
import { EimsMockService } from "./mock/eims-mock.service";
import { EimsSupportingResourcesController } from "./presentation/eims-supporting-resources.controller";
import { EimsSubmissionQueueService } from "./queues/eims-submission-queue.service";

@Module({
	controllers: [EimsLookupController, EimsSupportingResourcesController],
	providers: [
		EimsLookupService,
		EimsSubmissionQueueService,
		EimsMockService,
		MockEimsExternalClient,
		{ provide: EIMS_BACKEND_REPOSITORY, useExisting: EimsMockService },
		{ provide: EIMS_EXTERNAL_CLIENT, useExisting: MockEimsExternalClient },
	],
	exports: [
		EimsLookupService,
		EimsSubmissionQueueService,
		EimsMockService,
		EIMS_BACKEND_REPOSITORY,
		EIMS_EXTERNAL_CLIENT,
	],
})
export class EimsSharedModule {}
