import * as os from "node:os";
import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";
import { PrismaService } from "#shared/database/prisma.service";
import { MetricsService } from "#shared/metrics/metrics.service";

@ApiTags("Admin")
@AllowAnonymous()
@Controller("admin/server")
@UseGuards(SuperAdminGuard)
export class AdminServerController {
	constructor(
		private readonly prisma: PrismaService,
		private readonly metrics: MetricsService,
	) {}

	@Get("overview")
	@ApiOperation({ summary: "Server runtime, resource, and dependency overview" })
	async overview() {
		const db = await this.checkDatabase();
		const memory = process.memoryUsage();
		const load = os.loadavg();
		return {
			data: {
				app: {
					name: process.env.APP_NAME ?? "SaaS",
					nodeEnv: process.env.NODE_ENV ?? "development",
					uptimeSeconds: Math.round(process.uptime()),
					pid: process.pid,
					nodeVersion: process.version,
				},
				host: {
					platform: os.platform(),
					arch: os.arch(),
					hostname: os.hostname(),
					cpus: os.cpus().length,
					load1m: load[0],
					load5m: load[1],
					load15m: load[2],
					totalMemoryBytes: os.totalmem(),
					freeMemoryBytes: os.freemem(),
				},
				process: {
					rssBytes: memory.rss,
					heapUsedBytes: memory.heapUsed,
					heapTotalBytes: memory.heapTotal,
					externalBytes: memory.external,
				},
				http: this.metrics.snapshot(),
				dependencies: {
					database: db,
					redisConfigured: Boolean(process.env.REDIS_URL),
					stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
					chapaConfigured: Boolean(process.env.CHAPA_SECRET_KEY),
					storageDriver: process.env.STORAGE_DRIVER ?? "local",
					objectStorageConfigured: Boolean(
						process.env.OBJECT_STORAGE_ENDPOINT &&
							process.env.OBJECT_STORAGE_BUCKET &&
							process.env.OBJECT_STORAGE_ACCESS_KEY &&
							process.env.OBJECT_STORAGE_SECRET_KEY,
					),
				},
			},
		};
	}

	@Get("resources")
	@ApiOperation({ summary: "Platform resource counts" })
	async resources() {
		const [
			organizations,
			users,
			sessions,
			subscriptions,
			invoices,
			apiKeys,
			fileAssets,
			notifications,
			savedReports,
			auditLogs,
			jobRuns,
		] = await Promise.all([
			this.prisma.organization.count(),
			this.prisma.user.count(),
			this.prisma.session.count(),
			this.prisma.subscription.count(),
			this.prisma.subscriptionInvoice.count(),
			this.prisma.apiKey.count(),
			this.prisma.fileAsset.count(),
			this.prisma.notification.count(),
			this.prisma.savedReport.count(),
			this.prisma.auditLog.count(),
			this.prisma.cronJobRun.count(),
		]);

		return {
			data: {
				organizations,
				users,
				sessions,
				subscriptions,
				invoices,
				apiKeys,
				fileAssets,
				notifications,
				savedReports,
				auditLogs,
				jobRuns,
			},
		};
	}

	@Get("metrics")
	@ApiOperation({ summary: "Admin HTTP metric snapshot" })
	async metricsSnapshot() {
		return { data: this.metrics.snapshot() };
	}

	private async checkDatabase() {
		const started = Date.now();
		try {
			await this.prisma.$queryRaw`SELECT 1`;
			return { ok: true, latencyMs: Date.now() - started };
		} catch (error) {
			return {
				ok: false,
				latencyMs: Date.now() - started,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
