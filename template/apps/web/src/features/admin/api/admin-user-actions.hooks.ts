import { useMutation } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

/** Full-page GET navigation — backend 302-redirects with impersonation session cookie set. */
export const impersonateUrl = (userId: string) => `/api/v1/admin/users/${userId}/impersonate`;

export const useForcePasswordReset = () =>
	useMutation({
		mutationFn: (userId: string) => api.post(`/admin/users/${userId}/force-password-reset`, {}),
	});
