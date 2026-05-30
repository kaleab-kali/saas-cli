import { useQuery } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export type FeatureKey =
	| "core.access"
	| "platform.branding"
	| "platform.multi-currency"
	| "platform.custom-fields"
	| "platform.lookups"
	| "platform.api-keys"
	| "platform.api-requests-per-minute"
	| "platform.members"
	| "platform.file-upload"
	| "platform.file-count"
	| "platform.storage-bytes"
	| "platform.webhooks"
	| "platform.audit-retention-1year"
	| "platform.audit-export"
	| "platform.custom-roles"
	| "platform.force-2fa"
	| "platform.ip-allowlist"
	| "notifications.bulk-email"
	| "notifications.bulk-announcements"
	| "reporting.custom-report-builder"
	| "reporting.schedule-delivery"
	| "reporting.export-xlsx"
	| "reporting.export-pdf";

export interface Capability {
	key: FeatureKey;
	label: string;
	category: string;
	enabled: boolean;
	limit: number | null;
	used: number | null;
	remaining: number | null;
	reason: string;
}

export type CapabilityMap = Partial<Record<FeatureKey, Capability>>;

export const useCapabilities = () =>
	useQuery({
		queryKey: ["billing", "capabilities"],
		queryFn: () => api.get<{ data: CapabilityMap }>("/billing/capabilities"),
		select: (r) => r.data,
		staleTime: 60_000,
	});

export const useCapability = (featureKey: FeatureKey) => {
	const query = useCapabilities();
	const capability = query.data?.[featureKey] ?? null;
	return {
		...query,
		capability,
		enabled: capability?.enabled ?? false,
		hasCapacity: capability?.remaining === null || capability?.remaining === undefined || capability.remaining > 0,
	};
};
