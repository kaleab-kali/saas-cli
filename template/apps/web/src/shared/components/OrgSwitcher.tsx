import Building06Icon from "@hugeicons/core-free-icons/Building06Icon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import Sorting01Icon from "@hugeicons/core-free-icons/Sorting01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "#shared/lib/auth-client";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export const OrgSwitcher = React.memo(
	() => {
		const { t } = useTranslation();
		const navigate = useNavigate();
		const queryClient = useQueryClient();
		const { data: orgs } = authClient.useListOrganizations();
		const { data: activeOrg } = authClient.useActiveOrganization();

		const handleSwitchOrg = React.useCallback(
			async (orgId: string) => {
				await authClient.organization.setActive({ organizationId: orgId });
				queryClient.invalidateQueries();
			},
			[queryClient],
		);

		const handleCreateOrg = React.useCallback(() => {
			navigate({ to: "/create-org" });
		}, [navigate]);

		const activeName = activeOrg?.name || t("common.selectOrganization");

		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<SidebarMenuButton size="lg" className="w-full">
						<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
							<HugeiconsIcon icon={Building06Icon} size={16} />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold">{activeName}</span>
							<span className="truncate text-xs text-muted-foreground">
								{t("common.currentTenant", { defaultValue: "Current tenant" })}
							</span>
						</div>
						<HugeiconsIcon icon={Sorting01Icon} size={16} className="ml-auto" />
					</SidebarMenuButton>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56" align="start">
					<DropdownMenuLabel>{t("common.organizationsLabel")}</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{orgs?.map((org) => (
						<DropdownMenuItem
							key={org.id}
							onClick={() => handleSwitchOrg(org.id)}
							className={org.id === activeOrg?.id ? "bg-accent" : ""}
						>
							<HugeiconsIcon icon={Building06Icon} size={16} className="mr-2" />
							{org.name}
						</DropdownMenuItem>
					))}
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={handleCreateOrg}>
						<HugeiconsIcon icon={PlusSignIcon} size={16} className="mr-2" />
						{t("common.createOrganization")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	},
	() => true,
);
OrgSwitcher.displayName = "OrgSwitcher";
