import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	executeReportDownload,
	useDeleteReport,
	useExecuteReport,
	useReports,
} from "#features/reporting/api/reporting.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/reports/saved")({ component: Page });

function Page() {
	const { t } = useTranslation();
	const { data: reports = [] } = useReports();
	const del = useDeleteReport();
	const exec = useExecuteReport();
	const [preview, setPreview] = React.useState<{ headers: string[]; rows: Record<string, unknown>[] } | null>(null);
	const dash = t("reports.savedPage.dash");

	return (
		<div className="p-6 space-y-4 max-w-6xl">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h1 className="text-2xl font-bold">{t("reports.savedReports")}</h1>
					<p className="text-sm text-muted-foreground">
						{t("reports.savedPage.reportsCount", { count: reports.length })}
					</p>
				</div>
				<Link to="/reports/new">
					<Button>{t("reports.savedPage.newReportBtn")}</Button>
				</Link>
			</div>
			<Card>
				<CardContent className="p-0">
					{reports.length === 0 ? (
						<p className="p-4 text-sm text-muted-foreground">{t("reports.savedPage.noSaved")}</p>
					) : (
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left border-b">
									<th className="py-2 px-3">{t("reports.savedPage.columns.name")}</th>
									<th className="py-2 px-3">{t("reports.savedPage.columns.dataSource")}</th>
									<th className="py-2 px-3">{t("reports.savedPage.columns.columns")}</th>
									<th className="py-2 px-3">{t("reports.savedPage.columns.chart")}</th>
									<th className="py-2 px-3">{t("reports.savedPage.columns.template")}</th>
									<th className="py-2 px-3">{t("reports.savedPage.columns.shared")}</th>
									<th className="py-2 px-3"></th>
								</tr>
							</thead>
							<tbody>
								{reports.map((r) => (
									<tr key={r.id} className="border-b">
										<td className="py-2 px-3">
											<div className="font-medium">{r.name}</div>
											{r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
										</td>
										<td className="py-2 px-3">
											{t(`reports.newReport.dataSources.${r.dataSource}`, { defaultValue: r.dataSource })}
										</td>
										<td className="py-2 px-3 text-xs">{r.columns.length}</td>
										<td className="py-2 px-3">
											{r.chartType
												? t(`reports.newReport.chartTypes.${r.chartType}`, { defaultValue: r.chartType })
												: dash}
										</td>
										<td className="py-2 px-3">
											{r.isTemplate ? <Badge variant="outline">{t("reports.savedPage.templateBadge")}</Badge> : dash}
										</td>
										<td className="py-2 px-3">
											{r.sharedWithTeam ? t("reports.savedPage.yes") : t("reports.savedPage.no")}
										</td>
										<td className="py-2 px-3 text-right">
											<Button
												size="sm"
												variant="outline"
												onClick={async () => {
													const res = await exec.mutateAsync({ id: r.id });
													setPreview(res.data);
												}}
											>
												{t("reports.savedPage.runBtn")}
											</Button>
											<Button size="sm" variant="ghost" onClick={() => executeReportDownload(r.id, "csv")}>
												{t("reports.savedPage.csv")}
											</Button>
											<Button size="sm" variant="ghost" onClick={() => executeReportDownload(r.id, "xlsx")}>
												{t("reports.savedPage.xlsx")}
											</Button>
											<Button size="sm" variant="ghost" onClick={() => executeReportDownload(r.id, "pdf")}>
												{t("reports.savedPage.pdf")}
											</Button>
											<Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)}>
												{t("reports.savedPage.deleteBtn")}
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</CardContent>
			</Card>
			{preview && (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm flex items-center justify-between">
							<span>{t("reports.savedPage.previewTitle", { count: preview.rows.length })}</span>
							<Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
								{t("reports.savedPage.closeBtn")}
							</Button>
						</CardTitle>
					</CardHeader>
					<CardContent className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left border-b">
									{preview.headers.map((h) => (
										<th key={h} className="py-2 px-3 font-medium">
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{preview.rows.slice(0, 200).map((row, i) => (
									<tr key={i} className="border-b">
										{preview.headers.map((h) => (
											<td key={h} className="py-1.5 px-3">
												{String(row[h] ?? "")}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
