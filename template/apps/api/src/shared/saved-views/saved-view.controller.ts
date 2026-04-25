import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { SavedViewService } from "./saved-view.service";

interface CreateSavedViewBody {
	entity: string;
	name: string;
	filtersJson: unknown;
	sortJson?: unknown;
	columnsJson?: unknown;
	viewMode?: string;
	isShared?: boolean;
}

type UpdateSavedViewBody = Partial<Omit<CreateSavedViewBody, "entity">>;

@ApiTags("Saved Views")
@Controller("saved-views")
@UseGuards(AuthGuard)
export class SavedViewController {
	constructor(private readonly views: SavedViewService) {}

	@Get()
	@ApiOperation({ summary: "List saved views for an entity" })
	async list(@Query("entity") entity: string, @Req() req: { organizationId: string }) {
		const data = await this.views.list(req.organizationId, entity);
		return { data };
	}

	@Post()
	@ApiOperation({ summary: "Save a new view" })
	async create(@Body() body: CreateSavedViewBody, @Req() req: { organizationId: string }) {
		const data = await this.views.create(req.organizationId, body);
		return { data };
	}

	@Patch(":id")
	async update(@Param("id") id: string, @Body() body: UpdateSavedViewBody, @Req() req: { organizationId: string }) {
		const data = await this.views.update(req.organizationId, id, body);
		return { data };
	}

	@Delete(":id")
	async remove(@Param("id") id: string, @Req() req: { organizationId: string }) {
		await this.views.remove(req.organizationId, id);
		return { data: { deleted: true } };
	}
}
