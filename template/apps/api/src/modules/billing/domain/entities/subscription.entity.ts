import { BadRequestException } from "@nestjs/common";
import type { BillingInterval, PlanSlug, SubscriptionStatus } from "../value-objects/feature-keys.vo";

export interface SubscriptionProps {
	id: string;
	organizationId: string;
	planId: string;
	planSlug: PlanSlug;
	status: SubscriptionStatus;
	billingInterval: BillingInterval;
	currency: string;
	chapaCustomerId: string | null;
	chapaSubscriptionId: string | null;
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
	canceledAt: Date | null;
	cancelAtPeriodEnd: boolean;
	campaignActiveUntil: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export class Subscription {
	private constructor(private props: SubscriptionProps) {}

	static create(props: SubscriptionProps) {
		if (!props.organizationId) throw new BadRequestException("organizationId required");
		if (props.currentPeriodEnd <= props.currentPeriodStart) {
			throw new BadRequestException("currentPeriodEnd must be after currentPeriodStart");
		}
		return new Subscription(props);
	}

	static rehydrate(props: SubscriptionProps) {
		return new Subscription(props);
	}

	get id() {
		return this.props.id;
	}
	get organizationId() {
		return this.props.organizationId;
	}
	get planSlug() {
		return this.props.planSlug;
	}
	get status() {
		return this.props.status;
	}
	get isActive() {
		return this.props.status === "active" || this.props.status === "trialing";
	}
	get campaignActive() {
		return this.props.campaignActiveUntil !== null && this.props.campaignActiveUntil > new Date();
	}

	changePlan(newPlanId: string, newSlug: PlanSlug) {
		if (this.props.status === "canceled") throw new BadRequestException("cannot change canceled subscription");
		this.props.planId = newPlanId;
		this.props.planSlug = newSlug;
		this.props.updatedAt = new Date();
	}

	cancel(immediate: boolean) {
		if (this.props.status === "canceled") return;
		if (immediate) {
			this.props.status = "canceled";
			this.props.canceledAt = new Date();
		} else {
			this.props.cancelAtPeriodEnd = true;
		}
		this.props.updatedAt = new Date();
	}

	resume() {
		if (this.props.status !== "canceled" && !this.props.cancelAtPeriodEnd) return;
		this.props.status = "active";
		this.props.canceledAt = null;
		this.props.cancelAtPeriodEnd = false;
		this.props.updatedAt = new Date();
	}

	markPastDue() {
		this.props.status = "past_due";
		this.props.updatedAt = new Date();
	}

	suspend() {
		this.props.status = "suspended";
		this.props.updatedAt = new Date();
	}

	activateCampaign(until: Date) {
		if (until <= new Date()) throw new BadRequestException("campaign end must be future");
		// Extend existing campaign if already active
		const existing = this.props.campaignActiveUntil;
		this.props.campaignActiveUntil = existing && existing > until ? existing : until;
		this.props.updatedAt = new Date();
	}

	renewPeriod(newStart: Date, newEnd: Date) {
		this.props.currentPeriodStart = newStart;
		this.props.currentPeriodEnd = newEnd;
		if (this.props.cancelAtPeriodEnd) {
			this.props.status = "canceled";
			this.props.canceledAt = new Date();
		}
		this.props.updatedAt = new Date();
	}

	toPrimitives() {
		return { ...this.props };
	}
}
