import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCreateApiKey } from "#features/platform/api/platform.hooks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function ApiKeyCreateDialog({ onCreated }: { readonly onCreated: (plain: string) => void }) {
	const { t } = useTranslation();
	const [open, setOpen] = React.useState(false);
	const [name, setName] = React.useState("");
	const [scopes, setScopes] = React.useState<string[]>([]);
	const [expiresAt, setExpiresAt] = React.useState("");
	const [rateLimit, setRateLimit] = React.useState("");
	const create = useCreateApiKey();

	const toggle = React.useCallback((scope: string) => {
		setScopes((current) => (current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]));
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
						<Label htmlFor="api-key-name">{t("settings.apiKeysExt.nameCol")}</Label>
						<Input
							id="api-key-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder={t("settings.apiKeysExt.namePlaceholder")}
						/>
					</div>
					<div>
						<Label>{t("settings.apiKeysExt.scopesLabel")}</Label>
						<div className="grid grid-cols-2 gap-1 mt-1 max-h-[200px] overflow-y-auto border rounded p-2">
							{SCOPES.map((scope) => (
								<label key={scope} className="flex items-center gap-2 text-sm">
									<input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggle(scope)} />
									<span className="font-mono text-xs">{scope}</span>
								</label>
							))}
						</div>
					</div>
					<div>
						<Label htmlFor="api-key-expires-at">{t("settings.apiKeysExt.expiresLabel")}</Label>
						<Input
							id="api-key-expires-at"
							type="date"
							value={expiresAt}
							onChange={(event) => setExpiresAt(event.target.value)}
						/>
					</div>
					<div>
						<Label htmlFor="api-key-rate-limit">Requests per minute</Label>
						<Input
							id="api-key-rate-limit"
							type="number"
							min={1}
							value={rateLimit}
							onChange={(event) => setRateLimit(event.target.value)}
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
}
