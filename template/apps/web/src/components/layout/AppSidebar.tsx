import ChartLineData02Icon from "@hugeicons/core-free-icons/ChartLineData02Icon";
import DashboardSquare01Icon from "@hugeicons/core-free-icons/DashboardSquare01Icon";
import Home02Icon from "@hugeicons/core-free-icons/Home02Icon";
import Megaphone01Icon from "@hugeicons/core-free-icons/Megaphone01Icon";
import Settings02Icon from "@hugeicons/core-free-icons/Settings02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useLocation, useMatchRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { type FeatureKey, useCapabilities } from "#features/capabilities/api/capabilities.hooks";
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
	useSidebar,
} from "@/components/ui/sidebar";

// Definitions use translation keys rather than English literals. `t(key)` resolves at render.
interface NavChild {
	readonly labelKey: string;
	readonly to: string;
	readonly featureKey?: FeatureKey;
}
interface NavItemDef {
	readonly labelKey: string;
	readonly to: string;
	readonly icon: typeof DashboardSquare01Icon;
	readonly featureKey?: FeatureKey;
	readonly children?: readonly NavChild[];
}

const NAV_ITEMS: readonly NavItemDef[] = [
	{
		labelKey: "sidebar.onboarding",
		to: "/onboarding",
		icon: DashboardSquare01Icon,
	},
	{
		labelKey: "sidebar.files",
		to: "/files",
		icon: DashboardSquare01Icon,
		featureKey: "platform.file-upload",
	},
	{
		labelKey: "sidebar.reports",
		to: "/reports",
		icon: ChartLineData02Icon,
		children: [
			{ labelKey: "sidebar.mainDashboard", to: "/reports/dashboard/main" },
			{ labelKey: "sidebar.savedReports", to: "/reports/saved" },
			{ labelKey: "sidebar.newCustomReport", to: "/reports/new", featureKey: "reporting.custom-report-builder" },
			{ labelKey: "sidebar.schedules", to: "/reports/schedules", featureKey: "reporting.schedule-delivery" },
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
const APP_NAME = import.meta.env.VITE_APP_NAME ?? "SaaS";

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
		const { isMobile, setOpenMobile } = useSidebar();
		const hasChildren = !!item.children && item.children.length > 0;
		const forceOpen = false;
		const [open, setOpen] = React.useState(isActive || forceOpen);
		const label = t(item.labelKey);

		React.useEffect(() => {
			if (isActive) setOpen(true);
		}, [isActive]);

		const toggle = React.useCallback(() => setOpen((o) => !o), []);
		const closeMobileSidebar = React.useCallback(() => {
			if (isMobile) setOpenMobile(false);
		}, [isMobile, setOpenMobile]);

		if (!hasChildren) {
			return (
				<SidebarMenuItem>
					<SidebarMenuButton asChild isActive={isActive} tooltip={label}>
						<Link to={item.to} onClick={closeMobileSidebar}>
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
					<span className={`text-xs transition-transform ${open ? "rotate-90" : ""}`}>{">"}</span>
				</SidebarMenuButton>
				{(open || forceOpen) && item.children && (
					<ul className="mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5">
						{item.children.map((child) => {
							const normalized = pathname.replace(/\/$/, "") || "/";
							const childPath = child.to.replace(/\/$/, "") || "/";
							const childActive = normalized === childPath;
							return (
								<li key={child.to}>
									<Link
										to={child.to}
										onClick={closeMobileSidebar}
										className={`flex h-7 min-w-0 items-center rounded-md px-3 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
											childActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
										}`}
									>
										{t(child.labelKey)}
									</Link>
								</li>
							);
						})}
					</ul>
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
	const { data: capabilities } = useCapabilities();
	const navItems = React.useMemo(() => {
		const isVisible = (featureKey?: FeatureKey) => !featureKey || !capabilities || capabilities[featureKey]?.enabled;
		return NAV_ITEMS.map((item) => ({
			...item,
			children: item.children?.filter((child) => isVisible(child.featureKey)),
		})).filter((item) => isVisible(item.featureKey) && (!item.children || item.children.length > 0));
	}, [capabilities]);

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader className="border-b border-sidebar-border p-2">
				<div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/60 px-2.5 py-2">
					<div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
						<HugeiconsIcon icon={Home02Icon} size={18} />
					</div>
					<div className="min-w-0 group-data-[collapsible=icon]:hidden">
						<div className="truncate text-sm font-semibold">{APP_NAME}</div>
						<div className="truncate text-xs text-sidebar-foreground/60">Tenant console</div>
					</div>
				</div>
				<OrgSwitcher />
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>{t("sidebar.workspace")}</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{navItems.map((item) => (
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
				<SidebarGroup className="group-data-[collapsible=icon]:hidden">
					<SidebarGroupLabel>Setup status</SidebarGroupLabel>
					<SidebarGroupContent>
						<div className="mx-2 rounded-lg border border-sidebar-border bg-sidebar-accent/45 p-3 text-xs">
							<div className="font-medium text-sidebar-foreground">Onboarding active</div>
							<div className="mt-1 text-sidebar-foreground/62">Finish setup first, then add vertical modules.</div>
						</div>
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
