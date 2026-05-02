import { BadRequestException, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";

import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";
import { BillingLifecycleCron } from "#modules/billing/application/services/billing-lifecycle.cron";
import { PrismaService } from "#shared/database/prisma.service";

interface AdminReq {
	adminUser?: { id: string };
}

const KNOWN_JOBS = ["billing.daily", "billing.usage"] as const;
type JobName = (typeof KNOWN_JOBS)[number];

@ApiTags("Admin")
@AllowAnonymous()
@Controller("admin/jobs")
@UseGuards(SuperAdminGuard)
export class AdminJobsController {
	constructor(
		private readonly prisma: PrismaService,
		private readonly billingCron: BillingLifecycleCron,
	) {}

	@Get()
	@ApiOperation({ summary: "List known scheduled jobs w/ last run summary" })
	async listJobs() {
		const latest = await Promise.all(
			KNOWN_JOBS.map(async (name) => {
				const lastRun = await this.prisma.cronJobRun.findFirst({
					where: { jobName: name },
					orderBy: { startedAt: "desc" },
				});
				return { name, lastRun };
			}),
		);
		return { data: latest };
	}

	@Get("runs")
	@ApiOperation({ summary: "List recent job runs (filterable by job)" })
	async listRuns(@Query("jobName") jobName?: string, @Query("limit") limit?: string) {
		const take = Math.max(1, Math.min(200, Number(limit) || 50));
		return {
			data: await this.prisma.cronJobRun.findMany({
				where: jobName ? { jobName } : undefined,
				orderBy: { startedAt: "desc" },
				take,
			}),
		};
	}

	@Post(":name/trigger")
	@ApiOperation({ summary: "Manually trigger a scheduled job" })
	async trigger(@Param("name") name: string, @Req() req: AdminReq) {
		if (!(KNOWN_JOBS as readonly string[]).includes(name)) {
			throw new BadRequestException(`Unknown job '${name}'`);
		}
		const adminUserId = req.adminUser?.id;
		const j = name as JobName;
		if (j === "billing.daily") {
			await this.billingCron.runDailyLifecycle(adminUserId);
		} else if (j === "billing.usage") {
			await this.billingCron.runUsageSnapshot(adminUserId);
		}
		return { data: { ok: true, jobName: j } };
	}
}
