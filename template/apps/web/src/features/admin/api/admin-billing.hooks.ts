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
	readonly manualPaymentMode: boolean;
	readonly creditBalanceEtb: number;
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
		subtotal: number;
		vatAmount: number;
		total: number;
		amountPaid: number;
		lineType: string;
		description: string | null;
		payments: Array<{
			id: string;
			amount: number;
			method: string;
			paidAt: string;
			receiptNumber: string | null;
			bankReference: string | null;
			chapaReference: string | null;
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

const k = {
	all: ["admin-billing"] as const,
	subs: (status?: string) => [...k.all, "subs", status] as const,
	sub: (id: string) => [...k.all, "sub", id] as const,
};

export const useAdminSubscriptions = (status?: string) =>
	useQuery({
		queryKey: k.subs(status),
		queryFn: () =>
			api.get<{ data: AdminSubscriptionSummary[] }>("/admin/billing/subscriptions", {
				params: status ? { status } : undefined,
			}),
		select: (r) => r.data,
	});

export const useAdminSubscription = (id: string) =>
	useQuery({
		queryKey: k.sub(id),
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
			amountEtb: number;
			periodStart: string;
			periodEnd: string;
			description?: string;
			lineType?: string;
			dueDate?: string;
		}) => api.post(`/admin/billing/subscriptions/${subscriptionId}/invoices`, body),
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: k.sub(v.subscriptionId) }),
	});
};

export const useSendInvoice = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (invoiceId: string) => api.put(`/admin/billing/invoices/${invoiceId}/send`, {}),
		onSuccess: () => qc.invalidateQueries({ queryKey: k.all }),
	});
};

export const useVoidInvoice = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (invoiceId: string) => api.put(`/admin/billing/invoices/${invoiceId}/void`, {}),
		onSuccess: () => qc.invalidateQueries({ queryKey: k.all }),
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
			amount: number;
			method: string;
			paidAt?: string;
			chapaReference?: string;
			bankReference?: string;
			receiptNumber?: string;
			note?: string;
		}) => api.post(`/admin/billing/invoices/${invoiceId}/payments`, body),
		onSuccess: () => qc.invalidateQueries({ queryKey: k.all }),
	});
};

export const useExtendSubscription = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, days, reason }: { id: string; days: number; reason?: string }) =>
			api.post(`/admin/billing/subscriptions/${id}/extend`, { days, reason }),
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: k.sub(v.id) }),
	});
};

export const useToggleManualMode = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, manualMode }: { id: string; manualMode: boolean }) =>
			api.put(`/admin/billing/subscriptions/${id}/manual-mode`, { manualMode }),
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: k.sub(v.id) }),
	});
};

export const useCreditAccount = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, amountEtb, note }: { id: string; amountEtb: number; note?: string }) =>
			api.post(`/admin/billing/subscriptions/${id}/credit`, { amountEtb, note }),
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: k.sub(v.id) }),
	});
};

export const useChangeSubscriptionPlan = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, planId, note }: { id: string; planId: string; note?: string }) =>
			api.put(`/admin/billing/subscriptions/${id}/plan`, { planId, note }),
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: k.sub(v.id) }),
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
		queryKey: [...k.sub(subscriptionId), "dunning"],
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
			qc.invalidateQueries({ queryKey: [...k.sub(v.subscriptionId), "dunning"] });
		},
	});
};

export const useForceSubscriptionStatus = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
			api.put(`/admin/billing/subscriptions/${id}/status`, { status, reason }),
		onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: k.sub(v.id) }),
	});
};
