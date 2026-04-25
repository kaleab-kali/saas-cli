import type { PlanSlug } from "../value-objects/feature-keys.vo";

export interface PlanEntitlement {
	featureKey: string;
	enabled: boolean;
	limit: number | null;
}

export interface PlanProps {
	id: string;
	slug: PlanSlug;
	nameEn: string;
	nameAm: string;
	description: string | null;
	priceMonthlyMinor: number;
	priceAnnualMinor: number;
	currency: string;
	userCap: number | null;
	supportSlaHours: number;
	stripeSupported: boolean;
	stripePriceIdMonthly: string | null;
	stripePriceIdAnnual: string | null;
	chapaSupported: boolean;
	manualSupported: boolean;
	active: boolean;
	sortOrder: number;
	entitlements: PlanEntitlement[];
	createdAt: Date;
	updatedAt: Date;
}

export class Plan {
	private constructor(private props: PlanProps) {}

	static rehydrate(props: PlanProps) {
		return new Plan(props);
	}

	get id() {
		return this.props.id;
	}
	get slug() {
		return this.props.slug;
	}

	hasFeature(featureKey: string): boolean {
		const e = this.props.entitlements.find((x) => x.featureKey === featureKey);
		return e?.enabled ?? false;
	}

	featureLimit(featureKey: string): number | null {
		const e = this.props.entitlements.find((x) => x.featureKey === featureKey);
		if (!e?.enabled) return 0;
		return e.limit;
	}

	toPrimitives(): PlanProps {
		return { ...this.props, entitlements: [...this.props.entitlements] };
	}
}
