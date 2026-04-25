import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { api } from "#shared/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/notifications/deliveries")({ component: Page });

interface Delivery {
	id: string;
	toEmail: string;
	subject: string;
	source: string;
	sourceRef?: string | null;
	status: string;
	messageId?: string | null;
	error?: string | null;
	sentAt?: string | null;
	createdAt: string;
}

function Page() {
	const { t } = useTranslation();
	const [status, setStatus] = React.useState("all");
	const [source, setSource] = React.useState("all");
	const { data } = useQuery({
		queryKey: ["email-deliveries", status, source],
		queryFn: () =>
			api.get<{ data: Delivery[]; meta: { total: number } }>("/notifications/email-deliveries", {
				params: {
					status: status === "all" ? undefined : status,
					source: source === "all" ? undefined : source,
					limit: 100,
				},
			}),
	});
	const rows = data?.data ?? [];

	return (
		<div className="p-6 space-y-4 max-w-6xl">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h1 className="text-2xl font-bold">{t("notifications.deliveriesTitle")}</h1>
					<p className="text-sm text-muted-foreground">{t("notifications.deliveriesPage.subtitle")}</p>
				</div>
				<div className="flex gap-2">
					<Select value={status} onValueChange={setStatus}>
						<SelectTrigger className="w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{t("notifications.deliveriesPage.statusFilters.all")}</SelectItem>
							<SelectItem value="queued">{t("notifications.deliveriesPage.statusFilters.queued")}</SelectItem>
							<SelectItem value="sent">{t("notifications.deliveriesPage.statusFilters.sent")}</SelectItem>
							<SelectItem value="delivered">{t("notifications.deliveriesPage.statusFilters.delivered")}</SelectItem>
							<SelectItem value="failed">{t("notifications.deliveriesPage.statusFilters.failed")}</SelectItem>
							<SelectItem value="bounced">{t("notifications.deliveriesPage.statusFilters.bounced")}</SelectItem>
						</SelectContent>
					</Select>
					<Select value={source} onValueChange={setSource}>
						<SelectTrigger className="w-[160px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{t("notifications.deliveriesPage.sourceFilters.all")}</SelectItem>
							<SelectItem value="bulk">{t("notifications.deliveriesPage.sourceFilters.bulk")}</SelectItem>
							<SelectItem value="transactional">
								{t("notifications.deliveriesPage.sourceFilters.transactional")}
							</SelectItem>
							<SelectItem value="invoice">{t("notifications.deliveriesPage.sourceFilters.invoice")}</SelectItem>
							<SelectItem value="digest">{t("notifications.deliveriesPage.sourceFilters.digest")}</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">
						{t("notifications.deliveriesPage.cardTitle", { count: data?.meta?.total ?? 0 })}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{rows.length === 0 ? (
						<p className="text-sm text-muted-foreground">{t("notifications.deliveriesPage.noEmails")}</p>
					) : (
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left border-b">
									<th className="py-2">{t("notifications.deliveriesPage.columns.time")}</th>
									<th className="py-2">{t("notifications.deliveriesPage.columns.to")}</th>
									<th className="py-2">{t("notifications.deliveriesPage.columns.subject")}</th>
									<th className="py-2">{t("notifications.deliveriesPage.columns.source")}</th>
									<th className="py-2">{t("notifications.deliveriesPage.columns.status")}</th>
									<th className="py-2">{t("notifications.deliveriesPage.columns.error")}</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((r) => (
									<tr key={r.id} className="border-b">
										<td className="py-2 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</td>
										<td className="py-2">{r.toEmail}</td>
										<td className="py-2 truncate max-w-[260px]">{r.subject}</td>
										<td className="py-2">
											{t(`notifications.deliveriesPage.sourceFilters.${r.source}`, { defaultValue: r.source })}
										</td>
										<td className="py-2">
											<Badge
												variant={
													r.status === "delivered" || r.status === "sent"
														? "default"
														: r.status === "failed" || r.status === "bounced"
															? "destructive"
															: "secondary"
												}
											>
												{t(`notifications.deliveriesPage.statusFilters.${r.status}`, { defaultValue: r.status })}
											</Badge>
										</td>
										<td className="py-2 text-xs text-destructive truncate max-w-[240px]">{r.error ?? ""}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
