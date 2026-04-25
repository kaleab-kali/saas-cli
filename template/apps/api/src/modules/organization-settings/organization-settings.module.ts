import { Module } from "@nestjs/common";
import { AuthModule } from "#modules/auth/auth.module";
import {
	GetSettingsHandler,
	UpdateSettingsHandler,
} from "./application/commands/update-settings/update-settings.handler";
import { OrganizationSettingsRepository } from "./domain/repositories/organization-settings.repository";
import { PrismaOrganizationSettingsRepository } from "./infrastructure/repositories/prisma-organization-settings.repository";
import { OrganizationSettingsController } from "./presentation/controllers/organization-settings.controller";

@Module({
	imports: [AuthModule],
	controllers: [OrganizationSettingsController],
	providers: [
		{ provide: OrganizationSettingsRepository, useClass: PrismaOrganizationSettingsRepository },
		GetSettingsHandler,
		UpdateSettingsHandler,
	],
	exports: [
		{ provide: OrganizationSettingsRepository, useClass: PrismaOrganizationSettingsRepository },
		GetSettingsHandler,
	],
})
export class OrganizationSettingsModule {}
