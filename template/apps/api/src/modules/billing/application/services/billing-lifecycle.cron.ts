import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PlatformSettingsService } from "#modules/admin/application/services/platform-settings.service";
import { PrismaService } from "#shared/database/prisma.service";
import { DunningService } from "./dunning.service";
import { InvoiceLifecycleService } from "./invoice-lifecycle.service";
import { SubscriptionLifecycleService } from "./subscription-lifecycle.service";

@Injectable()
export class BillingLifecycleCron {
	private readonly logger = new Logger(BillingLifecycleCron.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly lifecycle: SubscriptionLifecycleService,
		private readonly settings: PlatformSettingsService,
		private readonly invoiceLifecycle: InvoiceLifecycleService,
		private readonly dunning: DunningService,
	) {}

	/**
	 * Wraps a job execution with DB logging — start row, mark success/failure, duration.
	 * Returns row id for downstream use. Always logs even on throw.
	 */
	private async runTracked(jobName: string, fn: () => Promise<string>, triggeredByUserId?: string): Promise<string> {
		const row = await this.prisma.cronJobRun.create({
			data: { jobName, status: "running", triggeredByUserId: triggeredByUserId ?? null },
		});
		const start = Date.now();
		try {
			const summary = await fn();
			await this.prisma.cronJobRun.update({
				where: { id: row.id },
				data: {
					status: "success",
					finishedAt: new Date(),
					durationMs: Date.now() - start,
					summary,
				},
			});
			return row.id;
		} catch (e) {
			await this.prisma.cronJobRun.update({
				where: { id: row.id },
				data: {
					status: "failed",
					finishedAt: new Date(),
					durationMs: Date.now() - start,
					errorMessage: (e as Error).message,
				},
			});
			throw e;
		}
	}

	async runDailyLifecycle(triggeredByUserId?: string): Promise<string> {
		return this.runTracked("billing.daily", () => this.dailyLifecycleInner(), triggeredByUserId);
	}

	async runUsageSnapshot(triggeredByUserId?: string): Promise<string> {
		return this.runTracked("billing.usage", () => this.usageSnapshotInner(), triggeredByUserId);
	}

	// Daily at 02:00 — advance expired subs, generate renewal invoices, send reminders.
	@Cron("0 2 * * *", { name: "billing.daily" })
	async dailyLifecycle() {
		await this.runTracked("billing.daily", () => this.dailyLifecycleInner());
	}

	private async dailyLifecycleInner(): Promise<string> {
		this.logger.log("[billing.daily] start");
		const autoRenewInvoice = await this.settings.getBool("billing.autoGenerateRenewalInvoice", true);
		const now = new Date();

		// 1. active/trialing subs whose period ended → create renewal invoice + transition
		const expiring = await this.prisma.subscription.findMany({
			where: {
				status: { in: ["active", "trialing"] },
				currentPeriodEnd: { lt: now },
			},
			include: { plan: true },
		});
		for (const sub of expiring) {
			try {
				if (autoRenewInvoice) {
					const amountMinor =
						sub.billingInterval === "annual" ? sub.plan.priceAnnualMinor : sub.plan.priceMonthlyMinor;
					await this.invoiceLifecycle.createRenewalInvoice({
						subscriptionId: sub.id,
						organizationId: sub.organizationId,
						amountMinor,
						currency: sub.currency,
						periodStart: sub.currentPeriodEnd,
						billingInterval: sub.billingInterval,
					});
				}
				await this.lifecycle.advance(sub.id);
			} catch (e) {
				this.logger.error(`renewal failed for sub ${sub.id}: ${(e as Error).message}`);
			}
		}

		// 2. past_due → read_only
		const pastDue = await this.prisma.subscription.findMany({
			where: { status: "past_due", gracePeriodEndsAt: { lt: now } },
		});
		for (const sub of pastDue) {
			await this.lifecycle.advance(sub.id);
			try {
				await this.dunning.send({ subscriptionId: sub.id, type: "read_only" });
			} catch (e) {
				this.logger.warn(`dunning read_only failed for ${sub.id}: ${(e as Error).message}`);
			}
		}

		// 3. read_only → locked
		const readOnly = await this.prisma.subscription.findMany({
			where: { status: "read_only", readOnlyModeEndsAt: { lt: now } },
		});
		for (const sub of readOnly) {
			await this.lifecycle.advance(sub.id);
			try {
				await this.dunning.send({ subscriptionId: sub.id, type: "locked" });
			} catch (e) {
				this.logger.warn(`dunning locked failed for ${sub.id}: ${(e as Error).message}`);
			}
		}

		// 4. send scheduled reminders based on reminder schedule
		const reminderSchedule = await this.settings.getJson<number[]>("billing.reminderSchedule", []);
		if (reminderSchedule.length) {
			const openInvoices = await this.prisma.subscriptionInvoice.findMany({
				where: { status: { in: ["sent", "overdue", "partial"] } },
			});
			for (const inv of openInvoices) {
				const daysDiff = Math.floor((now.getTime() - inv.dueDate.getTime()) / 86_400_000);
				if (!reminderSchedule.includes(daysDiff)) continue;
				const already = await this.prisma.dunningEmail.findFirst({
					where: {
						subscriptionId: inv.subscriptionId,
						invoiceId: inv.id,
						daysOffset: daysDiff,
					},
				});
				if (already) continue;
				try {
					const type = daysDiff < 0 ? "reminder" : "overdue";
					await this.dunning.send({
						subscriptionId: inv.subscriptionId,
						invoiceId: inv.id,
						type,
						daysOffset: daysDiff,
					});
				} catch (e) {
					this.logger.warn(`reminder failed for invoice ${inv.id}: ${(e as Error).message}`);
				}
			}
		}

		const summary = `expiring=${expiring.length} past_due→read_only=${pastDue.length} read_only→locked=${readOnly.length}`;
		this.logger.log(`[billing.daily] ${summary}`);
		return summary;
	}

	// Daily at 04:00 — usage snapshot per active org
	@Cron(CronExpression.EVERY_DAY_AT_4AM, { name: "billing.usage" })
	async usageSnapshot() {
		await this.runTracked("billing.usage", () => this.usageSnapshotInner());
	}

	private async usageSnapshotInner(): Promise<string> {
		const subs = await this.prisma.subscription.findMany({
			where: { status: { in: ["active", "trialing", "past_due", "grace", "read_only"] } },
		});
		for (const sub of subs) {
			try {
				const users = await this.prisma.member.count({
					where: { organizationId: sub.organizationId, removedAt: null },
				});
				await this.prisma.usageSnapshot.create({
					data: {
						subscriptionId: sub.id,
						organizationId: sub.organizationId,
						userCount: users,
					},
				});
			} catch (e) {
				this.logger.warn(`usage snapshot failed for ${sub.organizationId}: ${(e as Error).message}`);
			}
		}
		const summary = `snapshots=${subs.length}`;
		this.logger.log(`[billing.usage] ${summary}`);
		return summary;
	}
}
