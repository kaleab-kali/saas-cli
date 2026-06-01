import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ApiKeyPlainKeyDialog({
	plain,
	onClose,
}: {
	readonly plain: string | null;
	readonly onClose: () => void;
}) {
	const { t } = useTranslation();
	const copy = React.useCallback(async () => {
		if (!plain) return;
		try {
			await navigator.clipboard.writeText(plain);
			toast.success(t("settings.apiKeysExt.copied"));
		} catch {
			toast.error(t("settings.apiKeysExt.copyFailed"));
		}
	}, [plain, t]);

	return (
		<Dialog open={!!plain} onOpenChange={(open) => !open && onClose()}>
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
}
