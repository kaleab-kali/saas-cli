import { Module } from "@nestjs/common";
import { AuthModule } from "#modules/auth/auth.module";
import { UploadService } from "./application/upload.service";
import { UploadController } from "./presentation/upload.controller";

@Module({
	imports: [AuthModule],
	controllers: [UploadController],
	providers: [UploadService],
})
export class UploadModule {}
