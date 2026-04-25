import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { LogPlatformActionHandler } from "./log-platform-action.handler";

@Injectable()
export class ExtendTrialHandler {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: LogPlatformActionHandler,
	) {}

	async execute(subscriptionId: string, days: number, performedBy?: string, reason?: string) {
		if (days <= 0 || days > 365) throw new BadRequestException("days must be between 1 and 365");
		const sub = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
		if (!sub) throw new NotFoundException("subscription not found");
		const base = sub.currentPeriodEnd > new Date() ? sub.currentPeriodEnd : new Date();
		const nextEnd = new Date(base.getTime() + days * 86_400_000);
		const updated = await this.prisma.subscription.update({
			where: { id: subscriptionId },
			data: {
				currentPeriodEnd: nextEnd,
				status: "active",
				gracePeriodEndsAt: null,
				readOnlyModeEndsAt: null,
				lockedAt: null,
			},
		});
		if (performedBy) {
			await this.audit.execute({
				performedBy,
				action: "subscription.extend-trial",
				targetType: "subscription",
				targetId: subscriptionId,
				details: { days, reason, newPeriodEnd: nextEnd.toISOString() },
			});
		}
		return updated;
	}
}

@Injectable()
export class SetManualPaymentModeHandler {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: LogPlatformActionHandler,
	) {}

	async execute(subscriptionId: string, manualMode: boolean, performedBy?: string) {
		const updated = await this.prisma.subscription.update({
			where: { id: subscriptionId },
			data: { manualPaymentMode: manualMode },
		});
		if (performedBy) {
			await this.audit.execute({
				performedBy,
				action: "subscription.set-manual-mode",
				targetType: "subscription",
				targetId: subscriptionId,
				details: { manualMode },
			});
		}
		return updated;
	}
}

@Injectable()
export class CreditAccountHandler {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: LogPlatformActionHandler,
	) {}

	async execute(subscriptionId: string, amountEtb: number, performedBy?: string, note?: string) {
		if (amountEtb === 0) throw new BadRequestException("amount must be non-zero");
		const sub = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
		if (!sub) throw new NotFoundException("subscription not found");
		const next = (sub.creditBalanceEtb ?? 0) + amountEtb;
		if (next < 0) throw new BadRequestException("credit balance cannot go negative");
		const updated = await this.prisma.subscription.update({
			where: { id: subscriptionId },
			data: { creditBalanceEtb: next },
		});
		if (performedBy) {
			await this.audit.execute({
				performedBy,
				action: "subscription.credit-account",
				targetType: "subscription",
				targetId: subscriptionId,
				details: { amountEtb, newBalance: next, note },
			});
		}
		return updated;
	}
}

@Injectable()
export class ChangeSubscriptionPlanHandler {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: LogPlatformActionHandler,
	) {}

	async execute(subscriptionId: string, newPlanId: string, performedBy?: string, note?: string) {
		const plan = await this.prisma.plan.findUnique({ where: { id: newPlanId } });
		if (!plan?.active) throw new BadRequestException("target plan not available");
		const before = await this.prisma.subscription.findUnique({ where: { id: subscriptionId } });
		if (!before) throw new NotFoundException("subscription not found");
		const after = await this.prisma.subscription.update({
			where: { id: subscriptionId },
			data: { planId: newPlanId },
		});
		if (performedBy) {
			await this.audit.execute({
				performedBy,
				action: "subscription.change-plan",
				targetType: "subscription",
				targetId: subscriptionId,
				details: { oldPlanId: before.planId, newPlanId, note },
			});
		}
		return after;
	}
}

@Injectable()
export class ForceSubscriptionStatusHandler {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: LogPlatformActionHandler,
	) {}

	async execute(subscriptionId: string, status: string, performedBy?: string, reason?: string) {
		const ALLOWED = ["active", "trialing", "past_due", "grace", "read_only", "locked", "suspended", "canceled"];
		if (!ALLOWED.includes(status)) throw new BadRequestException(`status must be one of ${ALLOWED.join(",")}`);
		const updated = await this.prisma.subscription.update({
			where: { id: subscriptionId },
			data: { status, canceledAt: status === "canceled" ? new Date() : null },
		});
		if (performedBy) {
			await this.audit.execute({
				performedBy,
				action: "subscription.force-status",
				targetType: "subscription",
				targetId: subscriptionId,
				details: { status, reason },
			});
		}
		return updated;
	}
}
