import { Module } from "@nestjs/common";
import { EimsSetupModule } from "../setup/eims-setup.module";
import { EimsSharedModule } from "../shared/eims-shared.module";
import { EimsSubmissionService } from "./application/eims-submission.service";
import { EimsSubmissionController } from "./presentation/eims-submission.controller";

@Module({
	imports: [EimsSharedModule, EimsSetupModule],
	controllers: [EimsSubmissionController],
	providers: [EimsSubmissionService],
})
export class EimsSubmissionModule {}
