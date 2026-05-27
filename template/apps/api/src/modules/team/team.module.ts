import { Module } from "@nestjs/common";
import { AuthModule } from "#modules/auth/auth.module";
import { BillingModule } from "#modules/billing/billing.module";
import { TeamService } from "./application/team.service";
import { TeamController } from "./presentation/team.controller";

@Module({
	imports: [AuthModule, BillingModule],
	controllers: [TeamController],
	providers: [TeamService],
})
export class TeamModule {}
