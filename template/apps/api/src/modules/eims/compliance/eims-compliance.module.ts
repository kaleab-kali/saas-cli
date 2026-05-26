import { Module } from "@nestjs/common";
import { EimsSharedModule } from "../shared/eims-shared.module";
import { EimsComplianceService } from "./application/eims-compliance.service";
import { EimsComplianceController } from "./presentation/eims-compliance.controller";

@Module({
	imports: [EimsSharedModule],
	controllers: [EimsComplianceController],
	providers: [EimsComplianceService],
})
export class EimsComplianceModule {}
