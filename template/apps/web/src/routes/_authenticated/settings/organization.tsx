import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useOrganizationSettings, useUpdateOrganizationSettings } from "#features/platform/api/platform.hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings/organization")({ component: Page });

const TIMEZONES = [
	"UTC",
	"America/New_York",
	"America/Los_Angeles",
	"Europe/London",
	"Europe/Berlin",
	"Africa/Nairobi",
	"Africa/Addis_Ababa",
	"Asia/Dubai",
	"Asia/Tokyo",
];
const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "KES", "ETB", "NGN", "ZAR", "INR", "CAD", "AUD"];
const AREA_UNITS = ["sqm", "sqft"];
const DATE_FORMATS = ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY", "DD-MMM-YYYY"];
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;

function Page() {
	const { t } = useTranslation();
	const { data } = useOrganizationSettings();
	const update = useUpdateOrganizationSettings();
	const [form, setForm] = React.useState<Record<string, unknown>>({});

	React.useEffect(() => {
		if (data) setForm(data);
	}, [data]);

	const setField = React.useCallback((key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value })), []);

	const onSave = React.useCallback(async () => {
		try {
			await update.mutateAsync(form);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : t("common.saveFailed"));
		}
	}, [form, update, t]);

	return (
		<div className="p-6 space-y-4 max-w-4xl">
			<h1 className="text-2xl font-bold">{t("settings.organization.title")}</h1>
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">{t("settings.organization.regional")}</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<Label>{t("settings.organization.timezone")}</Label>
						<Select value={(form.timezone as string) ?? ""} onValueChange={(v) => setField("timezone", v)}>
							<SelectTrigger>
								<SelectValue placeholder={t("settings.orgExt.pickTimezone")} />
							</SelectTrigger>
							<SelectContent>
								{TIMEZONES.map((tz) => (
									<SelectItem key={tz} value={tz}>
										{tz}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>{t("settings.organization.currency")}</Label>
						<Select value={(form.currency as string) ?? ""} onValueChange={(v) => setField("currency", v)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CURRENCIES.map((c) => (
									<SelectItem key={c} value={c}>
										{c}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>{t("settings.organization.areaUnit")}</Label>
						<Select value={(form.areaUnit as string) ?? ""} onValueChange={(v) => setField("areaUnit", v)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{AREA_UNITS.map((a) => (
									<SelectItem key={a} value={a}>
										{a}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>{t("settings.organization.dateFormat")}</Label>
						<Select value={(form.dateFormat as string) ?? ""} onValueChange={(v) => setField("dateFormat", v)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{DATE_FORMATS.map((d) => (
									<SelectItem key={d} value={d}>
										{d}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label>{t("settings.organization.fiscalYearStart")}</Label>
						<Select
							value={String((form.fiscalYearStartMonth as number) ?? 1)}
							onValueChange={(v) => setField("fiscalYearStartMonth", Number(v))}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{MONTH_KEYS.map((mk, i) => (
									<SelectItem key={mk} value={String(i + 1)}>
										{t(`settings.orgExt.months.${mk}`)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">{t("settings.organization.invoiceNumbering")}</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<Label>{t("settings.organization.invoicePrefix")}</Label>
						<Input
							value={(form.invoiceNumberPrefix as string) ?? ""}
							onChange={(e) => setField("invoiceNumberPrefix", e.target.value)}
						/>
					</div>
					<div>
						<Label>{t("settings.organization.invoicePadding")}</Label>
						<Input
							type="number"
							min={1}
							max={10}
							value={(form.invoiceNumberPadding as number) ?? 5}
							onChange={(e) => setField("invoiceNumberPadding", Number(e.target.value))}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">{t("settings.organization.companyInfo")}</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<Label>{t("common.email")}</Label>
						<Input
							value={(form.companyEmail as string) ?? ""}
							onChange={(e) => setField("companyEmail", e.target.value)}
						/>
					</div>
					<div>
						<Label>{t("common.phone")}</Label>
						<Input
							value={(form.companyPhone as string) ?? ""}
							onChange={(e) => setField("companyPhone", e.target.value)}
						/>
					</div>
					<div className="md:col-span-2">
						<Label>{t("common.address")}</Label>
						<textarea
							rows={2}
							className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
							value={(form.companyAddress as string) ?? ""}
							onChange={(e) => setField("companyAddress", e.target.value)}
						/>
					</div>
					<div>
						<Label>{t("settings.organization.taxId")}</Label>
						<Input value={(form.taxId as string) ?? ""} onChange={(e) => setField("taxId", e.target.value)} />
					</div>
					<div>
						<Label>{t("settings.organization.logoUrl")}</Label>
						<Input value={(form.logoUrl as string) ?? ""} onChange={(e) => setField("logoUrl", e.target.value)} />
					</div>
					<div>
						<Label>{t("settings.organization.primaryColor")}</Label>
						<Input
							value={(form.primaryColor as string) ?? ""}
							onChange={(e) => setField("primaryColor", e.target.value)}
							placeholder="#3b82f6"
						/>
					</div>
					<div className="md:col-span-2">
						<Label>{t("settings.organization.emailFooter")}</Label>
						<textarea
							rows={3}
							className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
							value={(form.emailFooter as string) ?? ""}
							onChange={(e) => setField("emailFooter", e.target.value)}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">{t("settings.organization.agentPrivacy")}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-xs text-muted-foreground">{t("settings.organization.agentPrivacyDesc")}</p>
					<div className="flex items-center justify-between p-2 border rounded">
						<Label>{t("settings.organization.allowGmView")}</Label>
						<Switch
							checked={(form.allowGmViewAgentContacts as boolean) ?? false}
							onCheckedChange={(v) => setField("allowGmViewAgentContacts", v)}
						/>
					</div>
					<div className="flex items-center justify-between p-2 border rounded">
						<Label>{t("settings.organization.allowGmExport")}</Label>
						<Switch
							checked={(form.allowGmExportAgentContacts as boolean) ?? false}
							onCheckedChange={(v) => setField("allowGmExportAgentContacts", v)}
						/>
					</div>
				</CardContent>
			</Card>

			<div className="flex justify-end">
				<Button onClick={onSave} disabled={update.isPending}>
					{update.isPending ? t("common.saving") : t("common.save")}
				</Button>
			</div>
		</div>
	);
}
