import {
	Building06Icon,
	ChartLineData02Icon,
	Configuration01Icon,
	ContactBookIcon,
	DashboardSquare01Icon,
	FileAttachmentIcon,
	Home02Icon,
	Invoice01Icon,
	Megaphone01Icon,
	Settings02Icon,
	StoreLocation02Icon,
	TaskDaily02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useLocation, useMatchRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { OrgSwitcher } from "#shared/components/OrgSwitcher";
import { UserMenu } from "#shared/components/UserMenu";
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
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";

// Definitions use translation keys rather than English literals. `t(key)` resolves at render.
interface NavChild {
	readonly labelKey: string;
	readonly to: string;
}
interface NavItemDef {
	readonly labelKey: string;
	readonly to: string;
	readonly icon: typeof DashboardSquare01Icon;
	readonly children?: readonly NavChild[];
}

const NAV_ITEMS: readonly NavItemDef[] = [
	{
		labelKey: "sidebar.reports",
		to: "/reports",
		icon: ChartLineData02Icon,
		children: [
			{ labelKey: "sidebar.mainDashboard", to: "/reports/dashboard/main" },
			{ labelKey: "sidebar.savedReports", to: "/reports/saved" },
			{ labelKey: "sidebar.newCustomReport", to: "/reports/new" },
			{ labelKey: "sidebar.schedules", to: "/reports/schedules" },
		],
	},
	{
		labelKey: "sidebar.notifications",
		to: "/notifications",
		icon: Megaphone01Icon,
		children: [
			{ labelKey: "sidebar.inbox", to: "/notifications" },
			{ labelKey: "sidebar.preferences", to: "/notifications/preferences" },
			{ labelKey: "sidebar.templates", to: "/notifications/templates" },
			{ labelKey: "sidebar.emailDeliveries", to: "/notifications/deliveries" },
		],
	},
] as const;

const SETTINGS_ITEM = { labelKey: "sidebar.settings", to: "/settings", icon: Settings02Icon } as const;

const NavItem = React.memo(
	({
		item,
		isActive,
		pathname,
	}: {
		readonly item: NavItemDef;
		readonly isActive: boolean;
		readonly pathname: string;
	}) => {
		const { t } = useTranslation();
		const hasChildren = !!item.children && item.children.length > 0;
		const [open, setOpen] = React.useState(isActive);
		const label = t(item.labelKey);

		React.useEffect(() => {
			if (isActive) setOpen(true);
		}, [isActive]);

		const toggle = React.useCallback(() => setOpen((o) => !o), []);

		if (!hasChildren) {
			return (
				<SidebarMenuItem>
					<SidebarMenuButton asChild isActive={isActive} tooltip={label}>
						<Link to={item.to}>
							<HugeiconsIcon icon={item.icon} size={18} />
							<span>{label}</span>
						</Link>
					</SidebarMenuButton>
				</SidebarMenuItem>
			);
		}

		return (
			<SidebarMenuItem>
				<SidebarMenuButton onClick={toggle} isActive={isActive} tooltip={label} className="justify-between">
					<span className="flex items-center gap-2">
						<HugeiconsIcon icon={item.icon} size={18} />
						<span>{label}</span>
					</span>
					<span className={`text-xs transition-transform ${open ? "rotate-90" : ""}`}>›</span>
				</SidebarMenuButton>
				{open && item.children && (
					<SidebarMenuSub>
						{item.children.map((child) => {
							const normalized = pathname.replace(/\/$/, "") || "/";
							const childPath = child.to.replace(/\/$/, "") || "/";
							const childActive = normalized === childPath;
							return (
								<SidebarMenuSubItem key={child.to}>
									<SidebarMenuSubButton asChild isActive={childActive}>
										<Link to={child.to}>{t(child.labelKey)}</Link>
									</SidebarMenuSubButton>
								</SidebarMenuSubItem>
							);
						})}
					</SidebarMenuSub>
				)}
			</SidebarMenuItem>
		);
	},
	(prev, next) => prev.isActive === next.isActive && prev.item.to === next.item.to && prev.pathname === next.pathname,
);
NavItem.displayName = "NavItem";

export const AppSidebar = React.memo(() => {
	const { t } = useTranslation();
	const matchRoute = useMatchRoute();
	const location = useLocation();
	const settingsLabel = t(SETTINGS_ITEM.labelKey);

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader className="border-b border-sidebar-border">
				<div className="flex items-center gap-2 px-2 py-1">
					<HugeiconsIcon icon={Home02Icon} size={20} className="shrink-0" />
					<span className="font-semibold text-base group-data-[collapsible=icon]:hidden">PropFlow</span>
				</div>
				<OrgSwitcher />
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>{t("sidebar.workspace")}</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{NAV_ITEMS.map((item) => (
								<NavItem
									key={item.to}
									item={item}
									pathname={location.pathname}
									isActive={!!matchRoute({ to: item.to, fuzzy: true })}
								/>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="border-t border-sidebar-border">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							isActive={!!matchRoute({ to: SETTINGS_ITEM.to, fuzzy: true })}
							tooltip={settingsLabel}
						>
							<Link to={SETTINGS_ITEM.to}>
								<HugeiconsIcon icon={SETTINGS_ITEM.icon} size={18} />
								<span>{settingsLabel}</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
				<UserMenu />
			</SidebarFooter>
		</Sidebar>
	);
});
AppSidebar.displayName = "AppSidebar";
