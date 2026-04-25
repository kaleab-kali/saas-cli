import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface PlanEntitlement {
	featureKey: string;
	enabled: boolean;
	limit: number | null;
}

export interface Plan {
	id: string;
	slug: "starter" | "growth" | "enterprise";
	nameEn: string;
	nameAm: string;
	priceMonthlyEtb: number;
	priceAnnualEtb: number;
	priceCampaignDailyEtb: number | null;
	buildingCap: number | null;
	unitCap: number | null;
	userCap: number | null;
	supportSlaHours: number;
	sortOrder: number;
	entitlements: PlanEntitlement[];
}

export interface Subscription {
	id: string;
	organizationId: string;
	planId: string;
	planSlug: string;
	status: string;
	billingInterval: string;
	currency: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	canceledAt: string | null;
	cancelAtPeriodEnd: boolean;
	campaignActiveUntil: string | null;
}

export interface CampaignActivation {
	id: string;
	days: number;
	dailyRateEtb: number;
	totalEtb: number;
	startsAt: string;
	endsAt: string;
	status: string;
}

export interface SubscriptionInvoice {
	id: string;
	number: string;
	status: string;
	issueDate: string;
	dueDate: string;
	periodStart: string;
	periodEnd: string;
	currency: string;
	subtotal: number;
	vatAmount: number;
	total: number;
	amountPaid: number;
	lineType: string;
	description: string | null;
	pdfUrl: string | null;
	paidAt: string | null;
}

export interface UsageCurrent {
	buildingCount: number;
	unitCount: number;
	userCount: number;
	caps: { buildings: number | null; units: number | null; users: number | null };
	usagePct: { buildings: number; units: number; users: number };
}

const K = {
	plans: ["billing", "plans"] as const,
	subscription: ["billing", "subscription"] as const,
	usage: ["billing", "usage"] as const,
	entitlements: ["billing", "entitlements"] as const,
	invoices: (status?: string) => ["billing", "invoices", { status }] as const,
	campaigns: ["billing", "campaigns"] as const,
};

export const usePlans = () =>
	useQuery({
		queryKey: K.plans,
		queryFn: () => api.get<{ data: Plan[] }>("/billing/plans"),
		select: (r) => r.data,
	});

export const useSubscription = () =>
	useQuery({
		queryKey: K.subscription,
		queryFn: () =>
			api.get<{ data: { subscription: Subscription | null; plan: Plan | null; campaign: CampaignActivation | null } }>(
				"/billing/subscription",
			),
		select: (r) => r.data,
	});

export const useUsage = () =>
	useQuery({
		queryKey: K.usage,
		queryFn: () => api.get<{ data: UsageCurrent }>("/billing/usage"),
		select: (r) => r.data,
	});

export const useEntitlements = () =>
	useQuery({
		queryKey: K.entitlements,
		queryFn: () =>
			api.get<{ data: Record<string, { enabled: boolean; limit: number | null }> }>("/billing/entitlements"),
		select: (r) => r.data,
	});

export const useSubscriptionInvoices = (status?: string) =>
	useQuery({
		queryKey: K.invoices(status),
		queryFn: () =>
			api.get<{ data: SubscriptionInvoice[]; meta: { total: number } }>("/billing/invoices", {
				params: status ? { status } : {},
			}),
	});

export const useCampaigns = () =>
	useQuery({
		queryKey: K.campaigns,
		queryFn: () => api.get<{ data: CampaignActivation[] }>("/billing/campaigns"),
		select: (r) => r.data,
	});

export const useStartSubscription = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (dto: { planSlug: string; billingInterval: "monthly" | "annual" }) =>
			api.post("/billing/subscription", dto),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["billing"] }),
		meta: { successMessage: "Subscription started" },
	});
};

export const useChangePlan = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (dto: { planSlug: string; billingInterval?: string }) =>
			api.post("/billing/subscription/change-plan", dto),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["billing"] }),
		meta: { successMessage: "Plan changed" },
	});
};

export const useCancelSubscription = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (immediate: boolean) => api.post("/billing/subscription/cancel", { immediate }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["billing"] }),
		meta: { successMessage: "Subscription canceled" },
	});
};

export const useResumeSubscription = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => api.post("/billing/subscription/resume", {}),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["billing"] }),
		meta: { successMessage: "Subscription resumed" },
	});
};

export const useActivateCampaign = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (days: number) => api.post("/billing/campaigns", { days }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["billing"] }),
		meta: { successMessage: "Campaign activated" },
	});
};

export const useRecordManualPayment = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (dto: {
			invoiceId: string;
			amount: number;
			method: string;
			receiptNumber?: string;
			bankReference?: string;
			note?: string;
			paidAt?: string;
		}) => api.post("/billing/payments/manual", dto),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["billing"] }),
		meta: { successMessage: "Payment recorded (pending verification)" },
	});
};

export const useVerifyPayment = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.post(`/billing/payments/${id}/verify`, {}),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["billing"] }),
		meta: { successMessage: "Payment verified" },
	});
};

export const useInitiateChapa = () => {
	return useMutation({
		mutationFn: (invoiceId: string) =>
			api.post<{ data: { checkoutUrl: string; txRef: string } }>("/billing/chapa/initiate", { invoiceId }),
		onSuccess: (res) => {
			if (res.data.checkoutUrl) window.location.href = res.data.checkoutUrl;
		},
	});
};
