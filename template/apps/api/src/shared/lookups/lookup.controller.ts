import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { KNOWN_LOOKUP_KINDS, type LookupKind, LookupService } from "./lookup.service";

interface CreateLookupBody {
	value?: string;
	label: string;
	description?: string;
	color?: string;
	sortOrder?: number;
}

interface UpdateLookupBody {
	label?: string;
	description?: string | null;
	color?: string | null;
	sortOrder?: number;
	archived?: boolean;
}

@ApiTags("Lookups")
@Controller("lookups")
@UseGuards(AuthGuard)
export class LookupController {
	constructor(private readonly lookups: LookupService) {}

	@Get(":kind")
	@ApiOperation({ summary: "List values for a lookup kind (seeds built-ins on first read)" })
	async list(
		@Param("kind") kind: string,
		@Query("includeArchived") includeArchived: string | undefined,
		@Req() req: { organizationId: string },
	) {
		this.assertKind(kind);
		const data = await this.lookups.list(req.organizationId, kind as LookupKind, includeArchived === "true");
		return { data };
	}

	@Post(":kind")
	@ApiOperation({ summary: "Add a custom value to this lookup kind" })
	async create(@Param("kind") kind: string, @Body() body: CreateLookupBody, @Req() req: { organizationId: string }) {
		this.assertKind(kind);
		const data = await this.lookups.create(req.organizationId, kind as LookupKind, body);
		return { data };
	}

	@Patch("items/:id")
	@ApiOperation({ summary: "Update a lookup value (label/description/archived)" })
	async update(@Param("id") id: string, @Body() body: UpdateLookupBody, @Req() req: { organizationId: string }) {
		const data = await this.lookups.update(req.organizationId, id, body);
		return { data };
	}

	@Delete("items/:id")
	@ApiOperation({ summary: "Delete a custom lookup value (built-ins cannot be deleted)" })
	async remove(@Param("id") id: string, @Req() req: { organizationId: string }) {
		await this.lookups.remove(req.organizationId, id);
		return { data: { deleted: true } };
	}

	private assertKind(kind: string): void {
		// Allow any non-empty kind. If your app needs a closed set, populate
		// `LOOKUP_DEFAULTS` in lookup-defaults.ts and add a check here.
		if (!kind || typeof kind !== "string" || kind.length > 64) {
			throw new BadRequestException(`Invalid lookup kind: ${kind}`);
		}
		// Built-in kinds reference (currently empty in skeleton):
		void KNOWN_LOOKUP_KINDS;
	}
}
