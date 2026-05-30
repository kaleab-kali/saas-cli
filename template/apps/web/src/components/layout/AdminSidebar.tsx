import {
	AiSecurity01Icon,
	Building06Icon,
	CreditCardIcon,
	DashboardSquare01Icon,
	FileValidationIcon,
	FlagIcon,
	Logout01Icon,
	Mail01Icon,
	PackageIcon,
	Settings02Icon,
	Timer02Icon,
	UserIcon,
	UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useMatchRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { adminSignOut, useAdminSession } from "#features/admin/api/admin-auth";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";

const ADMIN_NAV = [
	{ labelKey: "admin.nav.overview", to: "/admin", icon: DashboardSquare01Icon },
	{ labelKey: "admin.nav.organizations", to: "/admin/organizations", icon: Building06Icon },
	{ labelKey: "admin.nav.onboarding", to: "/admin/onboarding", icon: Timer02Icon },
	{ labelKey: "admin.nav.users", to: "/admin/users", icon: UserMultipleIcon },
	{ labelKey: "admin.nav.plans", to: "/admin/plans", icon: PackageIcon },
	{ labelKey: "admin.nav.billing", to: "/admin/billing", icon: CreditCardIcon },
	{ labelKey: "admin.nav.featureFlags", to: "/admin/feature-flags", icon: FlagIcon },
	{ labelKey: "admin.nav.emailTemplates", to: "/admin/system-templates", icon: Mail01Icon },
	{ labelKey: "admin.nav.jobs", to: "/admin/jobs", icon: Timer02Icon },
	{ labelKey: "admin.nav.server", to: "/admin/server", icon: Settings02Icon },
	{ labelKey: "admin.nav.auditLogs", to: "/admin/audit-logs", icon: FileValidationIcon },
	{ labelKey: "admin.nav.settings", to: "/admin/settings", icon: Settings02Icon },
] as const;
const ADMIN_EIMS_NAV = [
	{ labelKey: "admin.nav.eimsOverview", to: "/admin/eims", icon: FileValidationIcon },
	{ labelKey: "admin.nav.eimsTenants", to: "/admin/eims/tenants", icon: Building06Icon },
	{ labelKey: "admin.nav.eimsFailures", to: "/admin/eims/failures", icon: FileValidationIcon },
	{ labelKey: "admin.nav.eimsCertificates", to: "/admin/eims/certificates", icon: AiSecurity01Icon },
	{ labelKey: "admin.nav.eimsResources", to: "/admin/eims/resources", icon: Timer02Icon },
	{ labelKey: "admin.nav.eimsCompliance", to: "/admin/eims/compliance", icon: FileValidationIcon },
] as const;
const APP_NAME = import.meta.env.VITE_APP_NAME ?? "SaaS";

const AdminNavItem = React.memo(
	({
		label,
		to,
		icon,
		isActive,
	}: {
		readonly label: string;
		readonly to: string;
		readonly icon: typeof DashboardSquare01Icon;
		readonly isActive: boolean;
	}) => {
		const { isMobile, setOpenMobile } = useSidebar();
		const closeMobileSidebar = React.useCallback(() => {
			if (isMobile) setOpenMobile(false);
		}, [isMobile, setOpenMobile]);
		return (
			<SidebarMenuItem>
				<SidebarMenuButton asChild isActive={isActive} tooltip={label}>
					<Link to={to} onClick={closeMobileSidebar}>
						<HugeiconsIcon icon={icon} size={18} />
						<span>{label}</span>
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	},
	(prev, next) => prev.isActive === next.isActive && prev.to === next.to && prev.label === next.label,
);
AdminNavItem.displayName = "AdminNavItem";

const AdminUserMenu = React.memo(
	() => {
		const { t } = useTranslation();
		const { data: session } = useAdminSession();
		const adminUser = session?.user;

		const handleLogout = React.useCallback(async () => {
			await adminSignOut();
			window.location.href = "/admin-login";
		}, []);

		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<SidebarMenuButton size="lg" className="w-full">
						<div className="flex aspect-square size-8 items-center justify-center rounded-full bg-destructive/10">
							<HugeiconsIcon icon={UserIcon} size={16} className="text-destructive" />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold">{adminUser?.name || "Admin"}</span>
							<span className="truncate text-xs text-muted-foreground">{adminUser?.email || ""}</span>
						</div>
					</SidebarMenuButton>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56" align="start">
					<DropdownMenuLabel>{adminUser?.name || "Admin"}</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={handleLogout}>
						<HugeiconsIcon icon={Logout01Icon} size={16} className="mr-2" />
						{t("admin.nav.signOut")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	},
	() => true,
);
AdminUserMenu.displayName = "AdminUserMenu";

export const AdminSidebar = React.memo(
	() => {
		const { t } = useTranslation();
		const matchRoute = useMatchRoute();

		return (
			<Sidebar collapsible="icon">
				<SidebarHeader className="border-b border-sidebar-border">
					<SidebarMenuButton size="lg" className="w-full cursor-default">
						<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
							<HugeiconsIcon icon={AiSecurity01Icon} size={16} />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold">{APP_NAME} Admin</span>
							<span className="truncate text-xs text-muted-foreground">{t("admin.nav.platformManagement")}</span>
						</div>
					</SidebarMenuButton>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>{t("admin.nav.groupAdministration")}</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{ADMIN_NAV.map((item) => (
									<AdminNavItem
										key={item.to}
										label={t(item.labelKey)}
										to={item.to}
										icon={item.icon}
										isActive={
											item.to === "/admin" ? !!matchRoute({ to: "/admin" }) : !!matchRoute({ to: item.to, fuzzy: true })
										}
									/>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					<SidebarGroup>
						<SidebarGroupLabel>{t("admin.nav.eimsOperations")}</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{ADMIN_EIMS_NAV.map((item) => (
									<AdminNavItem
										key={item.to}
										label={t(item.labelKey)}
										to={item.to}
										icon={item.icon}
										isActive={
											item.to === "/admin/eims"
												? !!matchRoute({ to: "/admin/eims" })
												: !!matchRoute({ to: item.to, fuzzy: true })
										}
									/>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter className="border-t border-sidebar-border">
					<AdminUserMenu />
				</SidebarFooter>
			</Sidebar>
		);
	},
	() => true,
);
AdminSidebar.displayName = "AdminSidebar";
