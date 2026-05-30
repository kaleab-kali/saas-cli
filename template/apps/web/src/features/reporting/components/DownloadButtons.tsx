import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadDashboard, type ExportFormat } from "../api/reporting.hooks";

type Kind = "main";

interface Props {
	readonly kind: Kind;
}

export const DownloadButtons = React.memo(
	({ kind }: Props) => {
		const { t } = useTranslation();
		const [busy, setBusy] = React.useState<ExportFormat | null>(null);
		const handler = React.useCallback(
			async (fmt: ExportFormat) => {
				try {
					setBusy(fmt);
					await downloadDashboard(kind, fmt);
					toast.success(t("reports.downloadButtons.downloaded", { format: fmt.toUpperCase() }));
				} catch (e) {
					toast.error(e instanceof Error ? e.message : t("reports.downloadButtons.failed"));
				} finally {
					setBusy(null);
				}
			},
			[kind, t],
		);
		return (
			<div className="flex gap-2">
				<Button size="sm" variant="outline" disabled={busy !== null} onClick={() => handler("csv")}>
					{busy === "csv" ? "…" : t("reports.downloadButtons.csv")}
				</Button>
				<Button size="sm" variant="outline" disabled={busy !== null} onClick={() => handler("xlsx")}>
					{busy === "xlsx" ? "…" : t("reports.downloadButtons.excel")}
				</Button>
				<Button size="sm" variant="outline" disabled={busy !== null} onClick={() => handler("pdf")}>
					{busy === "pdf" ? "…" : t("reports.downloadButtons.pdf")}
				</Button>
			</div>
		);
	},
	(p, n) => p.kind === n.kind,
);
DownloadButtons.displayName = "DownloadButtons";
