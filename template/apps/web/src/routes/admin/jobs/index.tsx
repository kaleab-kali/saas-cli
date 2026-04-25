import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useJobRuns, useJobs, useTriggerJob } from "#features/admin/api/admin-jobs.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const statusVariant = {
	running: "secondary" as const,
	success: "default" as const,
	failed: "destructive" as const,
};

const JobsPage = React.memo(
	() => {
		const { data: jobs = [], isLoading } = useJobs();
		const { data: runs = [] } = useJobRuns();
		const trigger = useTriggerJob();

		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">Scheduled Jobs</h1>
					<p className="text-sm text-muted-foreground">
						Platform background tasks. Click Run now to trigger manually; runs are logged.
					</p>
				</div>

				{isLoading ? (
					<Skeleton className="h-48 w-full" />
				) : (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{jobs.map((j) => (
							<Card key={j.name}>
								<CardHeader>
									<CardTitle className="text-base font-mono">{j.name}</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2 text-sm">
									{j.lastRun ? (
										<>
											<div className="flex items-center justify-between">
												<span className="text-muted-foreground">Status</span>
												<Badge variant={statusVariant[j.lastRun.status]}>{j.lastRun.status}</Badge>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-muted-foreground">Last run</span>
												<span>{new Date(j.lastRun.startedAt).toLocaleString()}</span>
											</div>
											{j.lastRun.durationMs !== null && (
												<div className="flex items-center justify-between">
													<span className="text-muted-foreground">Duration</span>
													<span className="font-mono">{j.lastRun.durationMs}ms</span>
												</div>
											)}
											{j.lastRun.summary && (
												<div className="text-xs text-muted-foreground border-t pt-2">{j.lastRun.summary}</div>
											)}
											{j.lastRun.errorMessage && (
												<div className="text-xs text-destructive border-t pt-2">{j.lastRun.errorMessage}</div>
											)}
										</>
									) : (
										<p className="text-muted-foreground text-xs">Never run.</p>
									)}
									<Button
										size="sm"
										className="w-full mt-2"
										onClick={() => trigger.mutate(j.name)}
										disabled={trigger.isPending || j.lastRun?.status === "running"}
									>
										{trigger.isPending ? "Triggering..." : "Run now"}
									</Button>
								</CardContent>
							</Card>
						))}
					</div>
				)}

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Recent runs (50)</CardTitle>
					</CardHeader>
					<CardContent className="p-0 overflow-x-auto">
						{runs.length === 0 ? (
							<p className="text-sm text-muted-foreground p-4 text-center">No runs yet.</p>
						) : (
							<table className="w-full text-sm">
								<thead className="bg-muted/40">
									<tr>
										<th className="text-left p-2">Job</th>
										<th className="text-left p-2">Status</th>
										<th className="text-left p-2">Started</th>
										<th className="text-right p-2">Duration</th>
										<th className="text-left p-2">Trigger</th>
										<th className="text-left p-2">Summary</th>
									</tr>
								</thead>
								<tbody>
									{runs.map((r) => (
										<tr key={r.id} className="border-t">
											<td className="p-2 font-mono text-xs">{r.jobName}</td>
											<td className="p-2">
												<Badge variant={statusVariant[r.status]}>{r.status}</Badge>
											</td>
											<td className="p-2">{new Date(r.startedAt).toLocaleString()}</td>
											<td className="p-2 text-right font-mono">{r.durationMs ?? "—"} ms</td>
											<td className="p-2 text-xs">{r.triggeredByUserId ? "manual" : "scheduled"}</td>
											<td className="p-2 text-xs text-muted-foreground max-w-md truncate">
												{r.summary || r.errorMessage || "—"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</CardContent>
				</Card>
			</div>
		);
	},
	() => true,
);
JobsPage.displayName = "JobsPage";

export const Route = createFileRoute("/admin/jobs/")({
	component: JobsPage,
});
