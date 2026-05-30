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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
						<Table className="w-full text-sm">
							<TableHeader>
								<TableRow className="text-left border-b">
									<TableHead className="py-2 px-3">{t("reports.savedPage.columns.name")}</TableHead>
									<TableHead className="py-2 px-3">{t("reports.savedPage.columns.dataSource")}</TableHead>
									<TableHead className="py-2 px-3">{t("reports.savedPage.columns.columns")}</TableHead>
									<TableHead className="py-2 px-3">{t("reports.savedPage.columns.chart")}</TableHead>
									<TableHead className="py-2 px-3">{t("reports.savedPage.columns.template")}</TableHead>
									<TableHead className="py-2 px-3">{t("reports.savedPage.columns.shared")}</TableHead>
									<TableHead className="py-2 px-3"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{reports.map((r) => (
									<TableRow key={r.id} className="border-b">
										<TableCell className="py-2 px-3">
											<div className="font-medium">{r.name}</div>
											{r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
										</TableCell>
										<TableCell className="py-2 px-3">
											{t(`reports.newReport.dataSources.${r.dataSource}`, { defaultValue: r.dataSource })}
										</TableCell>
										<TableCell className="py-2 px-3 text-xs">{r.columns.length}</TableCell>
										<TableCell className="py-2 px-3">
											{r.chartType
												? t(`reports.newReport.chartTypes.${r.chartType}`, { defaultValue: r.chartType })
												: dash}
										</TableCell>
										<TableCell className="py-2 px-3">
											{r.isTemplate ? <Badge variant="outline">{t("reports.savedPage.templateBadge")}</Badge> : dash}
										</TableCell>
										<TableCell className="py-2 px-3">
											{r.sharedWithTeam ? t("reports.savedPage.yes") : t("reports.savedPage.no")}
										</TableCell>
										<TableCell className="py-2 px-3 text-right">
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
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
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
						<Table className="w-full text-sm">
							<TableHeader>
								<TableRow className="text-left border-b">
									{preview.headers.map((h) => (
										<TableHead key={h} className="py-2 px-3 font-medium">
											{h}
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{preview.rows.slice(0, 200).map((row, i) => (
									<TableRow key={i} className="border-b">
										{preview.headers.map((h) => (
											<TableCell key={h} className="py-1.5 px-3">
												{String(row[h] ?? "")}
											</TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
