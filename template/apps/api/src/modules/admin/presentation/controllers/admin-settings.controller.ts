import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";

import { ToggleFeatureFlagHandler } from "#modules/admin/application/commands/toggle-feature-flag.handler";
import { PlatformSettingsService } from "#modules/admin/application/services/platform-settings.service";
import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";
import { PrismaService } from "#shared/database/prisma.service";

@ApiTags("Admin")
@AllowAnonymous()
@Controller("admin/settings")
@UseGuards(SuperAdminGuard)
export class AdminSettingsController {
	constructor(
		private readonly toggleFlag: ToggleFeatureFlagHandler,
		private readonly prisma: PrismaService,
		private readonly settings: PlatformSettingsService,
	) {}

	@Get()
	@ApiOperation({ summary: "Get all platform settings" })
	async getSettings() {
		return { data: await this.settings.getAll() };
	}

	@Put(":key")
	@ApiOperation({ summary: "Update a platform setting (typed)" })
	async updateOne(@Param("key") key: string, @Body() body: { value: string }) {
		await this.settings.set(key, body.value);
		return { data: { key, value: body.value } };
	}

	@Put()
	@ApiOperation({ summary: "Bulk update platform settings" })
	async bulkUpdate(@Body() body: { entries: Array<{ key: string; value: string }> }) {
		await this.settings.setMany(body.entries);
		return { data: { count: body.entries.length } };
	}

	@Get("feature-flags")
	@ApiOperation({ summary: "List all feature flags" })
	async getFeatureFlags() {
		const flags = await this.prisma.featureFlag.findMany({
			include: { overrides: true },
			orderBy: { name: "asc" },
		});
		return { data: flags };
	}

	@Put("feature-flags/:name/global")
	@ApiOperation({ summary: "Toggle a feature flag globally" })
	async toggleGlobal(@Param("name") name: string, @Body() body: { enabled: boolean }) {
		await this.toggleFlag.executeGlobal(name, body.enabled);
		return { data: { name, enabled: body.enabled } };
	}

	@Put("feature-flags/:name/org/:orgId")
	@ApiOperation({ summary: "Toggle a feature flag for a specific organization" })
	async toggleForOrg(@Param("name") name: string, @Param("orgId") orgId: string, @Body() body: { enabled: boolean }) {
		await this.toggleFlag.executeForOrg(name, orgId, body.enabled);
		return { data: { name, organizationId: orgId, enabled: body.enabled } };
	}
}
