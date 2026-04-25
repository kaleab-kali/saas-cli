import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import React from "react";
import { ImpersonationBanner } from "#features/billing/components/ImpersonationBanner";
import { SubscriptionGate } from "#features/billing/components/SubscriptionGate";
import { authClient } from "#shared/lib/auth-client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated")({
	component: AuthenticatedLayout,
});

const LoadingScreen = React.memo(
	() => (
		<div className="flex min-h-screen items-center justify-center">
			<div className="space-y-4 w-64">
				<Skeleton className="h-8 w-48 mx-auto" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-3/4" />
			</div>
		</div>
	),
	() => true,
);
LoadingScreen.displayName = "LoadingScreen";

function AuthenticatedLayout() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();
	const { data: orgs } = authClient.useListOrganizations();
	const [settingOrg, setSettingOrg] = React.useState(false);

	React.useEffect(() => {
		if (!isPending && !session) {
			navigate({ to: "/login" });
		}
	}, [isPending, session, navigate]);

	React.useEffect(() => {
		if (!session || settingOrg) return;
		if (session.session.activeOrganizationId) return;

		if (orgs && orgs.length > 0) {
			setSettingOrg(true);
			authClient.organization.setActive({ organizationId: orgs[0].id }).then(() => {
				window.location.reload();
			});
		} else if (orgs && orgs.length === 0) {
			navigate({ to: "/create-org" });
		}
	}, [session, orgs, navigate, settingOrg]);

	if (isPending || !session || !session.session.activeOrganizationId) {
		return <LoadingScreen />;
	}

	return (
		<SubscriptionGate>
			<ImpersonationBanner />
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset className="min-w-0 overflow-x-hidden">
					<TopBar />
					<main className="flex-1 p-6 min-w-0">
						<Outlet />
					</main>
				</SidebarInset>
			</SidebarProvider>
		</SubscriptionGate>
	);
}
