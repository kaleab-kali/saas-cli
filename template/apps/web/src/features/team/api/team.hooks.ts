import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export type TeamRole = "owner" | "admin" | "member" | "viewer";

export interface TeamMember {
	id: string;
	organizationId: string;
	userId: string;
	role: TeamRole;
	createdAt: string;
	user: {
		id: string;
		name: string;
		email: string;
		image: string | null;
	};
}

export interface TeamInvitation {
	id: string;
	organizationId: string;
	email: string;
	role: TeamRole | null;
	status: "pending" | "accepted" | "cancelled" | string;
	expiresAt: string;
	inviterId: string;
	createdAt: string;
	acceptUrl?: string;
}

export const teamKeys = {
	all: ["team"] as const,
	members: () => [...teamKeys.all, "members"] as const,
	invitations: () => [...teamKeys.all, "invitations"] as const,
};

export const useTeamMembers = () =>
	useQuery({
		queryKey: teamKeys.members(),
		queryFn: () => api.get<{ data: TeamMember[] }>("/team/members"),
		select: (r) => r.data,
	});

export const useTeamInvitations = () =>
	useQuery({
		queryKey: teamKeys.invitations(),
		queryFn: () => api.get<{ data: TeamInvitation[] }>("/team/invitations"),
		select: (r) => r.data,
	});

export const useInviteMember = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: { email: string; role: TeamRole }) =>
			api.post<{ data: TeamInvitation }>("/team/invitations", body),
		onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.all }),
	});
};

export const useCancelInvitation = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/team/invitations/${id}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.all }),
	});
};

export const useUpdateMemberRole = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, role }: { id: string; role: TeamRole }) => api.patch(`/team/members/${id}`, { role }),
		onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.all }),
	});
};

export const useRemoveMember = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/team/members/${id}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.all }),
	});
};

export const useAcceptInvitation = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.post(`/team/invitations/${id}/accept`, {}),
		onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.all }),
	});
};
