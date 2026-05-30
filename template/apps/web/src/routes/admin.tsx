import { createFileRoute, Outlet } from "@tanstack/react-router";
import React from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { useAdminSession } from "#features/admin/api/admin-auth";
import { AdminLanguageSwitcher } from "#shared/components/AdminLanguageSwitcher";
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
			<div className="border-b border-border bg-destructive/5 px-6 py-2 flex items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2">
					<SidebarTrigger />
					<p className="min-w-0 text-xs font-medium text-destructive">
						{t("admin.superAdminBanner", {
							defaultValue: "SUPER ADMIN MODE — You are viewing platform-level data across all organizations",
						})}
					</p>
				</div>
				<AdminLanguageSwitcher />
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
					<main className="flex-1 p-6">
						<Outlet />
					</main>
				</SidebarInset>
			</SidebarProvider>
		</I18nextProvider>
	);
}
