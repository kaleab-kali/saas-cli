import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Button } from "@/components/ui/button";

interface SessionShape {
	session: { impersonatedBy: string | null; expiresAt: string } | null;
	user: { email: string; name: string } | null;
}

/**
 * Red persistent banner shown only when session.impersonatedBy is set (Better Auth admin plugin).
 * Exit impersonation calls /api/auth/admin/stop-impersonating which restores the admin's original session.
 */
export const ImpersonationBanner = React.memo(
	() => {
		const { data } = useQuery({
			queryKey: ["tenant-session"],
			queryFn: async () => {
				const r = await fetch("/api/auth/get-session", { credentials: "include" });
				if (!r.ok) return null;
				return (await r.json()) as SessionShape;
			},
			staleTime: 30_000,
			retry: false,
		});
		const impersonatedBy = data?.session?.impersonatedBy;
		if (!impersonatedBy) return null;

		const handleStop = async () => {
			await fetch("/api/auth/admin/stop-impersonating", {
				method: "POST",
				credentials: "include",
				headers: { "content-type": "application/json" },
				body: "{}",
			});
			window.location.href = "/admin";
		};

		const expiresAt = data?.session?.expiresAt ? new Date(data.session.expiresAt) : null;
		const minsLeft = expiresAt ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60_000)) : null;

		return (
			<div className="sticky top-0 z-[90] w-full bg-red-600 text-white px-4 py-2 text-sm flex items-center justify-between gap-3 shadow-md">
				<div className="flex items-center gap-3 flex-wrap">
					<span className="font-semibold">🔴 IMPERSONATING</span>
					<span>
						You're signed in as <strong>{data?.user?.email}</strong>. All actions audited.
					</span>
					{minsLeft !== null && <span className="text-white/80 text-xs">Session ends in {minsLeft} min</span>}
				</div>
				<Button variant="secondary" size="sm" onClick={handleStop}>
					End impersonation
				</Button>
			</div>
		);
	},
	() => true,
);
ImpersonationBanner.displayName = "ImpersonationBanner";
