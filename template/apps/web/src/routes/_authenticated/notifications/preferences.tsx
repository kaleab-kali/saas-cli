import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { usePreferences, useUpsertPreference } from "#features/notifications/api/notification.hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/notifications/preferences")({ component: Page });

// Generic skeleton events. Add per-app keys when you wire domain events into notifications.
const EVENT_KEYS = [
	"system.welcome",
	"system.invitation_received",
	"system.password_reset",
	"billing.invoice.created",
	"billing.invoice.paid",
	"billing.payment.failed",
	"billing.subscription.past_due",
] as const;

function Page() {
	const { t } = useTranslation();
	const { data: prefs = [] } = usePreferences();
	const upsert = useUpsertPreference();

	const getPref = (key: string) => prefs.find((p) => p.eventKey === key);

	return (
		<div className="p-6 space-y-4 max-w-4xl">
			<div>
				<h1 className="text-2xl font-bold">{t("notifications.preferencesTitle")}</h1>
				<p className="text-sm text-muted-foreground">{t("notifications.preferencesPage.subtitle")}</p>
			</div>
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">{t("notifications.eventSubscriptions")}</CardTitle>
				</CardHeader>
				<CardContent>
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left border-b">
								<th className="py-2">{t("notifications.event")}</th>
								<th className="py-2 text-center">{t("notifications.inApp")}</th>
								<th className="py-2 text-center">{t("notifications.email")}</th>
								<th className="py-2 text-center">{t("notifications.sms")}</th>
							</tr>
						</thead>
						<tbody>
							{EVENT_KEYS.map((k) => {
								const p = getPref(k);
								return (
									<tr key={k} className="border-b">
										<td className="py-2">{t(`notifications.preferencesPage.events.${k}`, { defaultValue: k })}</td>
										<td className="py-2 text-center">
											<Switch
												checked={p?.inApp ?? true}
												onCheckedChange={(v) => upsert.mutate({ eventKey: k, inApp: v })}
											/>
										</td>
										<td className="py-2 text-center">
											<Select
												value={p?.email ?? "instant"}
												onValueChange={(v) => upsert.mutate({ eventKey: k, email: v })}
											>
												<SelectTrigger className="w-[120px] mx-auto">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="instant">{t("notifications.digestOptions.instant")}</SelectItem>
													<SelectItem value="daily">{t("notifications.digestOptions.daily")}</SelectItem>
													<SelectItem value="weekly">{t("notifications.digestOptions.weekly")}</SelectItem>
													<SelectItem value="off">{t("notifications.digestOptions.off")}</SelectItem>
												</SelectContent>
											</Select>
										</td>
										<td className="py-2 text-center">
											<Switch
												checked={p?.sms ?? false}
												onCheckedChange={(v) => upsert.mutate({ eventKey: k, sms: v })}
											/>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</CardContent>
			</Card>
		</div>
	);
}
