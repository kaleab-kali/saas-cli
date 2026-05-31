import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { SuspendOrganizationHandler } from "#modules/admin/application/commands/suspend-organization.handler";
import { UnsuspendOrganizationHandler } from "#modules/admin/application/commands/unsuspend-organization.handler";
import { GetOrganizationDetailHandler } from "#modules/admin/application/queries/get-organization-detail.handler";
import { ListOrganizationsHandler } from "#modules/admin/application/queries/list-organizations.handler";
import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";

@ApiTags("Admin")
@AllowAnonymous()
@Controller("admin/organizations")
@UseGuards(SuperAdminGuard)
export class AdminOrganizationsController {
	constructor(
		private readonly listOrgs: ListOrganizationsHandler,
		private readonly getOrgDetail: GetOrganizationDetailHandler,
		private readonly suspendOrg: SuspendOrganizationHandler,
		private readonly unsuspendOrg: UnsuspendOrganizationHandler,
	) {}

	@Get()
	@ApiOperation({ summary: "List all organizations (platform-wide)" })
	async list(
		@Query("page") page?: number,
		@Query("limit") limit?: number,
		@Query("search") search?: string,
		@Query("sort") sort?: string,
	) {
		return this.listOrgs.execute({ page, limit, search, sort });
	}

	@Get(":id")
	@ApiOperation({ summary: "Get organization details with members" })
	async detail(@Param("id") id: string) {
		const org = await this.getOrgDetail.execute(id);
		return { data: org };
	}

	@Post(":id/suspend")
	@ApiOperation({ summary: "Suspend an organization (ban all members)" })
	async suspend(
		@Param("id") id: string,
		@Req() req: Request & { adminUser: { id: string } },
		@Body() body: { reason?: string },
	) {
		await this.suspendOrg.execute(id, req.adminUser.id, body.reason);
		return { data: { suspended: true } };
	}

	@Post(":id/unsuspend")
	@ApiOperation({ summary: "Unsuspend an organization (unban all members)" })
	async unsuspend(@Param("id") id: string, @Req() req: Request & { adminUser: { id: string } }) {
		await this.unsuspendOrg.execute(id, req.adminUser.id);
		return { data: { suspended: false } };
	}
}
