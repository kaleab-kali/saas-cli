import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface AdminSubscriptionSummary {
	readonly id: string;
	readonly organizationId: string;
	readonly organizationName: string | null;
	readonly organizationSlug: string | null;
	readonly planId: string;
	readonly plan: { nameEn: string; nameAm: string; slug: string };
	readonly status: string;
	readonly billingInterval: string;
	readonly currency: string;
	readonly currentPeriodStart: string;
	readonly currentPeriodEnd: string;
	readonly gracePeriodEndsAt: string | null;
	readonly readOnlyModeEndsAt: string | null;
	readonly lockedAt: string | null;
	readonly creditBalanceMinor: number;
}

export interface AdminSubscriptionDetail extends AdminSubscriptionSummary {
	readonly organization: { id: string; name: string; slug: string } | null;
	readonly invoices: Array<{
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
		payments: Array<{
			id: string;
			amountMinor: number;
			method: string;
			paidAt: string;
			receiptNumber: string | null;
			bankReference: string | null;
			chapaTxRef: string | null;
			chapaRefId: string | null;
			verified: boolean;
			note: string | null;
		}>;
	}>;
	readonly lifecycle: {
		status: string;
		periodEnd: string;
		gracePeriodEndsAt: string | null;
		readOnlyModeEndsAt: string | null;
		lockedAt: string | null;
		daysUntilReadOnly: number | null;
		daysUntilLocked: number | null;
		daysExpired: number;
		isWriteBlocked: boolean;
		isFullyLocked: boolean;
	} | null;
}

export const adminBillingKeys = {
	all: ["admin-billing"] as const,
	subscriptions: () => [...adminBillingKeys.all, "subscriptions"] as const,
	subscriptionList: (status?: string) => [...adminBillingKeys.subscriptions(), { status }] as const,
	subscriptionDetails: () => [...adminBillingKeys.all, "subscription"] as const,
	subscriptionDetail: (id: string) => [...adminBillingKeys.subscriptionDetails(), id] as const,
	dunningLog: (subscriptionId: string) => [...adminBillingKeys.subscriptionDetail(subscriptionId), "dunning"] as const,
};

export const useAdminSubscriptions = (status?: string) =>
	useQuery({
		queryKey: adminBillingKeys.subscriptionList(status),
		queryFn: () =>
			api.get<{ data: AdminSubscriptionSummary[] }>("/admin/billing/subscriptions", {
				params: status ? { status } : undefined,
			}),
		select: (r) => r.data,
	});

export const useAdminSubscription = (id: string) =>
	useQuery({
		queryKey: adminBillingKeys.subscriptionDetail(id),
		queryFn: () => api.get<{ data: AdminSubscriptionDetail }>(`/admin/billing/subscriptions/${id}`),
		select: (r) => r.data,
		enabled: !!id,
	});

export const useCreateManualInvoice = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			subscriptionId,
			...body
		}: {
			subscriptionId: string;
			amountMinor: number;
			periodStart: string;
			periodEnd: string;
			description?: string;
			lineType?: string;
			dueDate?: string;
		}) => api.post(`/admin/billing/subscriptions/${subscriptionId}/invoices`, body),
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: adminBillingKeys.subscriptionDetail(v.subscriptionId) }),
	});
};

export const useSendInvoice = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (invoiceId: string) => api.put(`/admin/billing/invoices/${invoiceId}/send`, {}),
		onSuccess: () => qc.invalidateQueries({ queryKey: adminBillingKeys.all }),
	});
};

export const useVoidInvoice = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (invoiceId: string) => api.put(`/admin/billing/invoices/${invoiceId}/void`, {}),
		onSuccess: () => qc.invalidateQueries({ queryKey: adminBillingKeys.all }),
	});
};

export const useRecordManualPayment = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			invoiceId,
			...body
		}: {
			invoiceId: string;
			amountMinor: number;
			method: string;
			paidAt?: string;
			chapaTxRef?: string;
			chapaRefId?: string;
			bankReference?: string;
			receiptNumber?: string;
			note?: string;
		}) => api.post(`/admin/billing/invoices/${invoiceId}/payments`, body),
		onSuccess: () => qc.invalidateQueries({ queryKey: adminBillingKeys.all }),
	});
};

export const useExtendSubscription = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, days, reason }: { id: string; days: number; reason?: string }) =>
			api.post(`/admin/billing/subscriptions/${id}/extend`, { days, reason }),
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: adminBillingKeys.subscriptionDetail(v.id) }),
	});
};

export const useCreditAccount = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, amountMinor, note }: { id: string; amountMinor: number; note?: string }) =>
			api.post(`/admin/billing/subscriptions/${id}/credit`, { amountMinor, note }),
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: adminBillingKeys.subscriptionDetail(v.id) }),
	});
};

export const useChangeSubscriptionPlan = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, planId, note }: { id: string; planId: string; note?: string }) =>
			api.put(`/admin/billing/subscriptions/${id}/plan`, { planId, note }),
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: adminBillingKeys.subscriptionDetail(v.id) }),
	});
};

export interface DunningLogEntry {
	readonly id: string;
	readonly type: string;
	readonly subject: string;
	readonly sentTo: string;
	readonly status: string;
	readonly errorMessage: string | null;
	readonly sentAt: string;
}

export const useDunningLog = (subscriptionId: string) =>
	useQuery({
		queryKey: adminBillingKeys.dunningLog(subscriptionId),
		queryFn: () => api.get<{ data: DunningLogEntry[] }>(`/admin/billing/subscriptions/${subscriptionId}/dunning-log`),
		select: (r) => r.data,
		enabled: !!subscriptionId,
	});

export const useSendDunning = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			subscriptionId,
			type,
			invoiceId,
		}: {
			subscriptionId: string;
			type: "reminder" | "overdue" | "grace" | "read_only" | "locked" | "renewal";
			invoiceId?: string;
		}) => api.post(`/admin/billing/subscriptions/${subscriptionId}/dunning`, { type, invoiceId }),
		onSuccess: (_d, v) => {
			qc.invalidateQueries({ queryKey: adminBillingKeys.dunningLog(v.subscriptionId) });
		},
	});
};

export const useForceSubscriptionStatus = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
			api.put(`/admin/billing/subscriptions/${id}/status`, { status, reason }),
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: adminBillingKeys.subscriptionDetail(v.id) }),
	});
};
