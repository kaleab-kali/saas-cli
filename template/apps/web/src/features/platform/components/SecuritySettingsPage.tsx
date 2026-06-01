import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	type SecuritySettings,
	useSecuritySettings,
	useUpdateSecuritySettings,
} from "#features/platform/api/platform.hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type SecuritySettingsForm = Pick<
	SecuritySettings,
	| "passwordMinLength"
	| "passwordRequireUpper"
	| "passwordRequireLower"
	| "passwordRequireDigit"
	| "passwordRequireSymbol"
	| "passwordMaxAgeDays"
	| "sessionTimeoutMinutes"
	| "force2fa"
>;

const toSecuritySettingsForm = (settings: SecuritySettings): SecuritySettingsForm => ({
	passwordMinLength: settings.passwordMinLength,
	passwordRequireUpper: settings.passwordRequireUpper,
	passwordRequireLower: settings.passwordRequireLower,
	passwordRequireDigit: settings.passwordRequireDigit,
	passwordRequireSymbol: settings.passwordRequireSymbol,
	passwordMaxAgeDays: settings.passwordMaxAgeDays,
	sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
	force2fa: settings.force2fa,
});

export function SecuritySettingsPage() {
	const { t } = useTranslation();
	const { data } = useSecuritySettings();
	const update = useUpdateSecuritySettings();
	const [form, setForm] = React.useState<Partial<SecuritySettingsForm>>({});
	const [ipStr, setIpStr] = React.useState("");

	React.useEffect(() => {
		if (data) {
			setForm(toSecuritySettingsForm(data));
			setIpStr((data.ipAllowlist ?? []).join("\n"));
		}
	}, [data]);

	const setField = React.useCallback(
		<K extends keyof SecuritySettingsForm>(key: K, value: SecuritySettingsForm[K]) =>
			setForm((f) => ({ ...f, [key]: value })),
		[],
	);

	const onSave = React.useCallback(async () => {
		try {
			const ipAllowlist = ipStr.split(/\s+/).flatMap((s) => {
				const trimmed = s.trim();
				return trimmed ? [trimmed] : [];
			});
			await update.mutateAsync({ ...form, ipAllowlist });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : t("common.saveFailed"));
		}
	}, [form, ipStr, update, t]);

	return (
		<div className="p-6 space-y-4 max-w-3xl">
			<h1 className="text-2xl font-bold">{t("settings.security.title")}</h1>
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">{t("settings.security.passwordPolicy")}</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<Label>{t("settings.security.minLength")}</Label>
						<Input
							type="number"
							min={6}
							max={128}
							value={(form.passwordMinLength as number) ?? 8}
							onChange={(e) => setField("passwordMinLength", Number(e.target.value))}
						/>
					</div>
					<div>
						<Label>{t("settings.security.maxAge")}</Label>
						<Input
							type="number"
							min={1}
							value={(form.passwordMaxAgeDays as number) ?? ""}
							onChange={(e) => setField("passwordMaxAgeDays", e.target.value ? Number(e.target.value) : null)}
						/>
					</div>
					<div className="flex items-center justify-between p-2 border rounded">
						<Label>{t("settings.security.requireUpper")}</Label>
						<Switch
							checked={(form.passwordRequireUpper as boolean) ?? true}
							onCheckedChange={(v) => setField("passwordRequireUpper", v)}
						/>
					</div>
					<div className="flex items-center justify-between p-2 border rounded">
						<Label>{t("settings.security.requireLower")}</Label>
						<Switch
							checked={(form.passwordRequireLower as boolean) ?? true}
							onCheckedChange={(v) => setField("passwordRequireLower", v)}
						/>
					</div>
					<div className="flex items-center justify-between p-2 border rounded">
						<Label>{t("settings.security.requireDigit")}</Label>
						<Switch
							checked={(form.passwordRequireDigit as boolean) ?? true}
							onCheckedChange={(v) => setField("passwordRequireDigit", v)}
						/>
					</div>
					<div className="flex items-center justify-between p-2 border rounded">
						<Label>{t("settings.security.requireSymbol")}</Label>
						<Switch
							checked={(form.passwordRequireSymbol as boolean) ?? false}
							onCheckedChange={(v) => setField("passwordRequireSymbol", v)}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">{t("settings.security.sessionAnd2fa")}</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<div>
						<Label>{t("settings.security.sessionTimeout")}</Label>
						<Input
							type="number"
							min={5}
							value={(form.sessionTimeoutMinutes as number) ?? 60}
							onChange={(e) => setField("sessionTimeoutMinutes", Number(e.target.value))}
						/>
					</div>
					<div className="flex items-center justify-between p-2 border rounded">
						<Label htmlFor="security-force2fa">{t("settings.security.force2fa")}</Label>
						<Switch
							id="security-force2fa"
							aria-label={t("settings.security.force2fa")}
							checked={(form.force2fa as boolean) ?? false}
							onCheckedChange={(v) => setField("force2fa", v)}
						/>
					</div>
					<div className="md:col-span-2 space-y-1">
						<Label htmlFor="security-ip-allowlist">{t("settings.security.ipAllowlist")}</Label>
						<textarea
							id="security-ip-allowlist"
							className="w-full min-h-24 rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-sm"
							value={ipStr}
							aria-label={t("settings.security.ipAllowlist")}
							onChange={(e) => setIpStr(e.target.value)}
							placeholder="203.0.113.10&#10;198.51.100.0/24"
						/>
					</div>
				</CardContent>
			</Card>

			<Button onClick={onSave} disabled={update.isPending}>
				{update.isPending ? t("common.saving") : t("common.save")}
			</Button>
		</div>
	);
}
