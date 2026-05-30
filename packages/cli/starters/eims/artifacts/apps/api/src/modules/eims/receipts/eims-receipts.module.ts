import { Module } from "@nestjs/common";
import { EimsSharedModule } from "../shared/eims-shared.module";
import { EimsReceiptsService } from "./application/eims-receipts.service";
import { EimsReceiptsController } from "./presentation/eims-receipts.controller";

@Module({
	imports: [EimsSharedModule],
	controllers: [EimsReceiptsController],
	providers: [EimsReceiptsService],
})
export class EimsReceiptsModule {}
