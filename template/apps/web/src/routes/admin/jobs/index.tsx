import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import {
	type JobRun,
	useJobQueues,
	useJobRuns,
	useJobs,
	useRetryQueueJob,
	useTriggerJob,
} from "#features/admin/api/admin-jobs.hooks";
import { DataTable } from "#shared/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const statusVariant = {
	running: "secondary" as const,
	success: "default" as const,
	failed: "destructive" as const,
};

const formatDateTime = (value: string | number) =>
	new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const JobsPage = React.memo(
	() => {
		const { data: jobs = [], isLoading } = useJobs();
		const { data: runs = [] } = useJobRuns();
		const { data: queueMonitor } = useJobQueues();
		const trigger = useTriggerJob();
		const retryQueueJob = useRetryQueueJob();
		const runColumns = React.useMemo<ColumnDef<JobRun, unknown>[]>(
			() => [
				{
					accessorKey: "jobName",
					header: "Job",
					cell: ({ row }) => <span className="font-mono text-xs">{row.original.jobName}</span>,
				},
				{
					accessorKey: "status",
					header: "Status",
					cell: ({ row }) => <Badge variant={statusVariant[row.original.status]}>{row.original.status}</Badge>,
					meta: {
						filter: {
							type: "select",
							options: [
								{ value: "running", label: "Running" },
								{ value: "success", label: "Success" },
								{ value: "failed", label: "Failed" },
							],
						},
					},
				},
				{
					accessorKey: "startedAt",
					header: "Started",
					cell: ({ row }) => formatDateTime(row.original.startedAt),
				},
				{
					accessorKey: "durationMs",
					header: "Duration",
					cell: ({ row }) => <span className="font-mono">{row.original.durationMs ?? "-"} ms</span>,
				},
				{
					id: "trigger",
					accessorFn: (row) => (row.triggeredByUserId ? "manual" : "scheduled"),
					header: "Trigger",
					cell: ({ row }) => (row.original.triggeredByUserId ? "manual" : "scheduled"),
				},
				{
					id: "summary",
					accessorFn: (row) => row.summary || row.errorMessage || "",
					header: "Summary",
					cell: ({ row }) => (
						<span className="block max-w-md truncate text-xs text-muted-foreground">
							{row.original.summary || row.original.errorMessage || "-"}
						</span>
					),
				},
			],
			[],
		);

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
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						{jobs.map((job) => (
							<Card key={job.name}>
								<CardHeader>
									<CardTitle className="text-base font-mono">{job.name}</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2 text-sm">
									{job.lastRun ? (
										<>
											<div className="flex items-center justify-between">
												<span className="text-muted-foreground">Status</span>
												<Badge variant={statusVariant[job.lastRun.status]}>{job.lastRun.status}</Badge>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-muted-foreground">Last run</span>
												<span>{formatDateTime(job.lastRun.startedAt)}</span>
											</div>
											{job.lastRun.durationMs !== null && (
												<div className="flex items-center justify-between">
													<span className="text-muted-foreground">Duration</span>
													<span className="font-mono">{job.lastRun.durationMs}ms</span>
												</div>
											)}
											{job.lastRun.summary && (
												<div className="border-t pt-2 text-xs text-muted-foreground">{job.lastRun.summary}</div>
											)}
											{job.lastRun.errorMessage && (
												<div className="border-t pt-2 text-xs text-destructive">{job.lastRun.errorMessage}</div>
											)}
										</>
									) : (
										<p className="text-xs text-muted-foreground">Never run.</p>
									)}
									<Button
										size="sm"
										className="mt-2 w-full"
										onClick={() => trigger.mutate(job.name)}
										disabled={trigger.isPending || job.lastRun?.status === "running"}
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
							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								{queueMonitor.queues.map((queue) => (
									<div key={queue.name} className="space-y-2 rounded-md border p-3">
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
											<div className="space-y-1 border-t pt-2">
												<div className="text-xs font-medium text-destructive">Recent failures</div>
												{queue.failed.map((job) => (
													<div key={job.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
														<div className="min-w-0 flex-1 truncate">
															{job.name}: {job.failedReason ?? "failed"}
														</div>
														<Button
															size="sm"
															variant="outline"
															onClick={() => retryQueueJob.mutate({ queueName: queue.name, jobId: job.id })}
															disabled={retryQueueJob.isPending}
														>
															Retry
														</Button>
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
					<CardContent>
						<DataTable
							columns={runColumns}
							data={runs}
							searchPlaceholder="Search job runs..."
							emptyMessage="No runs yet."
							pageSize={10}
							enableCsvExport
							exportFilename="job-runs.csv"
							getRowId={(run) => run.id}
						/>
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
