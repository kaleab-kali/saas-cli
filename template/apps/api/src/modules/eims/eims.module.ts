import { Module } from "@nestjs/common";
import { EimsAdminModule } from "./admin/eims-admin.module";
import { EimsComplianceModule } from "./compliance/eims-compliance.module";
import { EimsReceiptsModule } from "./receipts/eims-receipts.module";
import { EimsSetupModule } from "./setup/eims-setup.module";
import { EimsSharedModule } from "./shared/eims-shared.module";
import { EimsSubmissionModule } from "./submission/eims-submission.module";

@Module({
	imports: [
		EimsSharedModule,
		EimsSetupModule,
		EimsSubmissionModule,
		EimsReceiptsModule,
		EimsComplianceModule,
		EimsAdminModule,
	],
})
export class EimsModule {}
