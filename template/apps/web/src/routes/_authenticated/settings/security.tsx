import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSecuritySettings, useUpdateSecuritySettings } from "#features/platform/api/platform.hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings/security")({ component: Page });

function Page() {
	const { t } = useTranslation();
	const { data } = useSecuritySettings();
	const update = useUpdateSecuritySettings();
	const [form, setForm] = React.useState<Record<string, unknown>>({});
	const [ipStr, setIpStr] = React.useState("");

	React.useEffect(() => {
		if (data) {
			setForm(data);
			setIpStr((data.ipAllowlist ?? []).join("\n"));
		}
	}, [data]);

	const setField = React.useCallback((key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value })), []);

	const onSave = React.useCallback(async () => {
		try {
			const ipAllowlist = ipStr
				.split(/\s+/)
				.map((s) => s.trim())
				.filter(Boolean);
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
							max={43200}
							value={(form.sessionTimeoutMinutes as number) ?? 10080}
							onChange={(e) => setField("sessionTimeoutMinutes", Number(e.target.value))}
						/>
					</div>
					<div className="flex items-center justify-between p-2 border rounded">
						<Label>{t("settings.security.force2fa")}</Label>
						<Switch checked={(form.force2fa as boolean) ?? false} onCheckedChange={(v) => setField("force2fa", v)} />
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">{t("settings.security.ipAllowlist")}</CardTitle>
				</CardHeader>
				<CardContent>
					<textarea
						rows={4}
						className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm font-mono"
						value={ipStr}
						onChange={(e) => setIpStr(e.target.value)}
						placeholder="10.0.0.0/24&#10;203.0.113.5"
					/>
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
