import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { AuditAction, AuditResource } from "#shared/decorators/audit.decorator";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { CreateWebhookEndpointDto, UpdateWebhookEndpointDto } from "../application/webhook.dto";
import { WebhookService } from "../application/webhook.service";

interface AuthedRequest {
	organizationId: string;
	user?: { id?: string };
	session?: { userId?: string; user?: { id?: string } };
}

const currentUserId = (req: AuthedRequest) => req.user?.id ?? req.session?.user?.id ?? req.session?.userId ?? null;

@ApiTags("Webhooks")
@Controller("webhooks")
@UseGuards(AuthGuard, PermissionsGuard)
@AuditResource("webhook:endpoint")
export class WebhookController {
	constructor(private readonly webhooks: WebhookService) {}

	@Get("endpoints")
	@RequirePermissions("webhook:read")
	@ApiOperation({ summary: "List outbound webhook endpoints for the active organization" })
	async list(@Req() req: AuthedRequest) {
		return { data: await this.webhooks.listEndpoints(req.organizationId) };
	}

	@Post("endpoints")
	@RequirePermissions("webhook:create")
	@AuditAction("create")
	@ApiOperation({ summary: "Create an outbound webhook endpoint" })
	async create(@Req() req: AuthedRequest, @Body() dto: CreateWebhookEndpointDto) {
		const result = await this.webhooks.createEndpoint(req.organizationId, dto, currentUserId(req));
		return { data: result.endpoint, signingSecret: result.signingSecret };
	}

	@Patch("endpoints/:id")
	@RequirePermissions("webhook:update")
	@AuditAction("update")
	@ApiOperation({ summary: "Update an outbound webhook endpoint" })
	async update(@Req() req: AuthedRequest, @Param("id") id: string, @Body() dto: UpdateWebhookEndpointDto) {
		return { data: await this.webhooks.updateEndpoint(req.organizationId, id, dto) };
	}

	@Delete("endpoints/:id")
	@RequirePermissions("webhook:delete")
	@AuditAction("delete")
	@ApiOperation({ summary: "Delete an outbound webhook endpoint" })
	async remove(@Req() req: AuthedRequest, @Param("id") id: string) {
		return { data: await this.webhooks.deleteEndpoint(req.organizationId, id) };
	}

	@Post("endpoints/:id/test")
	@RequirePermissions("webhook:test")
	@AuditAction("test")
	@ApiOperation({ summary: "Send a signed webhook.test event to an endpoint" })
	async test(@Req() req: AuthedRequest, @Param("id") id: string) {
		return { data: await this.webhooks.sendTestEvent(req.organizationId, id) };
	}
}
