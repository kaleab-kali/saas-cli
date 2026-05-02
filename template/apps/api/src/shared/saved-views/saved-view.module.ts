import { Global, Module } from "@nestjs/common";
import { AuthModule } from "#modules/auth/auth.module";
import { SavedViewController } from "./saved-view.controller";
import { SavedViewService } from "./saved-view.service";

@Global()
@Module({
	imports: [AuthModule],
	controllers: [SavedViewController],
	providers: [SavedViewService],
	exports: [SavedViewService],
})
export class SavedViewModule {}
