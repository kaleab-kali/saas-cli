import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface RevenueTrendPoint {
	readonly month: string;
	readonly revenueMinor: number;
}

export interface PastDueInvoice {
	readonly id: string;
	readonly number: string;
	readonly subscriptionId: string;
	readonly organizationId: string;
	readonly organizationName: string | null;
	readonly dueDate: string;
	readonly totalMinor: number;
	readonly amountPaidMinor: number;
	readonly currency: string;
	readonly daysPastDue: number;
}

export interface PendingPayment {
	readonly id: string;
	readonly invoiceId: string;
	readonly invoiceNumber: string | null;
	readonly organizationId: string;
	readonly organizationName: string | null;
	readonly amountMinor: number;
	readonly currency: string;
	readonly method: string;
	readonly receiptNumber: string | null;
	readonly bankReference: string | null;
	readonly paidAt: string;
	readonly note: string | null;
}

export const useRevenueTrend = () =>
	useQuery({
		queryKey: ["admin-billing-revenue-trend"],
		queryFn: () => api.get<{ data: RevenueTrendPoint[] }>("/admin/billing/dashboard/revenue-trend"),
		select: (r) => r.data,
	});

export const usePastDueInvoices = () =>
	useQuery({
		queryKey: ["admin-billing-past-due"],
		queryFn: () => api.get<{ data: PastDueInvoice[] }>("/admin/billing/dashboard/past-due"),
		select: (r) => r.data,
	});

export const usePendingVerification = () =>
	useQuery({
		queryKey: ["admin-billing-pending-verification"],
		queryFn: () => api.get<{ data: PendingPayment[] }>("/admin/billing/dashboard/pending-verification"),
		select: (r) => r.data,
	});

export const useVerifyPayment = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (paymentId: string) => api.post(`/admin/billing/payments/${paymentId}/verify`, {}),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-billing-pending-verification"] }),
	});
};

export const useUsageHistory = (subscriptionId: string) =>
	useQuery({
		queryKey: ["admin-billing-usage-history", subscriptionId],
		queryFn: () =>
			api.get<{
				data: Array<{
					id: string;
					snapshotDate: string;
					userCount: number;
					apiCallCount: number;
					emailCount: number;
					metricsJson: Record<string, number> | null;
				}>;
			}>(`/admin/billing/subscriptions/${subscriptionId}/usage-history`),
		select: (r) => r.data,
		enabled: !!subscriptionId,
	});

export interface BillingDashboard {
	readonly mrrMinor: number;
	readonly arrMinor: number;
	readonly outstandingMinor: number;
	readonly paidLast30Minor: number;
	readonly countsByStatus: Record<string, number>;
	readonly upcomingRenewals30d: number;
	readonly byPlan: Record<string, { count: number; mrrMinor: number }>;
	readonly totalSubs: number;
}

export const useBillingDashboard = () =>
	useQuery({
		queryKey: ["admin-billing-dashboard"],
		queryFn: () => api.get<{ data: BillingDashboard }>("/admin/billing/dashboard"),
		select: (r) => r.data,
	});
