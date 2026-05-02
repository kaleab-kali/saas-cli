import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { CreateApiKeyHandler } from "../../application/commands/create-api-key/create-api-key.handler";
import { RevokeApiKeyHandler } from "../../application/commands/revoke-api-key/revoke-api-key.handler";
import { CreateApiKeyDto } from "../../application/dto/api-key.dto";
import { ListApiKeysHandler } from "../../application/queries/list-api-keys.handler";

interface AuthedRequest {
	organizationId: string;
	user?: { id: string };
	session?: { userId?: string };
}

@ApiTags("API Keys")
@Controller("api-keys")
@UseGuards(AuthGuard, PermissionsGuard)
export class ApiKeyController {
	constructor(
		private readonly create: CreateApiKeyHandler,
		private readonly revoke: RevokeApiKeyHandler,
		private readonly list: ListApiKeysHandler,
	) {}

	@Get()
	@RequirePermissions("api-key:read")
	@ApiOperation({ summary: "List api keys" })
	async listKeys(@Query("includeRevoked") includeRevoked: string | undefined, @Req() req: AuthedRequest) {
		const data = await this.list.execute(req.organizationId, includeRevoked === "true");
		return { data };
	}

	@Post()
	@RequirePermissions("api-key:create")
	@ApiOperation({ summary: "Create new api key (plain key returned once)" })
	@ApiResponse({ status: 201 })
	async createKey(@Body() dto: CreateApiKeyDto, @Req() req: AuthedRequest) {
		const userId = req.user?.id ?? req.session?.userId ?? "unknown";
		const result = await this.create.execute(req.organizationId, userId, dto);
		return { data: result };
	}

	@Delete(":id")
	@RequirePermissions("api-key:revoke")
	@ApiOperation({ summary: "Revoke api key" })
	async revokeKey(@Param("id") id: string, @Req() req: AuthedRequest) {
		const data = await this.revoke.execute(req.organizationId, id);
		return { data };
	}
}
