import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useJobQueues, useJobRuns, useJobs, useTriggerJob } from "#features/admin/api/admin-jobs.hooks";
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
		const { data: queueMonitor } = useJobQueues();
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
						<CardTitle className="text-base">BullMQ queues</CardTitle>
					</CardHeader>
					<CardContent>
						{!queueMonitor?.enabled ? (
							<p className="text-sm text-muted-foreground">
								{queueMonitor?.reason ?? "Queue monitor disabled."} Set REDIS_URL and BULLMQ_QUEUES to inspect real
								queues.
							</p>
						) : queueMonitor.queues.length === 0 ? (
							<p className="text-sm text-muted-foreground">No queues configured.</p>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{queueMonitor.queues.map((queue) => (
									<div key={queue.name} className="rounded-md border p-3 space-y-2">
										<div className="font-mono text-sm font-semibold">{queue.name}</div>
										<div className="grid grid-cols-2 gap-2 text-xs">
											{Object.entries(queue.counts).map(([key, value]) => (
												<div key={key} className="flex items-center justify-between">
													<span className="text-muted-foreground">{key}</span>
													<span className="font-mono">{value}</span>
												</div>
											))}
										</div>
										{queue.failed.length > 0 && (
											<div className="border-t pt-2 space-y-1">
												<div className="text-xs font-medium text-destructive">Recent failures</div>
												{queue.failed.map((job) => (
													<div key={job.id} className="text-[11px] text-muted-foreground truncate">
														{job.name}: {job.failedReason ?? "failed"}
													</div>
												))}
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

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
