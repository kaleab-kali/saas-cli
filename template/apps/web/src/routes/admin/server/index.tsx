import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useServerOverview, useServerResources } from "#features/admin/api/admin-server.hooks";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const bytes = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n / 1024 / 1024);

const ServerPage = React.memo(() => {
	const { data: overview, isLoading } = useServerOverview();
	const { data: resources = {} } = useServerResources();

	if (isLoading) return <Skeleton className="h-96 w-full" />;
	if (!overview) return null;

	const usedHostMemory = overview.host.totalMemoryBytes - overview.host.freeMemoryBytes;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Server Management</h1>
				<p className="text-sm text-muted-foreground">Runtime health, resource usage, and platform object counts.</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase text-muted-foreground">Database</CardTitle>
					</CardHeader>
					<CardContent>
						<Badge variant={overview.dependencies.database.ok ? "default" : "destructive"}>
							{overview.dependencies.database.ok ? "healthy" : "failing"}
						</Badge>
						<div className="mt-2 text-sm text-muted-foreground">{overview.dependencies.database.latencyMs}ms</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase text-muted-foreground">Process Memory</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-semibold font-mono">{bytes(overview.process.rssBytes)} MB</div>
						<div className="text-xs text-muted-foreground">RSS</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase text-muted-foreground">Host Memory</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-semibold font-mono">{bytes(usedHostMemory)} MB</div>
						<div className="text-xs text-muted-foreground">of {bytes(overview.host.totalMemoryBytes)} MB</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs uppercase text-muted-foreground">Requests</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-semibold font-mono">{overview.http.requestsPerSecond1m}</div>
						<div className="text-xs text-muted-foreground">rps 1m, p95 {overview.http.p95LatencyMs}ms</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Runtime</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Node</span>
							<span>{overview.app.nodeVersion}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Environment</span>
							<span>{overview.app.nodeEnv}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Host</span>
							<span>{overview.host.hostname}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">CPU</span>
							<span>{overview.host.cpus} cores</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Load</span>
							<span>
								{overview.host.load1m.toFixed(2)} / {overview.host.load5m.toFixed(2)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Storage</span>
							<span>
								{overview.dependencies.storageDriver}
								{overview.dependencies.storageDriver === "object" && !overview.dependencies.objectStorageConfigured
									? " (missing config)"
									: ""}
							</span>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Platform Resources</CardTitle>
					</CardHeader>
					<CardContent className="grid grid-cols-2 gap-3 text-sm">
						{Object.entries(resources).map(([key, value]) => (
							<div key={key} className="rounded-md border p-3">
								<div className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</div>
								<div className="text-lg font-semibold font-mono">{value}</div>
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
});
ServerPage.displayName = "ServerPage";

export const Route = createFileRoute("/admin/server/")({
	component: ServerPage,
});
