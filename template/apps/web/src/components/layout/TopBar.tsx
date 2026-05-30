import React from "react";
import { NotificationBell } from "#features/notifications/components/NotificationBell";
import { CommandPalette } from "#shared/components/CommandPalette";
import { LanguageSwitcher } from "#shared/components/LanguageSwitcher";
import { authClient } from "#shared/lib/auth-client";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const TopBar = React.memo(() => {
	const session = authClient.useSession();
	const userId = session.data?.user?.id ?? null;
	return (
		<header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 backdrop-blur px-4">
			<SidebarTrigger className="-ml-1" />
			<Separator orientation="vertical" className="h-5" />
			<div className="flex-1" />
			<CommandPalette />
			<LanguageSwitcher />
			<NotificationBell userId={userId} />
		</header>
	);
});
TopBar.displayName = "TopBar";
