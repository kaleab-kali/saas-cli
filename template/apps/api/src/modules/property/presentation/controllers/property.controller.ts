import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";

@ApiTags("Properties")
@Controller("properties")
@UseGuards(AuthGuard, PermissionsGuard)
export class PropertyController {
	@Get()
	@RequirePermissions("property:read")
	@ApiOperation({ summary: "List all properties" })
	async findAll(@Query("page") page = 1, @Query("limit") limit = 20) {
		// TODO: implement with ListBuildingsHandler
		return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
	}

	@Get(":id")
	@RequirePermissions("property:read")
	@ApiOperation({ summary: "Get property by ID" })
	async findOne(@Param("id") id: string) {
		// TODO: implement with GetBuildingByIdHandler
		return { data: { id, name: "Placeholder" } };
	}

	@Post()
	@RequirePermissions("property:create")
	@ApiOperation({ summary: "Create a new property" })
	async create(@Body() body: Record<string, unknown>) {
		// TODO: implement with CreateBuildingHandler
		return { data: { id: "placeholder", ...body } };
	}

	@Put(":id")
	@RequirePermissions("property:update")
	@ApiOperation({ summary: "Update a property" })
	async update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
		// TODO: implement with UpdateBuildingHandler
		return { data: { id, ...body } };
	}

	@Delete(":id")
	@RequirePermissions("property:delete")
	@ApiOperation({ summary: "Delete a property" })
	async remove(@Param("id") id: string) {
		// TODO: implement with DeleteBuildingHandler
		return { data: { id, deleted: true } };
	}
}
