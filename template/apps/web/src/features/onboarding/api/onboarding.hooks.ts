import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export type OnboardingMode = "CONCIERGE" | "SELF_SERVICE" | "HYBRID";
export type OnboardingTaskStatus = "ACTIVE" | "COMPLETED" | "BLOCKED" | "CANCELLED";
export type OnboardingStepStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "FAILED";

export interface OnboardingProgress {
	total: number;
	completed: number;
	currentStepKey: string | null;
	percent: number;
}

export interface OnboardingStep {
	id: string;
	stepKey: string;
	stepOrder: number;
	title: string;
	description: string | null;
	category: string;
	assigneeType: "TENANT" | "STAFF";
	canBeSelfService: boolean;
	status: OnboardingStepStatus;
	startedAt: string | null;
	completedAt: string | null;
	completedByUserId: string | null;
	notes: string | null;
	blocked: boolean;
	blockedReason: string | null;
}

export interface OnboardingActivity {
	id: string;
	type: string;
	message: string;
	userId: string | null;
	createdAt: string;
}

export interface OnboardingTask {
	id: string;
	organizationId: string;
	templateKey: string;
	mode: OnboardingMode;
	status: OnboardingTaskStatus;
	currentStepKey: string | null;
	assignedToUserId: string | null;
	contactName: string;
	contactPhone: string;
	contactEmail: string;
	startedAt: string;
	completedAt: string | null;
	blockedReason: string | null;
	organization?: { id: string; name: string; slug: string | null; createdAt: string };
	assignedTo?: { id: string; name: string; email: string; image: string | null } | null;
	steps: OnboardingStep[];
	activities: OnboardingActivity[];
	progress: OnboardingProgress;
}

export interface OnboardingTemplate {
	id: string;
	key: string;
	name: string;
	description: string | null;
	vertical: string;
	estimatedDays: number;
	stepDefinitions: OnboardingStep[];
	createdByPack: string | null;
	isActive: boolean;
}

export interface OnboardingSummary {
	active: number;
	blocked: number;
	completedThisMonth: number;
	stale: number;
}

export interface PaginatedOnboardingTasks {
	data: OnboardingTask[];
	meta: { page: number; limit: number; total: number; totalPages: number };
	summary: OnboardingSummary;
}

export type TenantOnboarding =
	| OnboardingTask
	| {
			task: null;
			defaultTemplate: {
				key: string;
				name: string;
				steps: OnboardingStep[];
			};
	  };

export const onboardingKeys = {
	all: ["onboarding"] as const,
	tenant: () => [...onboardingKeys.all, "tenant"] as const,
	admin: () => [...onboardingKeys.all, "admin"] as const,
	adminList: (params: Record<string, unknown>) => [...onboardingKeys.admin(), "list", params] as const,
	adminDetail: (id: string) => [...onboardingKeys.admin(), "detail", id] as const,
	templates: () => [...onboardingKeys.admin(), "templates"] as const,
};

export const useTenantOnboarding = () =>
	useQuery({
		queryKey: onboardingKeys.tenant(),
		queryFn: () => api.get<{ data: TenantOnboarding }>("/onboarding"),
		select: (res) => res.data,
	});

export const useCompleteTenantOnboardingStep = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ stepKey, notes }: { stepKey: string; notes?: string }) =>
			api.post<{ data: OnboardingTask }>(`/onboarding/steps/${stepKey}/complete`, { notes }),
		onSuccess: () => qc.invalidateQueries({ queryKey: onboardingKeys.tenant() }),
		meta: { successMessage: "Onboarding step completed" },
	});
};

export const useAdminOnboardingTasks = (params: {
	status?: OnboardingTaskStatus;
	mode?: OnboardingMode;
	templateKey?: string;
	vertical?: string;
	page?: number;
	limit?: number;
	search?: string;
	sort?: string;
}) =>
	useQuery({
		queryKey: onboardingKeys.adminList(params),
		queryFn: () => api.get<PaginatedOnboardingTasks>("/admin/onboarding", { params }),
	});

export const useAdminOnboardingTask = (id: string) =>
	useQuery({
		queryKey: onboardingKeys.adminDetail(id),
		queryFn: () => api.get<{ data: OnboardingTask }>(`/admin/onboarding/${id}`),
		select: (res) => res.data,
		enabled: !!id,
	});

export const useOnboardingTemplates = () =>
	useQuery({
		queryKey: onboardingKeys.templates(),
		queryFn: () => api.get<{ data: OnboardingTemplate[] }>("/admin/onboarding/templates"),
		select: (res) => res.data,
	});

export const useCreateOnboardingTask = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (dto: {
			organizationId: string;
			templateKey: string;
			mode: OnboardingMode;
			contactName: string;
			contactPhone: string;
			contactEmail: string;
			assignedToUserId?: string;
		}) => api.post<{ data: OnboardingTask }>("/admin/onboarding", dto),
		onSuccess: () => qc.invalidateQueries({ queryKey: onboardingKeys.admin() }),
		meta: { successMessage: "Onboarding task created" },
	});
};

export const useCompleteAdminOnboardingStep = (taskId: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ stepKey, notes }: { stepKey: string; notes?: string }) =>
			api.post<{ data: OnboardingTask }>(`/admin/onboarding/${taskId}/steps/${stepKey}/complete`, { notes }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: onboardingKeys.adminDetail(taskId) });
			qc.invalidateQueries({ queryKey: onboardingKeys.admin() });
		},
		meta: { successMessage: "Onboarding step completed" },
	});
};

export const useAssignOnboardingTask = (taskId: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (assignedToUserId: string | null) =>
			api.patch<{ data: OnboardingTask }>(`/admin/onboarding/${taskId}/assignment`, { assignedToUserId }),
		onSuccess: () => qc.invalidateQueries({ queryKey: onboardingKeys.adminDetail(taskId) }),
		meta: { successMessage: "Assignment updated" },
	});
};

export const useBlockOnboardingTask = (taskId: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (reason: string) => api.post<{ data: OnboardingTask }>(`/admin/onboarding/${taskId}/block`, { reason }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: onboardingKeys.adminDetail(taskId) });
			qc.invalidateQueries({ queryKey: onboardingKeys.admin() });
		},
		meta: { successMessage: "Onboarding task blocked" },
	});
};

export const useCancelOnboardingTask = (taskId: string) => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => api.post<{ data: OnboardingTask }>(`/admin/onboarding/${taskId}/cancel`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: onboardingKeys.adminDetail(taskId) });
			qc.invalidateQueries({ queryKey: onboardingKeys.admin() });
		},
		meta: { successMessage: "Onboarding task cancelled" },
	});
};
