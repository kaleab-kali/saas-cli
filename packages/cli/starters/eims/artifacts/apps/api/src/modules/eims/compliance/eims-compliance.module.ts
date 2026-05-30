import { Module } from "@nestjs/common";
import { EimsSharedModule } from "../shared/eims-shared.module";
import { EimsAcceptanceService } from "./application/eims-acceptance.service";
import { EimsComplianceService } from "./application/eims-compliance.service";
import { EimsAcceptanceController } from "./presentation/eims-acceptance.controller";
import { EimsComplianceController } from "./presentation/eims-compliance.controller";

@Module({
	imports: [EimsSharedModule],
	controllers: [EimsComplianceController, EimsAcceptanceController],
	providers: [EimsComplianceService, EimsAcceptanceService],
})
export class EimsComplianceModule {}
