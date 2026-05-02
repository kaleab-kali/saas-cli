import { useQuery } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface LifecycleSnapshot {
	status: "active" | "trialing" | "past_due" | "grace" | "read_only" | "locked" | "canceled" | "suspended";
	periodEnd: string;
	gracePeriodEndsAt: string | null;
	readOnlyModeEndsAt: string | null;
	lockedAt: string | null;
	daysUntilReadOnly: number | null;
	daysUntilLocked: number | null;
	daysExpired: number;
	isWriteBlocked: boolean;
	isFullyLocked: boolean;
}

export interface TenantBillingSnapshot {
	readonly subscription: {
		id: string;
		status: string;
		billingInterval: string;
		currentPeriodStart: string;
		currentPeriodEnd: string;
	} | null;
	readonly lifecycle: LifecycleSnapshot | null;
	readonly entitlements: Record<string, { enabled: boolean; limit: number | null }>;
}

const key = ["billing", "tenant-snapshot"] as const;

export const useTenantBillingSnapshot = () =>
	useQuery({
		queryKey: key,
		queryFn: () => api.get<{ data: TenantBillingSnapshot }>("/billing/me"),
		select: (r) => r.data,
		staleTime: 60_000,
		retry: false,
	});
