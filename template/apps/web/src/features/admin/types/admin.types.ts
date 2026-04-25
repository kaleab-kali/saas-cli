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
	stats: { memberCount: number; invitationCount: number };
}

export interface OrgMember {
	id: string;
	userId: string;
	role: string;
	createdAt: string;
	user: { id: string; name: string; email: string };
}

export interface OrgBuilding {
	id: string;
	name: string;
	type: string;
	address: string;
	createdAt: string;
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
