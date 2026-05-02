import { Injectable, Logger } from "@nestjs/common";
import { PlatformSettingsService } from "#modules/admin/application/services/platform-settings.service";
import { PrismaService } from "#shared/database/prisma.service";

export type SubStatus =
	| "active"
	| "trialing"
	| "past_due"
	| "grace"
	| "read_only"
	| "locked"
	| "canceled"
	| "suspended";

export interface LifecycleSnapshot {
	status: SubStatus;
	periodEnd: Date;
	gracePeriodEndsAt: Date | null;
	readOnlyModeEndsAt: Date | null;
	lockedAt: Date | null;
	daysUntilReadOnly: number | null;
	daysUntilLocked: number | null;
	daysExpired: number;
	isWriteBlocked: boolean;
	isFullyLocked: boolean;
}

@Injectable()
export class SubscriptionLifecycleService {
	private readonly logger = new Logger(SubscriptionLifecycleService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly settings: PlatformSettingsService,
	) {}

	async snapshot(organizationId: string): Promise<LifecycleSnapshot | null> {
		const sub = await this.prisma.subscription.findUnique({ where: { organizationId } });
		if (!sub) return null;
		const now = new Date();
		const msDay = 1000 * 60 * 60 * 24;
		const status = sub.status as SubStatus;
		const daysExpired =
			sub.currentPeriodEnd < now ? Math.floor((now.getTime() - sub.currentPeriodEnd.getTime()) / msDay) : 0;
		const daysUntilReadOnly = sub.gracePeriodEndsAt
			? Math.ceil((sub.gracePeriodEndsAt.getTime() - now.getTime()) / msDay)
			: null;
		const daysUntilLocked = sub.readOnlyModeEndsAt
			? Math.ceil((sub.readOnlyModeEndsAt.getTime() - now.getTime()) / msDay)
			: null;
		return {
			status,
			periodEnd: sub.currentPeriodEnd,
			gracePeriodEndsAt: sub.gracePeriodEndsAt,
			readOnlyModeEndsAt: sub.readOnlyModeEndsAt,
			lockedAt: sub.lockedAt,
			daysUntilReadOnly,
			daysUntilLocked,
			daysExpired,
			isWriteBlocked: status === "read_only" || status === "locked" || status === "suspended",
			isFullyLocked: status === "locked" || status === "suspended" || status === "canceled",
		};
	}

	/**
	 * Advance lifecycle for a single subscription. Called by cron + after payment.
	 * Transition rules:
	 *  active/trialing + period expired → past_due (+ set gracePeriodEndsAt)
	 *  past_due + now > gracePeriodEndsAt → read_only (+ set readOnlyModeEndsAt)
	 *  read_only + now > readOnlyModeEndsAt → locked
	 */
	async advance(subscriptionId: string): Promise<{ changed: boolean; from: SubStatus; to: SubStatus }> {
		const sub = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
		if (!sub) return { changed: false, from: "canceled", to: "canceled" };
		const now = new Date();
		const from = sub.status as SubStatus;
		if (from === "canceled" || from === "suspended") {
			return { changed: false, from, to: from };
		}
		const graceDays = await this.settings.getNumber("billing.gracePeriodDays", 7);
		const readOnlyDays = await this.settings.getNumber("billing.readOnlyPeriodDays", 14);

		// active/trialing period expired → past_due
		if ((from === "active" || from === "trialing") && sub.currentPeriodEnd < now) {
			const gracePeriodEndsAt = new Date(now.getTime() + graceDays * 86_400_000);
			await this.prisma.subscription.update({
				where: { id: subscriptionId },
				data: { status: "past_due", gracePeriodEndsAt },
			});
			return { changed: true, from, to: "past_due" };
		}
		// past_due grace ran out → read_only
		if (from === "past_due" && sub.gracePeriodEndsAt && sub.gracePeriodEndsAt < now) {
			const readOnlyModeEndsAt = new Date(now.getTime() + readOnlyDays * 86_400_000);
			await this.prisma.subscription.update({
				where: { id: subscriptionId },
				data: { status: "read_only", readOnlyModeEndsAt },
			});
			return { changed: true, from, to: "read_only" };
		}
		// read_only timeout → locked
		if (from === "read_only" && sub.readOnlyModeEndsAt && sub.readOnlyModeEndsAt < now) {
			await this.prisma.subscription.update({
				where: { id: subscriptionId },
				data: { status: "locked", lockedAt: now },
			});
			return { changed: true, from, to: "locked" };
		}
		return { changed: false, from, to: from };
	}

	/**
	 * Restore subscription to active after payment fully settles invoice.
	 * Extends currentPeriodEnd by billingInterval.
	 */
	async restoreAfterPayment(subscriptionId: string): Promise<void> {
		const sub = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
		if (!sub) return;
		const now = new Date();
		// pick base as max(now, currentPeriodEnd) so renewals don't shrink
		const base = sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
		const monthsToAdd = sub.billingInterval === "annual" ? 12 : 1;
		const nextEnd = new Date(base);
		nextEnd.setMonth(nextEnd.getMonth() + monthsToAdd);
		await this.prisma.subscription.update({
			where: { id: subscriptionId },
			data: {
				status: "active",
				currentPeriodStart: base,
				currentPeriodEnd: nextEnd,
				gracePeriodEndsAt: null,
				readOnlyModeEndsAt: null,
				lockedAt: null,
			},
		});
		this.logger.log(`Subscription ${subscriptionId} restored to active; new periodEnd=${nextEnd.toISOString()}`);
	}
}
