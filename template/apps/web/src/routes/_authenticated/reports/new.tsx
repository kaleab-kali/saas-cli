import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	type ChartType,
	type DataSource,
	type ReportColumn,
	useAllowedFields,
	useCreateReport,
} from "#features/reporting/api/reporting.hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/reports/new")({ component: Page });

const DATA_SOURCES: DataSource[] = [
	"property",
	"unit",
	"lease",
	"invoice",
	"payment",
	"work_order",
	"deal",
	"listing",
	"contact",
	"purchase_order",
	"journal",
];
const CHART_TYPES: ChartType[] = ["table", "bar", "line", "pie", "stacked_bar"];
const AGGS = ["sum", "avg", "count", "min", "max"] as const;

function Page() {
	const { t } = useTranslation();
	const nav = useNavigate();
	const [name, setName] = React.useState("");
	const [description, setDescription] = React.useState("");
	const [dataSource, setDataSource] = React.useState<DataSource>("lease");
	const [columns, setColumns] = React.useState<ReportColumn[]>([]);
	const [chartType, setChartType] = React.useState<ChartType>("table");
	const [groupBy, setGroupBy] = React.useState<string[]>([]);
	const [isTemplate, setIsTemplate] = React.useState(false);
	const [sharedWithTeam, setSharedWithTeam] = React.useState(false);
	const { data: allowed = [] } = useAllowedFields(dataSource);
	const create = useCreateReport();

	const toggleField = React.useCallback((field: string) => {
		setColumns((prev) => {
			if (prev.some((c) => c.field === field)) return prev.filter((c) => c.field !== field);
			return [...prev, { field, label: field.replace(/_/g, " ") }];
		});
	}, []);

	const toggleGroupBy = React.useCallback((field: string) => {
		setGroupBy((prev) => (prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]));
	}, []);

	const setAgg = React.useCallback((field: string, agg: string) => {
		setColumns((prev) =>
			prev.map((c) =>
				c.field === field ? { ...c, agg: agg === "none" ? undefined : (agg as ReportColumn["agg"]) } : c,
			),
		);
	}, []);

	const onSubmit = React.useCallback(async () => {
		if (!name.trim() || columns.length === 0) return;
		await create.mutateAsync({
			name: name.trim(),
			description: description.trim() || undefined,
			dataSource,
			columns,
			groupBy,
			chartType,
			isTemplate,
			sharedWithTeam,
			filters: [],
			sort: [],
		});
		nav({ to: "/reports/saved" });
	}, [name, description, dataSource, columns, groupBy, chartType, isTemplate, sharedWithTeam, create, nav]);

	return (
		<div className="p-6 space-y-4 max-w-4xl">
			<h1 className="text-2xl font-bold">{t("reports.newCustomReport")}</h1>
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">{t("reports.newReport.basics")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label>{t("reports.newReport.name")}</Label>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder={t("reports.newReport.namePlaceholder")}
							/>
						</div>
						<div>
							<Label>{t("reports.newReport.dataSource")}</Label>
							<Select value={dataSource} onValueChange={(v) => setDataSource(v as DataSource)}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DATA_SOURCES.map((d) => (
										<SelectItem key={d} value={d}>
											{t(`reports.newReport.dataSources.${d}`, { defaultValue: d.replace(/_/g, " ") })}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div>
						<Label>{t("reports.newReport.description")}</Label>
						<Input value={description} onChange={(e) => setDescription(e.target.value)} />
					</div>
					<div className="grid grid-cols-3 gap-3">
						<div>
							<Label>{t("reports.newReport.chartType")}</Label>
							<Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CHART_TYPES.map((c) => (
										<SelectItem key={c} value={c}>
											{t(`reports.newReport.chartTypes.${c}`, { defaultValue: c })}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center gap-2 pt-6">
							<Switch checked={isTemplate} onCheckedChange={setIsTemplate} />
							<Label>{t("reports.newReport.saveAsTemplate")}</Label>
						</div>
						<div className="flex items-center gap-2 pt-6">
							<Switch checked={sharedWithTeam} onCheckedChange={setSharedWithTeam} />
							<Label>{t("reports.newReport.shareWithTeam")}</Label>
						</div>
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">{t("reports.newReport.columnsTitle")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
						{allowed.map((f) => {
							const col = columns.find((c) => c.field === f);
							return (
								<div key={f} className="border rounded p-2">
									<label className="flex items-center gap-2 text-sm">
										<input type="checkbox" checked={!!col} onChange={() => toggleField(f)} />
										{f}
									</label>
									{col && (
										<div className="mt-2">
											<Select value={col.agg ?? "none"} onValueChange={(v) => setAgg(f, v)}>
												<SelectTrigger className="w-full h-8 text-xs">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">{t("reports.newReport.noAggregation")}</SelectItem>
													{AGGS.map((a) => (
														<SelectItem key={a} value={a}>
															{t(`reports.newReport.aggs.${a}`, { defaultValue: a })}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									)}
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">{t("reports.newReport.groupByTitle")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-3 md:grid-cols-4 gap-2">
						{allowed.map((f) => (
							<label key={f} className="flex items-center gap-2 text-sm">
								<input type="checkbox" checked={groupBy.includes(f)} onChange={() => toggleGroupBy(f)} />
								{f}
							</label>
						))}
					</div>
				</CardContent>
			</Card>
			<div className="flex justify-end gap-2">
				<Button variant="outline" onClick={() => nav({ to: "/reports" })}>
					{t("reports.newReport.cancel")}
				</Button>
				<Button onClick={onSubmit} disabled={create.isPending || !name.trim() || columns.length === 0}>
					{t("reports.newReport.saveReport")}
				</Button>
			</div>
		</div>
	);
}
