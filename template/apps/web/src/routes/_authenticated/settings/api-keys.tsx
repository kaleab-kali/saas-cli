import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FeatureGate } from "#features/capabilities/components/FeatureGate";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "#features/platform/api/platform.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/settings/api-keys")({ component: Page });

const SCOPES = [
	"admin",
	"read:organization",
	"write:organization",
	"read:member",
	"write:member",
	"read:billing",
	"write:billing",
	"read:notification",
	"write:notification",
	"read:file",
	"write:file",
	"read:report",
	"write:report",
	"read:audit-log",
] as const;

const CreateDialog = React.memo(({ onCreated }: { readonly onCreated: (plain: string) => void }) => {
	const { t } = useTranslation();
	const [open, setOpen] = React.useState(false);
	const [name, setName] = React.useState("");
	const [scopes, setScopes] = React.useState<string[]>([]);
	const [expiresAt, setExpiresAt] = React.useState("");
	const [rateLimit, setRateLimit] = React.useState("");
	const create = useCreateApiKey();

	const toggle = React.useCallback((s: string) => {
		setScopes((curr) => (curr.includes(s) ? curr.filter((x) => x !== s) : [...curr, s]));
	}, []);

	const submit = React.useCallback(async () => {
		if (!name.trim() || scopes.length === 0) {
			toast.error(t("settings.apiKeysExt.nameScopeRequired"));
			return;
		}
		const result = await create.mutateAsync({
			name,
			scopes,
			expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
			rateLimit: rateLimit ? Number(rateLimit) : undefined,
		});
		setOpen(false);
		setName("");
		setScopes([]);
		setExpiresAt("");
		setRateLimit("");
		onCreated(result.data.plainKey);
	}, [name, scopes, expiresAt, rateLimit, create, onCreated, t]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>{t("settings.apiKeys.newKey")}</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("settings.apiKeysExt.createTitle")}</DialogTitle>
				</DialogHeader>
				<div className="space-y-3">
					<div>
						<Label>{t("settings.apiKeysExt.nameCol")}</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={t("settings.apiKeysExt.namePlaceholder")}
						/>
					</div>
					<div>
						<Label>{t("settings.apiKeysExt.scopesLabel")}</Label>
						<div className="grid grid-cols-2 gap-1 mt-1 max-h-[200px] overflow-y-auto border rounded p-2">
							{SCOPES.map((s) => (
								<label key={s} className="flex items-center gap-2 text-sm">
									<input type="checkbox" checked={scopes.includes(s)} onChange={() => toggle(s)} />
									<span className="font-mono text-xs">{s}</span>
								</label>
							))}
						</div>
					</div>
					<div>
						<Label>{t("settings.apiKeysExt.expiresLabel")}</Label>
						<Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
					</div>
					<div>
						<Label htmlFor="api-key-rate-limit">Requests per minute</Label>
						<Input
							id="api-key-rate-limit"
							type="number"
							min={1}
							value={rateLimit}
							onChange={(e) => setRateLimit(e.target.value)}
							placeholder="Use plan tier default"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						{t("settings.apiKeysExt.cancel")}
					</Button>
					<Button onClick={submit} disabled={create.isPending}>
						{t("settings.apiKeysExt.create")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
});
CreateDialog.displayName = "CreateDialog";

const PlainKeyDialog = React.memo(
	({ plain, onClose }: { readonly plain: string | null; readonly onClose: () => void }) => {
		const { t } = useTranslation();
		const copy = React.useCallback(async () => {
			if (!plain) return;
			await navigator.clipboard.writeText(plain);
			toast.success(t("settings.apiKeysExt.copied"));
		}, [plain, t]);
		return (
			<Dialog open={!!plain} onOpenChange={(o) => !o && onClose()}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>{t("settings.apiKeysExt.plainKeyTitle")}</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">{t("settings.apiKeysExt.plainKeyWarning")}</p>
						<div className="p-3 bg-muted rounded font-mono text-xs break-all">{plain}</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={copy}>
							{t("settings.apiKeysExt.copyBtn")}
						</Button>
						<Button onClick={onClose}>{t("settings.apiKeysExt.doneBtn")}</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	},
);
PlainKeyDialog.displayName = "PlainKeyDialog";

function Page() {
	const { t } = useTranslation();
	const [includeRevoked, setIncludeRevoked] = React.useState(false);
	const { data: keys = [] } = useApiKeys(includeRevoked);
	const revoke = useRevokeApiKey();
	const [plain, setPlain] = React.useState<string | null>(null);

	return (
		<div className="p-6 space-y-4 max-w-5xl">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<h1 className="text-2xl font-bold">{t("settings.apiKeys.title")}</h1>
				<div className="flex gap-2 items-center">
					<label className="text-sm flex items-center gap-2">
						<input type="checkbox" checked={includeRevoked} onChange={(e) => setIncludeRevoked(e.target.checked)} />
						{t("settings.apiKeysExt.showRevokedLabel")}
					</label>
					<FeatureGate
						featureKey="platform.api-keys"
						requireCapacity
						fallback={<Button disabled>{t("settings.apiKeys.newKey")}</Button>}
					>
						<CreateDialog onCreated={setPlain} />
					</FeatureGate>
				</div>
			</div>
			<Card>
				<CardContent className="p-0">
					{keys.length === 0 ? (
						<p className="p-4 text-sm text-muted-foreground">{t("settings.apiKeys.noKeys")}</p>
					) : (
						<Table className="w-full text-sm">
							<TableHeader>
								<TableRow className="text-left border-b">
									<TableHead className="py-2 px-3">{t("settings.apiKeysExt.nameCol")}</TableHead>
									<TableHead className="py-2 px-3">{t("settings.apiKeysExt.prefixCol")}</TableHead>
									<TableHead className="py-2 px-3">{t("settings.apiKeysExt.scopesCol")}</TableHead>
									<TableHead className="py-2 px-3">{t("settings.apiKeysExt.expiresCol")}</TableHead>
									<TableHead className="py-2 px-3">{t("settings.apiKeysExt.lastUsedCol")}</TableHead>
									<TableHead className="py-2 px-3">{t("settings.apiKeysExt.usageCol")}</TableHead>
									<TableHead className="py-2 px-3">RPM</TableHead>
									<TableHead className="py-2 px-3">{t("settings.apiKeysExt.statusCol")}</TableHead>
									<TableHead className="py-2 px-3"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{keys.map((k) => (
									<TableRow key={k.id} className="border-b">
										<TableCell className="py-2 px-3 font-medium">{k.name}</TableCell>
										<TableCell className="py-2 px-3 font-mono text-xs">{k.keyPrefix}…</TableCell>
										<TableCell className="py-2 px-3 text-xs">{k.scopes.join(", ")}</TableCell>
										<TableCell className="py-2 px-3 text-xs">
											{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : t("settings.apiKeysExt.neverUsed")}
										</TableCell>
										<TableCell className="py-2 px-3 text-xs">
											{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : t("settings.apiKeysExt.neverUsed")}
										</TableCell>
										<TableCell className="py-2 px-3 text-xs">{k.usageCount}</TableCell>
										<TableCell className="py-2 px-3 text-xs">{k.rateLimit ?? "plan"}</TableCell>
										<TableCell className="py-2 px-3">
											<Badge variant={k.revokedAt ? "secondary" : "default"}>
												{k.revokedAt ? t("settings.apiKeysExt.revokedStatus") : t("settings.apiKeysExt.activeStatus")}
											</Badge>
										</TableCell>
										<TableCell className="py-2 px-3 text-right">
											{!k.revokedAt && (
												<Button size="sm" variant="ghost" onClick={() => revoke.mutate(k.id)}>
													{t("settings.apiKeysExt.revokeBtn")}
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
			<PlainKeyDialog plain={plain} onClose={() => setPlain(null)} />
		</div>
	);
}
