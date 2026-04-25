import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";

import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";
import { PrismaService } from "#shared/database/prisma.service";

interface UpdateTemplateBody {
	subject?: string;
	bodyHtml?: string;
	subjectAm?: string;
	bodyHtmlAm?: string;
	variables?: string;
}

@ApiTags("Admin")
@AllowAnonymous()
@Controller("admin/system-templates")
@UseGuards(SuperAdminGuard)
export class AdminSystemTemplatesController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	@ApiOperation({ summary: "List all system email templates" })
	async list() {
		return { data: await this.prisma.systemEmailTemplate.findMany({ orderBy: { key: "asc" } }) };
	}

	@Get(":key")
	@ApiOperation({ summary: "Get a single system template" })
	async get(@Param("key") key: string) {
		return { data: await this.prisma.systemEmailTemplate.findUnique({ where: { key } }) };
	}

	@Put(":key")
	@ApiOperation({ summary: "Update a system template (subject / bodyHtml / Amharic variants)" })
	async update(@Param("key") key: string, @Body() body: UpdateTemplateBody) {
		const updated = await this.prisma.systemEmailTemplate.update({
			where: { key },
			data: {
				subject: body.subject,
				bodyHtml: body.bodyHtml,
				subjectAm: body.subjectAm ?? null,
				bodyHtmlAm: body.bodyHtmlAm ?? null,
				variables: body.variables ?? null,
			},
		});
		return { data: updated };
	}
}
