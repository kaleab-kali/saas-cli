import Megaphone01Icon from "@hugeicons/core-free-icons/Megaphone01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { notifKeys, useMarkRead, useNotifications } from "../api/notification.hooks";
import { connectNotificationSocket, disconnectNotificationSocket } from "../api/socket";

interface Props {
	readonly userId: string | null;
}

export const NotificationBell = React.memo(
	({ userId }: Props) => {
		const { t } = useTranslation();
		const qc = useQueryClient();
		const [open, setOpen] = React.useState(false);
		const { data } = useNotifications({ limit: 10 });
		const unread = data?.meta.unread ?? 0;
		const items = data?.data ?? [];
		const markRead = useMarkRead();

		React.useEffect(() => {
			if (!userId) return;
			const s = connectNotificationSocket(userId);
			if (!s) return;
			const onNotif = (payload: {
				severity?: string;
				title?: string;
				body?: string | null;
				linkUrl?: string | null;
			}) => {
				qc.invalidateQueries({ queryKey: notifKeys.all });
				if (payload?.severity === "critical" || payload?.severity === "error") {
					toast.error(payload.title ?? t("notifications.bell.alert"), { description: payload.body ?? undefined });
				} else if (payload?.severity === "warning") {
					toast.warning(payload.title ?? t("notifications.bell.warning"), { description: payload.body ?? undefined });
				} else if (payload?.severity === "success") {
					toast.success(payload.title ?? t("notifications.bell.success"), { description: payload.body ?? undefined });
				}
			};
			const onBadge = () => qc.invalidateQueries({ queryKey: notifKeys.all });
			s.on("notification", onNotif);
			s.on("badge", onBadge);
			return () => {
				s.off("notification", onNotif);
				s.off("badge", onBadge);
				disconnectNotificationSocket();
			};
		}, [userId, qc, t]);

		return (
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button variant="ghost" size="icon" className="relative">
						<HugeiconsIcon icon={Megaphone01Icon} size={18} />
						{unread > 0 && (
							<span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
								{unread > 99 ? "99+" : unread}
							</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-96 p-0" align="end">
					<div className="flex items-center justify-between p-3 border-b">
						<span className="font-semibold text-sm">{t("notifications.bell.header")}</span>
						<Link
							to="/notifications"
							className="text-xs text-muted-foreground hover:underline"
							onClick={() => setOpen(false)}
						>
							{t("notifications.bell.viewAll")}
						</Link>
					</div>
					<ul className="max-h-96 overflow-y-auto">
						{items.length === 0 ? (
							<li className="p-4 text-sm text-muted-foreground text-center">{t("notifications.bell.none")}</li>
						) : (
							items.map((n) => {
								const handleClick = () => {
									if (!n.read) markRead.mutate(n.id);
									setOpen(false);
									if (n.linkUrl) window.location.href = n.linkUrl;
								};
								return (
									<li key={n.id} className={`border-b last:border-0 ${!n.read ? "bg-accent/30" : ""}`}>
										<button type="button" onClick={handleClick} className="w-full text-left p-3 hover:bg-accent">
											<div className="flex items-start gap-2">
												<span
													className={`mt-1 inline-block h-2 w-2 rounded-full shrink-0 ${
														n.severity === "error" || n.severity === "critical"
															? "bg-destructive"
															: n.severity === "warning"
																? "bg-yellow-500"
																: n.severity === "success"
																	? "bg-green-500"
																	: "bg-blue-500"
													}`}
												/>
												<div className="flex-1 min-w-0">
													<div className="text-sm font-medium truncate">{n.title}</div>
													{n.body && <div className="text-xs text-muted-foreground truncate">{n.body}</div>}
													<div className="text-[10px] text-muted-foreground mt-1">
														{new Date(n.createdAt).toLocaleString()}
													</div>
												</div>
											</div>
										</button>
									</li>
								);
							})
						)}
					</ul>
				</PopoverContent>
			</Popover>
		);
	},
	(p, n) => p.userId === n.userId,
);
NotificationBell.displayName = "NotificationBell";
