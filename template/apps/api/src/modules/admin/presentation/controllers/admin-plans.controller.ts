import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";

import {
	ArchivePlanHandler,
	CreatePlanHandler,
	type CreatePlanInput,
	type EntitlementInput,
	ListAdminPlansHandler,
	UpdatePlanHandler,
	type UpdatePlanInput,
	UpsertEntitlementHandler,
} from "#modules/admin/application/commands/admin-plan.handlers";
import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";
import { PrismaService } from "#shared/database/prisma.service";

// All known feature keys — pulled from seed-plans to populate admin entitlement editor.
const ALL_FEATURE_KEYS = [
	"property.multi-building",
	"property.unlimited-buildings",
	"property.media-unlimited",
	"property.bulk-create-units",
	"property.duplicate-building",
	"property.csv-import",
	"property.map-view",
	"lease.commercial",
	"lease.co-tenants",
	"lease.rent-escalation",
	"lease.cam-reconciliation",
	"lease.abstraction",
	"lease.early-termination",
	"invoice.online-chapa",
	"invoice.late-fee-auto",
	"invoice.partial-payment",
	"invoice.overpayment-credit",
	"invoice.batch-payment",
	"invoice.delinquency-reminders",
	"invoice.payment-plans",
	"maintenance.vendor-directory",
	"maintenance.vendor-ratings",
	"maintenance.auto-assignment",
	"maintenance.time-tracking",
	"maintenance.material-costs",
	"maintenance.sla-policies",
	"maintenance.preventive-schedules",
	"maintenance.asset-registry",
	"maintenance.inspections",
	"maintenance.inspection-templates",
	"sales.module",
	"sales.agent-role",
	"sales.supervisor-role",
	"sales.agent-privacy",
	"sales.custom-stages",
	"sales.commission-auto",
	"sales.multi-developer",
	"sales.usd-pricing",
	"estate.service-charges",
	"estate.per-block-config",
	"estate.hoa-minutes",
	"crm.activity-auto",
	"crm.segments-static",
	"crm.segments-dynamic",
	"crm.merge-duplicates",
	"crm.automation-rules",
	"crm.bulk-email",
	"finance.income-statement",
	"finance.cash-flow",
	"finance.owner-statements",
	"finance.chart-of-accounts",
	"finance.manual-journal",
	"finance.bank-reconciliation",
	"finance.vat-return",
	"finance.withholding-tax",
	"reporting.financial-dashboard",
	"reporting.sales-dashboard",
	"reporting.maintenance-dashboard",
	"reporting.custom-report-builder",
	"reporting.schedule-delivery",
	"reporting.export-xlsx",
	"reporting.export-pdf",
	"notifications.sms-afromessage",
	"notifications.telegram-bot",
	"notifications.bulk-announcements",
	"platform.branding",
	"platform.multi-currency",
	"platform.custom-fields",
	"platform.api-keys",
	"platform.webhooks",
	"platform.audit-retention-1year",
	"platform.audit-export",
	"platform.custom-roles",
	"platform.force-2fa",
	"platform.ip-allowlist",
] as const;

interface AdminReq {
	adminUser?: { id: string };
}

@ApiTags("Admin")
@AllowAnonymous()
@Controller("admin/plans")
@UseGuards(SuperAdminGuard)
export class AdminPlansController {
	constructor(
		private readonly listPlans: ListAdminPlansHandler,
		private readonly createPlan: CreatePlanHandler,
		private readonly updatePlan: UpdatePlanHandler,
		private readonly archivePlan: ArchivePlanHandler,
		private readonly upsertEnt: UpsertEntitlementHandler,
		private readonly prisma: PrismaService,
	) {}

	@Get("feature-keys")
	@ApiOperation({ summary: "List all known feature keys" })
	listFeatureKeys() {
		return { data: ALL_FEATURE_KEYS };
	}

	@Get()
	@ApiOperation({ summary: "List all plans (admin view)" })
	async list(@Query("includeInactive") includeInactive?: string) {
		const plans = await this.listPlans.execute(includeInactive === "true");
		return { data: plans };
	}

	@Get(":id")
	@ApiOperation({ summary: "Get plan detail with entitlements" })
	async get(@Param("id") id: string) {
		return { data: await this.listPlans.getById(id) };
	}

	@Post()
	@ApiOperation({ summary: "Create a new plan" })
	async create(@Body() body: CreatePlanInput, @Req() req: AdminReq) {
		const plan = await this.createPlan.execute(body, req.adminUser?.id);
		return { data: plan };
	}

	@Put(":id")
	@ApiOperation({ summary: "Update plan" })
	async update(@Param("id") id: string, @Body() body: UpdatePlanInput, @Req() req: AdminReq) {
		return { data: await this.updatePlan.execute(id, body, req.adminUser?.id) };
	}

	@Put(":id/archive")
	@ApiOperation({ summary: "Archive plan (active=false)" })
	async archive(@Param("id") id: string, @Req() req: AdminReq) {
		return { data: await this.archivePlan.execute(id, req.adminUser?.id) };
	}

	@Post(":id/entitlements/bulk")
	@ApiOperation({ summary: "Bulk upsert entitlements for a plan" })
	async bulkEntitlements(
		@Param("id") id: string,
		@Body() body: { entitlements: EntitlementInput[] },
		@Req() req: AdminReq,
	) {
		return { data: await this.upsertEnt.executeBulk(id, body.entitlements, req.adminUser?.id) };
	}

	@Put(":id/entitlements")
	@ApiOperation({ summary: "Upsert single entitlement" })
	async upsertEntitlement(@Param("id") id: string, @Body() body: EntitlementInput, @Req() req: AdminReq) {
		return { data: await this.upsertEnt.execute(id, body, req.adminUser?.id) };
	}

	@Delete(":id/entitlements/:featureKey")
	@ApiOperation({ summary: "Remove entitlement from plan" })
	async deleteEntitlement(@Param("id") id: string, @Param("featureKey") featureKey: string) {
		await this.prisma.featureEntitlement.deleteMany({ where: { planId: id, featureKey } });
		return { data: { ok: true } };
	}
}
