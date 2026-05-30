export interface PlatformStats {
	totalOrganizations: number;
	totalUsers: number;
	newOrgsLast7Days: number;
	newUsersLast7Days: number;
	activeSessionsLast24h: number;
	orgsByMemberCount: { orgName: string; memberCount: number }[];
}

export interface OrgListItem {
	id: string;
	name: string;
	slug: string | null;
	logo: string | null;
	createdAt: string;
	memberCount: number;
	ownerEmail: string | null;
}

export interface OrgDetail {
	id: string;
	name: string;
	slug: string | null;
	logo: string | null;
	metadata: string | null;
	createdAt: string;
	suspendedAt: string | null;
	suspendReason: string | null;
	members: OrgMember[];
	subscription: {
		id: string;
		status: string;
		billingInterval: string;
		currency: string;
		currentPeriodEnd: string;
		plan: { slug: string; nameEn: string };
	} | null;
	usage: { userCount: number; apiCallCount: number; emailCount: number; metricsJson: unknown } | null;
	stats: {
		memberCount: number;
		invitationCount: number;
		apiKeyCount: number;
		savedReportCount: number;
		notificationCount: number;
		auditLogCount: number;
	};
}

export interface OrgMember {
	id: string;
	userId: string;
	role: string;
	createdAt: string;
	user: { id: string; name: string; email: string };
}

export interface PlatformUser {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	createdAt: string;
	organizations: { id: string; name: string; role: string }[];
}

export interface AuditLogEntry {
	id: string;
	action: string;
	performedBy: string;
	targetType: string;
	targetId: string;
	details: unknown;
	ipAddress: string | null;
	createdAt: string;
}

export interface PaginatedResponse<T> {
	data: T[];
	meta: { total: number; page: number; limit: number; totalPages: number };
}
