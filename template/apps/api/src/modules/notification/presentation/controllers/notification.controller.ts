import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { ArchiveNotificationHandler } from "../../application/commands/archive-notification/archive-notification.handler";
import { MarkAllReadHandler } from "../../application/commands/mark-all-read/mark-all-read.handler";
import { MarkReadHandler } from "../../application/commands/mark-read/mark-read.handler";
import { UpdatePreferenceHandler } from "../../application/commands/update-preference/update-preference.handler";
import { UpsertPreferenceDto } from "../../application/dto/notification.dto";
import { ListNotificationsHandler } from "../../application/queries/list-notifications.handler";
import { ListPreferencesHandler } from "../../application/queries/list-preferences.handler";

@ApiTags("Notifications")
@Controller("notifications")
@UseGuards(AuthGuard, PermissionsGuard)
export class NotificationController {
	constructor(
		private readonly listH: ListNotificationsHandler,
		private readonly markReadH: MarkReadHandler,
		private readonly markAllReadH: MarkAllReadHandler,
		private readonly archiveH: ArchiveNotificationHandler,
		private readonly listPrefs: ListPreferencesHandler,
		private readonly updatePrefH: UpdatePreferenceHandler,
	) {}

	@Get()
	@RequirePermissions("contact:read")
	@ApiOperation({ summary: "List notifications for current user" })
	async list(
		@Query("category") category: string | undefined,
		@Query("read") read: string | undefined,
		@Query("includeArchived") includeArchived: string | undefined,
		@Query("page") page: string | undefined,
		@Query("limit") limit: string | undefined,
		@Req() req: { organizationId: string; userId?: string },
	) {
		return this.listH.execute({
			organizationId: req.organizationId,
			userId: req.userId,
			category,
			read: read === "true" ? true : read === "false" ? false : undefined,
			includeArchived: includeArchived === "true",
			page: page ? Number(page) : undefined,
			limit: limit ? Number(limit) : undefined,
		});
	}

	@Post(":id/read")
	@RequirePermissions("contact:read")
	async markRead(@Param("id") id: string, @Req() req: { organizationId: string }) {
		const data = await this.markReadH.execute(req.organizationId, id);
		return { data };
	}

	@Post("mark-all-read")
	@RequirePermissions("contact:read")
	async markAllRead(@Req() req: { organizationId: string; userId?: string }) {
		if (!req.userId) return { data: { updated: 0 } };
		const data = await this.markAllReadH.execute(req.organizationId, req.userId);
		return { data };
	}

	@Delete(":id")
	@RequirePermissions("contact:read")
	async archive(@Param("id") id: string, @Req() req: { organizationId: string }) {
		const data = await this.archiveH.execute(req.organizationId, id);
		return { data };
	}

	@Get("preferences/me")
	@RequirePermissions("contact:read")
	async prefs(@Req() req: { organizationId: string; userId?: string }) {
		if (!req.userId) return { data: [] };
		const data = await this.listPrefs.execute(req.organizationId, req.userId);
		return { data };
	}

	@Patch("preferences/me")
	@RequirePermissions("contact:read")
	async updatePref(@Body() dto: UpsertPreferenceDto, @Req() req: { organizationId: string; userId?: string }) {
		if (!req.userId) return { data: null };
		const data = await this.updatePrefH.execute(req.organizationId, req.userId, dto);
		return { data };
	}
}
