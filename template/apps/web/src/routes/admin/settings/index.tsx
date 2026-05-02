import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAdminPlatformSettings, useUpdatePlatformSetting } from "#features/admin/api/admin-settings.hooks";
import { api } from "#shared/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/settings/")({
	component: AdminSettingsPage,
});

interface FeatureFlag {
	id: string;
	name: string;
	description: string | null;
	enabledGlobal: boolean;
}

type SettingType = "number" | "boolean" | "string" | "json" | "email";

interface SettingSpec {
	readonly key: string;
	readonly label: string;
	readonly help: string;
	readonly type: SettingType;
	readonly unit?: string;
}

interface GroupSpec {
	readonly title: string;
	readonly description: string;
	readonly keys: readonly SettingSpec[];
}

const SPEC = (t: (k: string, o?: Record<string, unknown>) => string): Record<string, GroupSpec> => ({
	billing: {
		title: t("admin.platformSet.billing.title", { defaultValue: "Billing & Invoicing" }),
		description: t("admin.platformSet.billing.desc", {
			defaultValue: "VAT, invoice numbering, grace periods, reminders, payment methods.",
		}),
		keys: [
			{
				key: "billing.vatRate",
				label: t("admin.platformSet.field.vatRate", { defaultValue: "VAT rate" }),
				help: t("admin.platformSet.help.vatRate", {
					defaultValue: "Applied to all subscription invoices (Ethiopian default 15).",
				}),
				type: "number",
				unit: "%",
			},
			{
				key: "billing.vatEnabled",
				label: t("admin.platformSet.field.vatEnabled", { defaultValue: "VAT enabled" }),
				help: t("admin.platformSet.help.vatEnabled", {
					defaultValue: "If off, invoices exclude VAT line and compute total = subtotal.",
				}),
				type: "boolean",
			},
			{
				key: "billing.currencyDefault",
				label: t("admin.platformSet.field.currency", { defaultValue: "Default currency" }),
				help: t("admin.platformSet.help.currency", { defaultValue: "3-letter ISO currency for new subscriptions." }),
				type: "string",
			},
			{
				key: "billing.invoicePrefix",
				label: t("admin.platformSet.field.invoicePrefix", { defaultValue: "Invoice prefix" }),
				help: t("admin.platformSet.help.invoicePrefix", {
					defaultValue: "Used for invoice numbers e.g. PF-INV-2026-00001.",
				}),
				type: "string",
			},
			{
				key: "billing.invoiceYearReset",
				label: t("admin.platformSet.field.invoiceYearReset", { defaultValue: "Reset invoice counter yearly" }),
				help: t("admin.platformSet.help.invoiceYearReset", {
					defaultValue: "If on, invoice numbers reset each calendar year.",
				}),
				type: "boolean",
			},
			{
				key: "billing.paymentDueDays",
				label: t("admin.platformSet.field.paymentDueDays", { defaultValue: "Payment due after" }),
				help: t("admin.platformSet.help.paymentDueDays", {
					defaultValue: "Days from invoice issue date to due date.",
				}),
				type: "number",
				unit: t("admin.platformSet.unit.days", { defaultValue: "days" }),
			},
			{
				key: "billing.gracePeriodDays",
				label: t("admin.platformSet.field.gracePeriodDays", { defaultValue: "Grace period" }),
				help: t("admin.platformSet.help.gracePeriodDays", {
					defaultValue: "After due date, client keeps full access this many days (warning banner shown).",
				}),
				type: "number",
				unit: t("admin.platformSet.unit.days", { defaultValue: "days" }),
			},
			{
				key: "billing.readOnlyPeriodDays",
				label: t("admin.platformSet.field.readOnlyPeriodDays", { defaultValue: "Read-only period" }),
				help: t("admin.platformSet.help.readOnlyPeriodDays", {
					defaultValue: "After grace, writes are blocked this many days before full lockout.",
				}),
				type: "number",
				unit: t("admin.platformSet.unit.days", { defaultValue: "days" }),
			},
			{
				key: "billing.lockoutAfterDays",
				label: t("admin.platformSet.field.lockoutAfterDays", { defaultValue: "Full lockout after" }),
				help: t("admin.platformSet.help.lockoutAfterDays", {
					defaultValue: "Total days past due before entire app is blocked (only billing accessible).",
				}),
				type: "number",
				unit: t("admin.platformSet.unit.days", { defaultValue: "days" }),
			},
			{
				key: "billing.reminderSchedule",
				label: t("admin.platformSet.field.reminderSchedule", { defaultValue: "Reminder schedule" }),
				help: t("admin.platformSet.help.reminderSchedule", {
					defaultValue:
						"JSON array of day offsets from due date, e.g. [-7,-3,0,7]. Negative = before, positive = after.",
				}),
				type: "json",
			},
			{
				key: "billing.autoSendInvoice",
				label: t("admin.platformSet.field.autoSendInvoice", { defaultValue: "Auto-send invoices" }),
				help: t("admin.platformSet.help.autoSendInvoice", {
					defaultValue: "Email invoice to client automatically once generated.",
				}),
				type: "boolean",
			},
			{
				key: "billing.autoGenerateRenewalInvoice",
				label: t("admin.platformSet.field.autoGenerateRenewal", { defaultValue: "Auto-generate renewal invoices" }),
				help: t("admin.platformSet.help.autoGenerateRenewal", {
					defaultValue: "Daily cron creates renewal invoice when subscription period expires.",
				}),
				type: "boolean",
			},
			{
				key: "billing.chapaEnabled",
				label: t("admin.platformSet.field.chapaEnabled", { defaultValue: "Chapa online payments" }),
				help: t("admin.platformSet.help.chapaEnabled", {
					defaultValue: "Enable Chapa gateway for subscriptions and invoice payments.",
				}),
				type: "boolean",
			},
			{
				key: "billing.manualPaymentMethods",
				label: t("admin.platformSet.field.manualPaymentMethods", { defaultValue: "Manual payment methods" }),
				help: t("admin.platformSet.help.manualPaymentMethods", {
					defaultValue:
						"JSON array: offline options clients can pay with (cash, bank_transfer, telebirr, cbe_birr, cheque).",
				}),
				type: "json",
			},
		],
	},
	platform: {
		title: t("admin.platformSet.platform.title", { defaultValue: "Platform Branding & Contacts" }),
		description: t("admin.platformSet.platform.desc", {
			defaultValue: "Contact info shown on invoices + in dunning emails.",
		}),
		keys: [
			{
				key: "platform.companyName",
				label: t("admin.platformSet.field.companyName", { defaultValue: "Company name" }),
				help: t("admin.platformSet.help.companyName", { defaultValue: "Shown on invoice headers and emails." }),
				type: "string",
			},
			{
				key: "platform.companyAddress",
				label: t("admin.platformSet.field.companyAddress", { defaultValue: "Company address" }),
				help: t("admin.platformSet.help.companyAddress", { defaultValue: "Printed on VAT invoices." }),
				type: "string",
			},
			{
				key: "platform.companyTin",
				label: t("admin.platformSet.field.companyTin", { defaultValue: "Tax Identification Number (TIN)" }),
				help: t("admin.platformSet.help.companyTin", {
					defaultValue: "Ethiopian TIN required on VAT invoices.",
				}),
				type: "string",
			},
			{
				key: "platform.supportEmail",
				label: t("admin.platformSet.field.supportEmail", { defaultValue: "Support email" }),
				help: t("admin.platformSet.help.supportEmail", { defaultValue: "Reply-to address on support messages." }),
				type: "email",
			},
			{
				key: "platform.supportPhone",
				label: t("admin.platformSet.field.supportPhone", { defaultValue: "Support phone" }),
				help: t("admin.platformSet.help.supportPhone", { defaultValue: "Shown on paywall + lockout screens." }),
				type: "string",
			},
			{
				key: "platform.dunningFromEmail",
				label: t("admin.platformSet.field.dunningFromEmail", { defaultValue: "Dunning From email" }),
				help: t("admin.platformSet.help.dunningFromEmail", {
					defaultValue: "From address used for overdue / grace / locked notification emails.",
				}),
				type: "email",
			},
		],
	},
	dunning: {
		title: t("admin.platformSet.dunning.title", { defaultValue: "Dunning Email Template Mapping" }),
		description: t("admin.platformSet.dunning.desc", {
			defaultValue: "Map each lifecycle event to an Email Template key (edit template bodies under Templates).",
		}),
		keys: [
			{
				key: "dunning.templateKey.reminder",
				label: t("admin.platformSet.field.tplReminder", { defaultValue: "Reminder (before due)" }),
				help: t("admin.platformSet.help.tplReminder", {
					defaultValue: "Template used for pre-due reminder emails.",
				}),
				type: "string",
			},
			{
				key: "dunning.templateKey.overdue",
				label: t("admin.platformSet.field.tplOverdue", { defaultValue: "Overdue (after due)" }),
				help: t("admin.platformSet.help.tplOverdue", { defaultValue: "Template for overdue invoices." }),
				type: "string",
			},
			{
				key: "dunning.templateKey.grace",
				label: t("admin.platformSet.field.tplGrace", { defaultValue: "Grace period entry" }),
				help: t("admin.platformSet.help.tplGrace", {
					defaultValue: "Sent when subscription enters grace state.",
				}),
				type: "string",
			},
			{
				key: "dunning.templateKey.readOnly",
				label: t("admin.platformSet.field.tplReadOnly", { defaultValue: "Read-only entry" }),
				help: t("admin.platformSet.help.tplReadOnly", {
					defaultValue: "Sent when write access is revoked.",
				}),
				type: "string",
			},
			{
				key: "dunning.templateKey.locked",
				label: t("admin.platformSet.field.tplLocked", { defaultValue: "Locked entry" }),
				help: t("admin.platformSet.help.tplLocked", {
					defaultValue: "Sent on full account lockout.",
				}),
				type: "string",
			},
			{
				key: "dunning.templateKey.renewal",
				label: t("admin.platformSet.field.tplRenewal", { defaultValue: "Renewal invoice" }),
				help: t("admin.platformSet.help.tplRenewal", {
					defaultValue: "Sent when auto-renewal invoice is generated.",
				}),
				type: "string",
			},
		],
	},
});

const BoolControl = React.memo(
	({ value, onChange }: { readonly value: string; readonly onChange: (v: string) => void }) => (
		<Select value={value === "true" ? "true" : "false"} onValueChange={onChange}>
			<SelectTrigger className="w-32">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="true">Enabled</SelectItem>
				<SelectItem value="false">Disabled</SelectItem>
			</SelectContent>
		</Select>
	),
	(prev, next) => prev.value === next.value,
);
BoolControl.displayName = "BoolControl";

const SettingRow = React.memo(
	({ spec, value }: { readonly spec: SettingSpec; readonly value: string }) => {
		const { t } = useTranslation();
		const [draft, setDraft] = React.useState(value);
		const update = useUpdatePlatformSetting();
		React.useEffect(() => setDraft(value), [value]);
		const dirty = draft !== value;
		const handleSave = React.useCallback(() => {
			update.mutate({ key: spec.key, value: draft });
		}, [update, spec.key, draft]);

		const renderInput = () => {
			if (spec.type === "boolean") return <BoolControl value={draft} onChange={setDraft} />;
			if (spec.type === "number") {
				return (
					<div className="flex items-center gap-2">
						<Input type="number" value={draft} onChange={(e) => setDraft(e.target.value)} className="w-32" />
						{spec.unit && <span className="text-xs text-muted-foreground">{spec.unit}</span>}
					</div>
				);
			}
			if (spec.type === "json") {
				return <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="font-mono text-xs" />;
			}
			if (spec.type === "email") {
				return <Input type="email" value={draft} onChange={(e) => setDraft(e.target.value)} />;
			}
			return <Input value={draft} onChange={(e) => setDraft(e.target.value)} />;
		};

		return (
			<div className="py-3 border-b last:border-0">
				<div className="grid grid-cols-[1fr_auto] gap-3 items-start">
					<div className="space-y-1">
						<div className="text-sm font-medium">{spec.label}</div>
						<p className="text-xs text-muted-foreground">{spec.help}</p>
						<code className="text-[10px] text-muted-foreground/70">{spec.key}</code>
					</div>
					<div className="flex items-center gap-2">
						{renderInput()}
						<Button
							size="sm"
							variant={dirty ? "default" : "ghost"}
							disabled={!dirty || update.isPending}
							onClick={handleSave}
						>
							{update.isPending
								? t("common.saving")
								: dirty
									? t("common.save")
									: t("admin.settingsSaved", { defaultValue: "Saved" })}
						</Button>
					</div>
				</div>
			</div>
		);
	},
	(prev, next) => prev.spec.key === next.spec.key && prev.value === next.value,
);
SettingRow.displayName = "SettingRow";

const SettingsGroup = React.memo(
	({ group, map }: { readonly group: GroupSpec; readonly map: Map<string, string> }) => (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{group.title}</CardTitle>
				<p className="text-sm text-muted-foreground">{group.description}</p>
			</CardHeader>
			<CardContent>
				{group.keys.map((s) => (
					<SettingRow key={s.key} spec={s} value={map.get(s.key) ?? ""} />
				))}
			</CardContent>
		</Card>
	),
	(prev, next) => prev.group === next.group && prev.map === next.map,
);
SettingsGroup.displayName = "SettingsGroup";

function AdminSettingsPage() {
	const { t } = useTranslation();
	const { data: flagsData, isLoading } = useQuery({
		queryKey: ["admin", "feature-flags"],
		queryFn: () => api.get<{ data: FeatureFlag[] }>("/admin/settings/feature-flags"),
	});
	const { data: settings = [], isLoading: isSettingsLoading } = useAdminPlatformSettings();

	const flags = flagsData?.data || [];
	const settingsMap = React.useMemo(() => new Map(settings.map((s) => [s.key, s.value])), [settings]);
	const spec = React.useMemo(() => SPEC(t), [t]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">{t("admin.platformSettingsTitle")}</h1>
				<p className="text-muted-foreground mt-1">{t("admin.platformSettingsDesc")}</p>
			</div>

			<Tabs defaultValue="billing">
				<TabsList>
					<TabsTrigger value="billing">{spec.billing.title}</TabsTrigger>
					<TabsTrigger value="platform">{spec.platform.title}</TabsTrigger>
					<TabsTrigger value="dunning">{spec.dunning.title}</TabsTrigger>
					<TabsTrigger value="flags">{t("admin.featureFlags")}</TabsTrigger>
				</TabsList>
				<TabsContent value="billing" className="mt-4">
					{isSettingsLoading ? <Skeleton className="h-64" /> : <SettingsGroup group={spec.billing} map={settingsMap} />}
				</TabsContent>
				<TabsContent value="platform" className="mt-4">
					{isSettingsLoading ? (
						<Skeleton className="h-64" />
					) : (
						<SettingsGroup group={spec.platform} map={settingsMap} />
					)}
				</TabsContent>
				<TabsContent value="dunning" className="mt-4">
					{isSettingsLoading ? <Skeleton className="h-64" /> : <SettingsGroup group={spec.dunning} map={settingsMap} />}
				</TabsContent>
				<TabsContent value="flags" className="mt-4">
					<Card>
						<CardHeader>
							<CardTitle>{t("admin.featureFlags")}</CardTitle>
						</CardHeader>
						<CardContent>
							{isLoading ? (
								<div className="space-y-2">
									{Array.from({ length: 5 }).map((_, i) => (
										<Skeleton key={`flag-${i}`} className="h-10 w-full" />
									))}
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>{t("admin.flagCol")}</TableHead>
											<TableHead>{t("admin.descriptionCol")}</TableHead>
											<TableHead>{t("admin.statusCol")}</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{flags.length === 0 && (
											<TableRow>
												<TableCell colSpan={3} className="text-center text-muted-foreground py-8">
													{t("admin.noFlagsConfigured")}
												</TableCell>
											</TableRow>
										)}
										{flags.map((flag) => (
											<TableRow key={flag.id}>
												<TableCell className="font-mono text-sm">{flag.name}</TableCell>
												<TableCell className="text-muted-foreground">{flag.description || "-"}</TableCell>
												<TableCell>
													{flag.enabledGlobal ? (
														<Badge variant="default">{t("admin.enabled")}</Badge>
													) : (
														<Badge variant="secondary">{t("admin.disabled")}</Badge>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
