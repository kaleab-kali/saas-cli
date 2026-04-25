import { useQuery } from "@tanstack/react-query";
import { createAuthClient } from "better-auth/react";
import { api } from "#shared/lib/api-client";

const adminBetterAuth = createAuthClient({
	baseURL: window.location.origin,
	basePath: "/api/admin-auth",
});

interface AdminMeResponse {
	data: {
		user: { id: string; email: string; name: string };
		session: { id: string; expiresAt: string };
	};
}

export const adminAuthApi = {
	login: async (email: string, password: string) => {
		const { error } = await adminBetterAuth.signIn.email({ email, password });
		if (error) throw new Error(error.message || "Invalid credentials");
	},

	logout: async () => {
		await adminBetterAuth.signOut();
	},

	me: () => api.get<AdminMeResponse>("/admin/auth/me"),
};

export const useAdminSession = () =>
	useQuery({
		queryKey: ["admin", "session"],
		queryFn: () => adminAuthApi.me(),
		select: (res) => ({ user: res.data.user, session: res.data.session }),
		retry: false,
		staleTime: 1000 * 60 * 5,
	});

export const adminSignOut = async () => {
	await adminAuthApi.logout();
};
