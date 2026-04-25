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
} from "@/components/ui/sidebar";

const ADMIN_NAV = [
	{ label: "Overview", to: "/admin", icon: DashboardSquare01Icon },
	{ label: "Organizations", to: "/admin/organizations", icon: Building06Icon },
	{ label: "Users", to: "/admin/users", icon: UserMultipleIcon },
	{ label: "Plans", to: "/admin/plans", icon: PackageIcon },
	{ label: "Billing", to: "/admin/billing", icon: CreditCardIcon },
	{ label: "Feature Flags", to: "/admin/feature-flags", icon: FlagIcon },
	{ label: "Email Templates", to: "/admin/system-templates", icon: Mail01Icon },
	{ label: "Jobs", to: "/admin/jobs", icon: Timer02Icon },
	{ label: "Audit Logs", to: "/admin/audit-logs", icon: FileValidationIcon },
	{ label: "Settings", to: "/admin/settings", icon: Settings02Icon },
] as const;

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
	}) => (
		<SidebarMenuItem>
			<SidebarMenuButton asChild isActive={isActive} tooltip={label}>
				<Link to={to}>
					<HugeiconsIcon icon={icon} size={18} />
					<span>{label}</span>
				</Link>
			</SidebarMenuButton>
		</SidebarMenuItem>
	),
	(prev, next) => prev.isActive === next.isActive && prev.to === next.to,
);
AdminNavItem.displayName = "AdminNavItem";

const AdminUserMenu = React.memo(
	() => {
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
						Sign out
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
		const matchRoute = useMatchRoute();

		return (
			<Sidebar collapsible="icon">
				<SidebarHeader className="border-b border-sidebar-border">
					<SidebarMenuButton size="lg" className="w-full cursor-default">
						<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
							<HugeiconsIcon icon={AiSecurity01Icon} size={16} />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold">PropFlow Admin</span>
							<span className="truncate text-xs text-muted-foreground">Platform Management</span>
						</div>
					</SidebarMenuButton>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Administration</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{ADMIN_NAV.map((item) => (
									<AdminNavItem
										key={item.to}
										label={item.label}
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
