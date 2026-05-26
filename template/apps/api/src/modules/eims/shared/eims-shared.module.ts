import { Module } from "@nestjs/common";
import { EIMS_EXTERNAL_CLIENT } from "./client/eims-external-client";
import { MockEimsExternalClient } from "./client/mock-eims-external.client";
import { EimsLookupController } from "./lookups/eims-lookup.controller";
import { EimsLookupService } from "./lookups/eims-lookup.service";
import { EimsMockService } from "./mock/eims-mock.service";
import { EimsSupportingResourcesController } from "./presentation/eims-supporting-resources.controller";

@Module({
	controllers: [EimsLookupController, EimsSupportingResourcesController],
	providers: [
		EimsLookupService,
		EimsMockService,
		MockEimsExternalClient,
		{ provide: EIMS_EXTERNAL_CLIENT, useExisting: MockEimsExternalClient },
	],
	exports: [EimsLookupService, EimsMockService, EIMS_EXTERNAL_CLIENT],
})
export class EimsSharedModule {}
