import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAdminAuditLogs } from "#features/admin/api/admin.queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/admin/audit-logs/")({
	component: AuditLogsPage,
});

function AuditLogsPage() {
	const { t } = useTranslation();
	const { data, isLoading } = useAdminAuditLogs();

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h1 className="text-2xl font-semibold">{t("admin.platformAuditLogsTitle")}</h1>
					<p className="text-muted-foreground mt-1">{t("admin.platformAuditLogsDesc")}</p>
				</div>
				<a href="/api/v1/admin/audit-logs/export" target="_blank" rel="noopener noreferrer">
					<Button variant="outline" size="sm">
						Export CSV
					</Button>
				</a>
			</div>

			{isLoading ? (
				<div className="space-y-2">
					{Array.from({ length: 10 }).map((_, i) => (
						<Skeleton key={`log-${i}`} className="h-12 w-full" />
					))}
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("admin.actionCol")}</TableHead>
							<TableHead>{t("admin.targetCol")}</TableHead>
							<TableHead>{t("admin.performedByCol")}</TableHead>
							<TableHead>{t("admin.ipCol")}</TableHead>
							<TableHead>{t("admin.dateCol")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{(!data?.data || data.data.length === 0) && (
							<TableRow>
								<TableCell colSpan={5} className="text-center text-muted-foreground py-8">
									{t("admin.noAuditLogs")}
								</TableCell>
							</TableRow>
						)}
						{data?.data?.map((log) => (
							<TableRow key={log.id}>
								<TableCell>
									<Badge variant="outline">{log.action}</Badge>
								</TableCell>
								<TableCell>
									<span className="text-xs text-muted-foreground">{log.targetType}:</span>{" "}
									<span className="font-mono text-xs">{log.targetId.slice(0, 12)}...</span>
								</TableCell>
								<TableCell className="font-mono text-xs">{log.performedBy.slice(0, 12)}...</TableCell>
								<TableCell className="text-muted-foreground">{log.ipAddress || "-"}</TableCell>
								<TableCell className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	);
}
