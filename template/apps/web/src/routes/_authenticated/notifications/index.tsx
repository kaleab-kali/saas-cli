import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	useArchiveNotification,
	useMarkAllRead,
	useMarkRead,
	useNotifications,
} from "#features/notifications/api/notification.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/notifications/")({ component: Page });

function Page() {
	const { t } = useTranslation();
	const [filter, setFilter] = React.useState<"all" | "unread" | "read">("all");
	const { data } = useNotifications({
		read: filter === "unread" ? false : filter === "read" ? true : undefined,
		limit: 50,
	});
	const markRead = useMarkRead();
	const markAll = useMarkAllRead();
	const archive = useArchiveNotification();
	const items = data?.data ?? [];
	const unread = data?.meta.unread ?? 0;

	return (
		<div className="p-6 space-y-4 max-w-4xl">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h1 className="text-2xl font-bold">{t("notifications.title")}</h1>
					<p className="text-sm text-muted-foreground">{t("notifications.indexPage.unread", { count: unread })}</p>
				</div>
				<div className="flex gap-2">
					<Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
						<SelectTrigger className="w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{t("notifications.indexPage.filters.all")}</SelectItem>
							<SelectItem value="unread">{t("notifications.indexPage.filters.unread")}</SelectItem>
							<SelectItem value="read">{t("notifications.indexPage.filters.read")}</SelectItem>
						</SelectContent>
					</Select>
					<Button variant="outline" onClick={() => markAll.mutate()}>
						{t("notifications.indexPage.markAllRead")}
					</Button>
				</div>
			</div>
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">{t("notifications.indexPage.inbox")}</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					{items.length === 0 ? (
						<p className="p-4 text-sm text-muted-foreground">{t("notifications.indexPage.noNotifications")}</p>
					) : (
						<ul className="divide-y">
							{items.map((n) => (
								<li key={n.id} className={`p-3 flex items-start gap-3 ${!n.read ? "bg-accent/20" : ""}`}>
									<Badge
										variant={
											n.severity === "error" || n.severity === "critical"
												? "destructive"
												: n.severity === "warning"
													? "secondary"
													: "default"
										}
									>
										{n.category.replace(/_/g, " ")}
									</Badge>
									<div className="flex-1 min-w-0">
										<div className="text-sm font-medium">
											{n.linkUrl ? (
												<a
													href={n.linkUrl}
													className="hover:underline"
													onClick={() => !n.read && markRead.mutate(n.id)}
												>
													{n.title}
												</a>
											) : (
												n.title
											)}
										</div>
										{n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
										<div className="text-[11px] text-muted-foreground mt-0.5">
											{new Date(n.createdAt).toLocaleString()}
											{n.sourceEvent ? ` · ${n.sourceEvent}` : ""}
										</div>
									</div>
									<div className="flex gap-1">
										{!n.read && (
											<Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>
												{t("notifications.indexPage.markReadBtn")}
											</Button>
										)}
										<Button size="sm" variant="ghost" onClick={() => archive.mutate(n.id)}>
											{t("notifications.indexPage.archiveBtn")}
										</Button>
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
