import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { type AuditLogParams, downloadAuditLog, useAuditLogs } from "#features/platform/api/platform.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/settings/audit-log")({ component: Page });

const ACTIONS = ["", "CREATE", "UPDATE", "DELETE"];

function Page() {
	const { t } = useTranslation();
	const [filters, setFilters] = React.useState<AuditLogParams>({ take: 50 });
	const { data } = useAuditLogs(filters);
	const rows = data?.data ?? [];
	const total = data?.meta.total ?? 0;

	const setField = React.useCallback(
		<K extends keyof AuditLogParams>(key: K, value: AuditLogParams[K]) => setFilters((f) => ({ ...f, [key]: value })),
		[],
	);

	const onExport = React.useCallback(
		async (fmt: "csv" | "json") => {
			try {
				await downloadAuditLog(fmt, filters);
				toast.success(t("settings.auditLog.exported", { format: fmt.toUpperCase() }));
			} catch (e) {
				toast.error(e instanceof Error ? e.message : t("settings.auditLog.exportFailed"));
			}
		},
		[filters, t],
	);

	return (
		<div className="p-6 space-y-4 max-w-7xl">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h1 className="text-2xl font-bold">{t("settings.auditLog.title")}</h1>
					<p className="text-sm text-muted-foreground">
						{total.toLocaleString()} {t("settings.auditLogExt.entriesSuffix")}
					</p>
				</div>
				<div className="flex gap-2">
					<Button size="sm" variant="outline" onClick={() => onExport("csv")}>
						{t("settings.auditLogExt.csv")}
					</Button>
					<Button size="sm" variant="outline" onClick={() => onExport("json")}>
						{t("settings.auditLogExt.json")}
					</Button>
				</div>
			</div>

			<Card>
				<CardContent className="pt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
					<div>
						<Label>{t("settings.auditLog.action")}</Label>
						<Select value={filters.action ?? ""} onValueChange={(v) => setField("action", v || undefined)}>
							<SelectTrigger>
								<SelectValue placeholder={t("settings.auditLogExt.statusAny")} />
							</SelectTrigger>
							<SelectContent>
								{ACTIONS.map((a) => (
									<SelectItem key={a || "any"} value={a || "any"}>
										{a || t("settings.auditLogExt.statusAny")}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>{t("settings.auditLog.resource")}</Label>
						<Input
							value={filters.resource ?? ""}
							onChange={(e) => setField("resource", e.target.value || undefined)}
							placeholder={t("settings.auditLog.resourceExample")}
						/>
					</div>
					<div>
						<Label>{t("settings.auditLogExt.status")}</Label>
						<Select
							value={filters.status ?? "any"}
							onValueChange={(v) => setField("status", v === "any" ? undefined : v)}
						>
							<SelectTrigger>
								<SelectValue placeholder={t("settings.auditLogExt.statusAny")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="any">{t("settings.auditLogExt.statusAny")}</SelectItem>
								<SelectItem value="success">{t("settings.auditLogExt.statusSuccess")}</SelectItem>
								<SelectItem value="failure">{t("settings.auditLogExt.statusFailure")}</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>{t("settings.auditLog.from")}</Label>
						<Input
							type="date"
							value={filters.from ?? ""}
							onChange={(e) => setField("from", e.target.value || undefined)}
						/>
					</div>
					<div>
						<Label>{t("settings.auditLog.to")}</Label>
						<Input type="date" value={filters.to ?? ""} onChange={(e) => setField("to", e.target.value || undefined)} />
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="p-0">
					{rows.length === 0 ? (
						<p className="p-4 text-sm text-muted-foreground">{t("settings.auditLog.noEntries")}</p>
					) : (
						<Table className="w-full text-sm">
							<TableHeader>
								<TableRow className="text-left border-b">
									<TableHead className="py-2 px-3">{t("settings.auditLogExt.whenCol")}</TableHead>
									<TableHead className="py-2 px-3">{t("settings.auditLogExt.actionCol")}</TableHead>
									<TableHead className="py-2 px-3">{t("settings.auditLogExt.resourceCol")}</TableHead>
									<TableHead className="py-2 px-3">{t("settings.auditLogExt.idCol")}</TableHead>
									<TableHead className="py-2 px-3">{t("settings.auditLogExt.userCol")}</TableHead>
									<TableHead className="py-2 px-3">{t("settings.auditLogExt.ipCol")}</TableHead>
									<TableHead className="py-2 px-3">{t("settings.auditLogExt.statusCol")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.map((r) => (
									<TableRow key={r.id} className="border-b">
										<TableCell className="py-2 px-3 text-xs">{new Date(r.createdAt).toLocaleString()}</TableCell>
										<TableCell className="py-2 px-3 font-medium">{r.action}</TableCell>
										<TableCell className="py-2 px-3">{r.resource}</TableCell>
										<TableCell className="py-2 px-3 font-mono text-xs text-muted-foreground">
											{r.resourceId ? `${r.resourceId.slice(0, 10)}…` : "—"}
										</TableCell>
										<TableCell className="py-2 px-3 text-xs">{r.userEmail ?? r.userId ?? "—"}</TableCell>
										<TableCell className="py-2 px-3 text-xs font-mono">{r.ipAddress ?? "—"}</TableCell>
										<TableCell className="py-2 px-3">
											<Badge variant={r.status === "success" ? "default" : "destructive"}>
												{r.status === "success"
													? t("settings.auditLogExt.statusSuccess")
													: t("settings.auditLogExt.statusFailure")}
											</Badge>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
