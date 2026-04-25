import { Module } from "@nestjs/common";
import { AuthModule } from "#modules/auth/auth.module";
import {
	GetSecuritySettingsHandler,
	UpdateSecuritySettingsHandler,
} from "./application/commands/update-security-settings.handler";
import { SecuritySettingsRepository } from "./domain/repositories/security-settings.repository";
import { PrismaSecuritySettingsRepository } from "./infrastructure/repositories/prisma-security-settings.repository";
import { SecuritySettingsController } from "./presentation/controllers/security-settings.controller";

@Module({
	imports: [AuthModule],
	controllers: [SecuritySettingsController],
	providers: [
		{ provide: SecuritySettingsRepository, useClass: PrismaSecuritySettingsRepository },
		GetSecuritySettingsHandler,
		UpdateSecuritySettingsHandler,
	],
	exports: [GetSecuritySettingsHandler],
})
export class SecuritySettingsModule {}
