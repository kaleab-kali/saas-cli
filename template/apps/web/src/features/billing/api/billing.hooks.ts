import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface PlanEntitlement {
	featureKey: string;
	enabled: boolean;
	limit: number | null;
}

export interface Plan {
	id: string;
	slug: "free" | "pro" | "enterprise";
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
	sortOrder: number;
	entitlements: PlanEntitlement[];
}

export type Gateway = "stripe" | "chapa" | "manual";

export interface Subscription {
	id: string;
	organizationId: string;
	planId: string;
	planSlug: string;
	status: string;
	billingInterval: string;
	currency: string;
	gateway: Gateway;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	canceledAt: string | null;
	cancelAtPeriodEnd: boolean;
	trialEndsAt: string | null;
	creditBalanceMinor: number;
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
	subtotalMinor: number;
	taxMinor: number;
	totalMinor: number;
	amountPaidMinor: number;
	lineType: string;
	description: string | null;
	stripeInvoiceId: string | null;
	chapaTxRef: string | null;
	checkoutUrl: string | null;
	pdfUrl: string | null;
	paidAt: string | null;
}

export interface UsageCurrent {
	userCount: number;
	apiCallCount: number;
	emailCount: number;
	caps: { users: number | null };
	usagePct: { users: number };
	metrics: Record<string, number>;
}

const K = {
	plans: ["billing", "plans"] as const,
	subscription: ["billing", "subscription"] as const,
	usage: ["billing", "usage"] as const,
	entitlements: ["billing", "entitlements"] as const,
	invoices: (status?: string) => ["billing", "invoices", { status }] as const,
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
			api.get<{ data: { subscription: Subscription | null; plan: Plan | null } }>(
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

export const useRecordManualPayment = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (dto: {
			invoiceId: string;
			amountMinor: number;
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

export const useInitiateStripe = () => {
	return useMutation({
		mutationFn: (invoiceId: string) =>
			api.post<{ data: { checkoutUrl: string } }>("/billing/stripe/initiate", { invoiceId }),
		onSuccess: (res) => {
			if (res.data.checkoutUrl) window.location.href = res.data.checkoutUrl;
		},
	});
};
