import { Module } from "@nestjs/common";
import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";
import { EimsSharedModule } from "../shared/eims-shared.module";
import { EimsAdminService } from "./application/eims-admin.service";
import { EimsAdminController } from "./presentation/eims-admin.controller";

@Module({
	imports: [EimsSharedModule],
	controllers: [EimsAdminController],
	providers: [SuperAdminGuard, EimsAdminService],
})
export class EimsAdminModule {}
