import { createFileRoute, Outlet } from "@tanstack/react-router";
import React from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { useAdminSession } from "#features/admin/api/admin-auth";
import { AdminLanguageSwitcher } from "#shared/components/AdminLanguageSwitcher";
import { ADMIN_COMMANDS, CommandPalette } from "#shared/components/CommandPalette";
import { i18nAdmin } from "#shared/i18n/config-admin";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin")({
	component: AdminLayout,
});

const AdminLoadingScreen = React.memo(
	() => (
		<div className="flex min-h-screen items-center justify-center">
			<div className="space-y-4 w-64">
				<Skeleton className="h-8 w-48 mx-auto" />
				<Skeleton className="h-4 w-full" />
			</div>
		</div>
	),
	() => true,
);
AdminLoadingScreen.displayName = "AdminLoadingScreen";

const AccessDenied = React.memo(
	() => (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center space-y-4">
				<h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
				<p className="text-muted-foreground">Admin authentication required.</p>
				<a href="/admin-login" className="text-primary underline">
					Go to Admin Login
				</a>
			</div>
		</div>
	),
	() => true,
);
AccessDenied.displayName = "AccessDenied";

const AdminTopBanner = React.memo(
	() => {
		const { t } = useTranslation();
		return (
			<div className="flex items-center justify-between gap-3 border-b border-border bg-background/92 px-4 py-3 shadow-[0_1px_0_rgba(17,19,15,0.02)] backdrop-blur sm:px-6">
				<div className="flex min-w-0 items-center gap-2">
					<SidebarTrigger />
					<p className="min-w-0 text-xs font-medium text-destructive sm:text-sm">
						{t("admin.superAdminBanner", {
							defaultValue: "SUPER ADMIN MODE - platform-level data across all organizations",
						})}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<CommandPalette
						commands={ADMIN_COMMANDS}
						buttonLabel="Admin command"
						description="Search platform routes, operations queues, and admin actions."
					/>
					<AdminLanguageSwitcher />
				</div>
			</div>
		);
	},
	() => true,
);
AdminTopBanner.displayName = "AdminTopBanner";

function AdminLayout() {
	const { data: session, isPending, isError } = useAdminSession();

	if (isPending) {
		return <AdminLoadingScreen />;
	}

	if (isError || !session?.user) {
		return <AccessDenied />;
	}

	return (
		<I18nextProvider i18n={i18nAdmin}>
			<SidebarProvider>
				<AdminSidebar />
				<SidebarInset>
					<AdminTopBanner />
					<main className="flex-1 bg-[#f8f8f4] p-4 sm:p-6 lg:p-8">
						<div className="mx-auto w-full max-w-[1500px]">
							<Outlet />
						</div>
					</main>
				</SidebarInset>
			</SidebarProvider>
		</I18nextProvider>
	);
}
