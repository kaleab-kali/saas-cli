import {
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Query,
	Req,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { memoryStorage } from "multer";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequireFeature } from "#modules/billing/presentation/guards/require-entitlement.decorator";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { UploadService, uploadMaxBytes } from "../application/upload.service";

interface AuthedReq {
	organizationId: string;
	user?: { id: string };
	session?: { user?: { id: string }; userId?: string };
}

const pickUserId = (req: AuthedReq) => req.user?.id ?? req.session?.user?.id ?? req.session?.userId ?? null;

@ApiTags("Uploads")
@Controller("uploads")
@UseGuards(AuthGuard, PermissionsGuard)
export class UploadController {
	constructor(private readonly uploads: UploadService) {}

	@Get()
	@RequirePermissions("file:read")
	@ApiOperation({ summary: "List uploaded files for the active organization" })
	async list(@Req() req: AuthedReq, @Query("folder") folder?: string) {
		return { data: await this.uploads.list(req.organizationId, folder) };
	}

	@Post()
	@RequirePermissions("file:create")
	@RequireFeature("platform.file-upload")
	@UseInterceptors(
		FileInterceptor("file", {
			storage: memoryStorage(),
			limits: { fileSize: uploadMaxBytes() },
		}),
	)
	@ApiConsumes("multipart/form-data")
	@ApiBody({
		schema: {
			type: "object",
			properties: {
				folder: { type: "string", default: "general" },
				file: { type: "string", format: "binary" },
			},
		},
	})
	@ApiOperation({ summary: "Upload a file using the configured storage driver" })
	async upload(@Req() req: AuthedReq, @UploadedFile() file: Express.Multer.File, @Query("folder") folder = "general") {
		return {
			data: await this.uploads.upload({
				organizationId: req.organizationId,
				userId: pickUserId(req),
				folder,
				file,
			}),
		};
	}

	@Delete(":id")
	@RequirePermissions("file:delete")
	@ApiOperation({ summary: "Delete an uploaded file" })
	async delete(@Req() req: AuthedReq, @Param("id") id: string) {
		return { data: await this.uploads.delete(req.organizationId, id) };
	}
}
