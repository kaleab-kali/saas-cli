import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	type OrganizationSettings,
	useOrganizationSettings,
	useUpdateOrganizationSettings,
} from "#features/platform/api/platform.hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
const DATE_FORMATS = ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY", "DD-MMM-YYYY"];
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;

type OrganizationSettingsForm = Pick<
	OrganizationSettings,
	| "timezone"
	| "currency"
	| "dateFormat"
	| "fiscalYearStartMonth"
	| "invoiceNumberPrefix"
	| "invoiceNumberPadding"
	| "companyEmail"
	| "companyPhone"
	| "companyAddress"
	| "taxId"
	| "logoUrl"
	| "primaryColor"
	| "emailFooter"
>;

const toOrganizationSettingsForm = (settings: OrganizationSettings): OrganizationSettingsForm => ({
	timezone: settings.timezone,
	currency: settings.currency,
	dateFormat: settings.dateFormat,
	fiscalYearStartMonth: settings.fiscalYearStartMonth,
	invoiceNumberPrefix: settings.invoiceNumberPrefix,
	invoiceNumberPadding: settings.invoiceNumberPadding,
	companyEmail: settings.companyEmail,
	companyPhone: settings.companyPhone,
	companyAddress: settings.companyAddress,
	taxId: settings.taxId,
	logoUrl: settings.logoUrl,
	primaryColor: settings.primaryColor,
	emailFooter: settings.emailFooter,
});

function Page() {
	const { t } = useTranslation();
	const { data } = useOrganizationSettings();
	const update = useUpdateOrganizationSettings();
	const [form, setForm] = React.useState<Partial<OrganizationSettingsForm>>({});

	React.useEffect(() => {
		if (data) setForm(toOrganizationSettingsForm(data));
	}, [data]);

	const setField = React.useCallback(
		<K extends keyof OrganizationSettingsForm>(key: K, value: OrganizationSettingsForm[K]) =>
			setForm((f) => ({ ...f, [key]: value })),
		[],
	);

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
						<Label htmlFor="organization-timezone">{t("settings.organization.timezone")}</Label>
						<Select value={(form.timezone as string) ?? ""} onValueChange={(v) => setField("timezone", v)}>
							<SelectTrigger id="organization-timezone" aria-label={t("settings.organization.timezone")}>
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
						<Label htmlFor="organization-currency">{t("settings.organization.currency")}</Label>
						<Select value={(form.currency as string) ?? ""} onValueChange={(v) => setField("currency", v)}>
							<SelectTrigger id="organization-currency" aria-label={t("settings.organization.currency")}>
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
						<Label htmlFor="organization-date-format">{t("settings.organization.dateFormat")}</Label>
						<Select value={(form.dateFormat as string) ?? ""} onValueChange={(v) => setField("dateFormat", v)}>
							<SelectTrigger id="organization-date-format" aria-label={t("settings.organization.dateFormat")}>
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
						<Label htmlFor="organization-fiscal-year-start">{t("settings.organization.fiscalYearStart")}</Label>
						<Select
							value={String((form.fiscalYearStartMonth as number) ?? 1)}
							onValueChange={(v) => setField("fiscalYearStartMonth", Number(v))}
						>
							<SelectTrigger
								id="organization-fiscal-year-start"
								aria-label={t("settings.organization.fiscalYearStart")}
							>
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
						<Label htmlFor="organization-invoice-prefix">{t("settings.organization.invoicePrefix")}</Label>
						<Input
							id="organization-invoice-prefix"
							value={(form.invoiceNumberPrefix as string) ?? ""}
							onChange={(e) => setField("invoiceNumberPrefix", e.target.value)}
						/>
					</div>
					<div>
						<Label htmlFor="organization-invoice-padding">{t("settings.organization.invoicePadding")}</Label>
						<Input
							id="organization-invoice-padding"
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
						<Label htmlFor="organization-company-email">{t("common.email")}</Label>
						<Input
							id="organization-company-email"
							value={(form.companyEmail as string) ?? ""}
							onChange={(e) => setField("companyEmail", e.target.value)}
						/>
					</div>
					<div>
						<Label htmlFor="organization-company-phone">{t("common.phone")}</Label>
						<Input
							id="organization-company-phone"
							value={(form.companyPhone as string) ?? ""}
							onChange={(e) => setField("companyPhone", e.target.value)}
						/>
					</div>
					<div className="md:col-span-2">
						<Label htmlFor="organization-company-address">{t("common.address")}</Label>
						<textarea
							id="organization-company-address"
							aria-label={t("common.address")}
							rows={2}
							className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
							value={(form.companyAddress as string) ?? ""}
							onChange={(e) => setField("companyAddress", e.target.value)}
						/>
					</div>
					<div>
						<Label htmlFor="organization-tax-id">{t("settings.organization.taxId")}</Label>
						<Input
							id="organization-tax-id"
							value={(form.taxId as string) ?? ""}
							onChange={(e) => setField("taxId", e.target.value)}
						/>
					</div>
					<div>
						<Label htmlFor="organization-logo-url">{t("settings.organization.logoUrl")}</Label>
						<Input
							id="organization-logo-url"
							value={(form.logoUrl as string) ?? ""}
							onChange={(e) => setField("logoUrl", e.target.value)}
						/>
					</div>
					<div>
						<Label htmlFor="organization-primary-color">{t("settings.organization.primaryColor")}</Label>
						<Input
							id="organization-primary-color"
							value={(form.primaryColor as string) ?? ""}
							onChange={(e) => setField("primaryColor", e.target.value)}
							placeholder="#3b82f6"
						/>
					</div>
					<div className="md:col-span-2">
						<Label htmlFor="organization-email-footer">{t("settings.organization.emailFooter")}</Label>
						<textarea
							id="organization-email-footer"
							aria-label={t("settings.organization.emailFooter")}
							rows={3}
							className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
							value={(form.emailFooter as string) ?? ""}
							onChange={(e) => setField("emailFooter", e.target.value)}
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
