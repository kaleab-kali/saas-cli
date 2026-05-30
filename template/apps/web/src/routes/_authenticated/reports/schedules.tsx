import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	type ExportFormat,
	type ScheduleFrequency,
	useCancelSchedule,
	useCreateSchedule,
	useReports,
	useSchedules,
} from "#features/reporting/api/reporting.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/reports/schedules")({ component: Page });

const ScheduleDialog = React.memo(
	() => {
		const { t } = useTranslation();
		const [open, setOpen] = React.useState(false);
		const [reportId, setReportId] = React.useState("");
		const [frequency, setFrequency] = React.useState<ScheduleFrequency>("weekly");
		const [dayOfWeek, setDayOfWeek] = React.useState(1);
		const [dayOfMonth, setDayOfMonth] = React.useState(1);
		const [timeOfDay, setTimeOfDay] = React.useState("08:00");
		const [format, setFormat] = React.useState<ExportFormat>("csv");
		const [recipientsStr, setRecipientsStr] = React.useState("");
		const { data: reports = [] } = useReports();
		const create = useCreateSchedule();

		const onSubmit = React.useCallback(async () => {
			const recipients = recipientsStr
				.split(/[,;\s]+/)
				.map((s) => s.trim())
				.filter(Boolean);
			if (!reportId || recipients.length === 0) return;
			await create.mutateAsync({
				reportId,
				frequency,
				dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
				dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
				timeOfDay,
				recipients,
				format,
				enabled: true,
			});
			setOpen(false);
			setReportId("");
			setRecipientsStr("");
		}, [reportId, frequency, dayOfWeek, dayOfMonth, timeOfDay, format, recipientsStr, create]);

		return (
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button>{t("reports.scheduleDialog.trigger")}</Button>
				</DialogTrigger>
				<DialogContent className="max-w-xl">
					<DialogHeader>
						<DialogTitle>{t("reports.scheduleDialog.title")}</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>{t("reports.scheduleDialog.report")}</Label>
							<Select value={reportId} onValueChange={setReportId}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder={t("reports.scheduleDialog.reportPlaceholder")} />
								</SelectTrigger>
								<SelectContent>
									{reports.map((r) => (
										<SelectItem key={r.id} value={r.id}>
											{r.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid grid-cols-3 gap-3">
							<div>
								<Label>{t("reports.scheduleDialog.frequency")}</Label>
								<Select value={frequency} onValueChange={(v) => setFrequency(v as ScheduleFrequency)}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="daily">{t("reports.scheduleDialog.daily")}</SelectItem>
										<SelectItem value="weekly">{t("reports.scheduleDialog.weekly")}</SelectItem>
										<SelectItem value="monthly">{t("reports.scheduleDialog.monthly")}</SelectItem>
									</SelectContent>
								</Select>
							</div>
							{frequency === "weekly" && (
								<div>
									<Label>{t("reports.scheduleDialog.dayOfWeek")}</Label>
									<Input
										type="number"
										min={0}
										max={6}
										value={dayOfWeek}
										onChange={(e) => setDayOfWeek(Number(e.target.value))}
									/>
								</div>
							)}
							{frequency === "monthly" && (
								<div>
									<Label>{t("reports.scheduleDialog.dayOfMonth")}</Label>
									<Input
										type="number"
										min={1}
										max={31}
										value={dayOfMonth}
										onChange={(e) => setDayOfMonth(Number(e.target.value))}
									/>
								</div>
							)}
							<div>
								<Label>{t("reports.scheduleDialog.time")}</Label>
								<Input value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} />
							</div>
						</div>
						<div>
							<Label>{t("reports.scheduleDialog.format")}</Label>
							<Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="csv">{t("reports.scheduleDialog.csv")}</SelectItem>
									<SelectItem value="xlsx">{t("reports.scheduleDialog.xlsx")}</SelectItem>
									<SelectItem value="pdf">{t("reports.scheduleDialog.pdf")}</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>{t("reports.scheduleDialog.recipients")}</Label>
							<Input
								value={recipientsStr}
								onChange={(e) => setRecipientsStr(e.target.value)}
								placeholder={t("reports.scheduleDialog.recipientsPlaceholder")}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							{t("reports.scheduleDialog.cancel")}
						</Button>
						<Button onClick={onSubmit} disabled={create.isPending || !reportId || !recipientsStr.trim()}>
							{t("reports.scheduleDialog.schedule")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	},
	() => true,
);
ScheduleDialog.displayName = "ScheduleDialog";

function Page() {
	const { t } = useTranslation();
	const { data: schedules = [] } = useSchedules();
	const { data: reports = [] } = useReports();
	const cancel = useCancelSchedule();
	const reportName = (id: string) => reports.find((r) => r.id === id)?.name ?? id.slice(0, 8);
	const dash = t("reports.schedulesPage.dash");

	return (
		<div className="p-6 space-y-4 max-w-5xl">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h1 className="text-2xl font-bold">{t("reports.schedules")}</h1>
					<p className="text-sm text-muted-foreground">{t("reports.schedulesPage.subtitle")}</p>
				</div>
				<ScheduleDialog />
			</div>
			<Card>
				<CardContent className="p-0">
					{schedules.length === 0 ? (
						<p className="p-4 text-sm text-muted-foreground">{t("reports.schedulesPage.noSchedules")}</p>
					) : (
						<Table className="w-full text-sm">
							<TableHeader>
								<TableRow className="text-left border-b">
									<TableHead className="py-2 px-3">{t("reports.schedulesPage.columns.report")}</TableHead>
									<TableHead className="py-2 px-3">{t("reports.schedulesPage.columns.frequency")}</TableHead>
									<TableHead className="py-2 px-3">{t("reports.schedulesPage.columns.time")}</TableHead>
									<TableHead className="py-2 px-3">{t("reports.schedulesPage.columns.format")}</TableHead>
									<TableHead className="py-2 px-3">{t("reports.schedulesPage.columns.recipients")}</TableHead>
									<TableHead className="py-2 px-3">{t("reports.schedulesPage.columns.nextRun")}</TableHead>
									<TableHead className="py-2 px-3">{t("reports.schedulesPage.columns.status")}</TableHead>
									<TableHead className="py-2 px-3"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{schedules.map((s) => (
									<TableRow key={s.id} className="border-b">
										<TableCell className="py-2 px-3">{reportName(s.reportId)}</TableCell>
										<TableCell className="py-2 px-3">
											{t(`reports.scheduleDialog.${s.frequency}`, { defaultValue: s.frequency })}
										</TableCell>
										<TableCell className="py-2 px-3">{s.timeOfDay}</TableCell>
										<TableCell className="py-2 px-3 uppercase">{s.format}</TableCell>
										<TableCell className="py-2 px-3 text-xs">{s.recipients.join(", ")}</TableCell>
										<TableCell className="py-2 px-3 text-xs">
											{s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : dash}
										</TableCell>
										<TableCell className="py-2 px-3">
											<Badge variant={s.enabled ? "default" : "secondary"}>
												{s.enabled ? t("reports.schedulesPage.enabled") : t("reports.schedulesPage.disabled")}
											</Badge>
										</TableCell>
										<TableCell className="py-2 px-3 text-right">
											<Button size="sm" variant="ghost" onClick={() => cancel.mutate(s.id)}>
												{t("reports.schedulesPage.cancelBtn")}
											</Button>
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
