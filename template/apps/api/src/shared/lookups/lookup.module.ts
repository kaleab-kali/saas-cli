import { Global, Module } from "@nestjs/common";
import { AuthModule } from "#modules/auth/auth.module";
import { LookupController } from "./lookup.controller";
import { LookupService } from "./lookup.service";

@Global()
@Module({
	imports: [AuthModule],
	controllers: [LookupController],
	providers: [LookupService],
	exports: [LookupService],
})
export class LookupModule {}
