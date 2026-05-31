import {
	Body,
	Controller,
	Delete,
	ForbiddenException,
	Get,
	type MessageEvent,
	Param,
	Patch,
	Post,
	Query,
	Req,
	Sse,
	UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import type { Observable } from "rxjs";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { ArchiveNotificationHandler } from "../../application/commands/archive-notification/archive-notification.handler";
import { MarkAllReadHandler } from "../../application/commands/mark-all-read/mark-all-read.handler";
import { MarkReadHandler } from "../../application/commands/mark-read/mark-read.handler";
import { UpdatePreferenceHandler } from "../../application/commands/update-preference/update-preference.handler";
import { UpsertPreferenceDto } from "../../application/dto/notification.dto";
import { ListNotificationsHandler } from "../../application/queries/list-notifications.handler";
import { ListPreferencesHandler } from "../../application/queries/list-preferences.handler";
import { NotificationStreamService } from "../../application/services/notification-stream.service";

interface NotificationRequest {
	readonly organizationId: string;
	readonly userId?: string;
	readonly session?: {
		readonly user?: { readonly id?: string };
	};
}

const currentUserId = (req: NotificationRequest) => req.userId ?? req.session?.user?.id;

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
		private readonly streamService: NotificationStreamService,
	) {}

	@Get()
	@RequirePermissions("notification:read")
	@ApiOperation({ summary: "List notifications for current user" })
	async list(
		@Query("category") category: string | undefined,
		@Query("read") read: string | undefined,
		@Query("includeArchived") includeArchived: string | undefined,
		@Query("page") page: string | undefined,
		@Query("limit") limit: string | undefined,
		@Req() req: NotificationRequest,
	) {
		return this.listH.execute({
			organizationId: req.organizationId,
			userId: currentUserId(req),
			category,
			read: read === "true" ? true : read === "false" ? false : undefined,
			includeArchived: includeArchived === "true",
			page: page ? Number(page) : undefined,
			limit: limit ? Number(limit) : undefined,
		});
	}

	@Sse("stream")
	@RequirePermissions("notification:read")
	@ApiOperation({ summary: "Stream current-user notification events with Server-Sent Events" })
	stream(@Req() req: NotificationRequest): Observable<MessageEvent> {
		const userId = currentUserId(req);
		if (!userId) throw new ForbiddenException("notification stream requires a user session");
		return this.streamService.streamForUser(userId);
	}

	@Post(":id/read")
	@RequirePermissions("notification:read")
	async markRead(@Param("id") id: string, @Req() req: { organizationId: string }) {
		const data = await this.markReadH.execute(req.organizationId, id);
		return { data };
	}

	@Post("mark-all-read")
	@RequirePermissions("notification:read")
	async markAllRead(@Req() req: NotificationRequest) {
		const userId = currentUserId(req);
		if (!userId) return { data: { updated: 0 } };
		const data = await this.markAllReadH.execute(req.organizationId, userId);
		return { data };
	}

	@Delete(":id")
	@RequirePermissions("notification:read")
	async archive(@Param("id") id: string, @Req() req: { organizationId: string }) {
		const data = await this.archiveH.execute(req.organizationId, id);
		return { data };
	}

	@Get("preferences/me")
	@RequirePermissions("notification:read")
	async prefs(@Req() req: NotificationRequest) {
		const userId = currentUserId(req);
		if (!userId) return { data: [] };
		const data = await this.listPrefs.execute(req.organizationId, userId);
		return { data };
	}

	@Patch("preferences/me")
	@RequirePermissions("notification:read")
	async updatePref(@Body() dto: UpsertPreferenceDto, @Req() req: NotificationRequest) {
		const userId = currentUserId(req);
		if (!userId) return { data: null };
		const data = await this.updatePrefH.execute(req.organizationId, userId, dto);
		return { data };
	}
}
