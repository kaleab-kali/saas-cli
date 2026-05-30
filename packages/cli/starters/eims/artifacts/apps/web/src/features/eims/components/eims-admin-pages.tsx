import React from "react";
import {
	type EimsAcceptanceRun,
	useAdminEimsAction,
	useAdminEimsCertificates,
	useAdminEimsCompliance,
	useAdminEimsFailures,
	useAdminEimsOverview,
	useAdminEimsResources,
	useAdminEimsTenants,
	useEimsAcceptanceCases,
	useRunAllEimsAcceptanceCases,
	useRunEimsAcceptanceCase,
} from "#features/eims/api/eims.hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TableRows = readonly (readonly string[])[];

function LoadingPanel() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-9 w-72" />
			<Skeleton className="h-40 w-full" />
		</div>
	);
}

function PageHeader({ title, description }: { readonly title: string; readonly description: string }) {
	return (
		<div>
			<h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
			<p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
		</div>
	);
}

function DataTable({ headers, rows }: { readonly headers: readonly string[]; readonly rows: TableRows }) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					{headers.map((header) => (
						<TableHead key={header}>{header}</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row) => (
					<TableRow key={row.join("|")}>
						{row.map((cell, index) => (
							<TableCell
								key={String(index)}
								className={index === row.length - 1 ? "max-w-md whitespace-normal" : undefined}
							>
								{cell}
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function AdminActionPanel({
	title,
	description,
	actions,
}: {
	readonly title: string;
	readonly description: string;
	readonly actions: readonly { label: string; action: string; targetId?: string; variant?: "default" | "outline" }[];
}) {
	const mutation = useAdminEimsAction();
	const [result, setResult] = React.useState<{ message: string; reference?: string; status?: string } | null>(null);
	const run = async (action: string, targetId?: string) => {
		const response = await mutation.mutateAsync({ action, targetId });
		setResult({
			message: response.data.message ?? `Action completed: ${action}`,
			reference: response.data.reference,
			status: response.data.status,
		});
	};
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{title}</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-3">
				<p className="text-sm text-muted-foreground">{description}</p>
				<div className="flex flex-wrap gap-3">
					{actions.map((item) => (
						<Button
							key={`${item.action}:${item.targetId ?? "platform"}`}
							type="button"
							variant={item.variant ?? "default"}
							disabled={mutation.isPending}
							onClick={() => void run(item.action, item.targetId)}
						>
							{item.label}
						</Button>
					))}
				</div>
				{result ? (
					<div className="rounded-md border bg-muted/40 p-3 text-sm">
						<div>{result.message}</div>
						{result.reference ? (
							<div className="mt-1 text-xs text-muted-foreground">Reference: {result.reference}</div>
						) : null}
						{result.status ? <div className="mt-1 text-xs text-muted-foreground">Status: {result.status}</div> : null}
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}

function AcceptanceCaseRunner() {
	const cases = useEimsAcceptanceCases();
	const runCase = useRunEimsAcceptanceCase();
	const runAll = useRunAllEimsAcceptanceCases();
	const [lastRun, setLastRun] = React.useState<EimsAcceptanceRun | null>(null);
	const [summary, setSummary] = React.useState<string | null>(null);

	const executeCase = async (caseId: string) => {
		const result = await runCase.mutateAsync(caseId);
		setLastRun(result.data);
		setSummary(
			`${caseId} ${result.data.passed ? "passed" : "failed"} with ${result.data.assertions.length} assertions`,
		);
	};

	const executeAll = async () => {
		const result = await runAll.mutateAsync();
		setLastRun(result.data.results[0] ?? null);
		setSummary(
			`Provider acceptance suite: ${result.data.passed}/${result.data.total} passed, ${result.data.failed} failed`,
		);
	};

	if (cases.isLoading || !cases.data) return <LoadingPanel />;

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div>
						<CardTitle className="text-base">Provider acceptance cases</CardTitle>
						<p className="mt-1 text-sm text-muted-foreground">
							Internal MoR/BSP scenarios from the source documents and API collection. Tenants do not operate this
							suite.
						</p>
					</div>
					<Button type="button" onClick={executeAll} disabled={runAll.isPending}>
						Run all provider cases
					</Button>
				</div>
			</CardHeader>
			<CardContent className="grid gap-4">
				{summary ? <div className="rounded-md border bg-muted/40 p-3 text-sm">{summary}</div> : null}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Case</TableHead>
							<TableHead>Operation</TableHead>
							<TableHead>Endpoint</TableHead>
							<TableHead>Evidence</TableHead>
							<TableHead>Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{cases.data.data.map((testCase) => (
							<TableRow key={testCase.caseId}>
								<TableCell>
									<div className="font-medium">{testCase.caseId}</div>
									<div className="max-w-sm text-xs text-muted-foreground">{testCase.title}</div>
								</TableCell>
								<TableCell>{testCase.operation}</TableCell>
								<TableCell>
									<code className="text-xs">{testCase.endpoint}</code>
								</TableCell>
								<TableCell className="max-w-sm text-xs text-muted-foreground">
									{testCase.requiredEvidence.join(", ")}
								</TableCell>
								<TableCell>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => void executeCase(testCase.caseId)}
										disabled={runCase.isPending}
									>
										Run {testCase.caseId}
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				{lastRun ? (
					<div className="grid gap-3 rounded-md border p-4">
						<div className="flex flex-wrap items-center gap-3">
							<div className="font-medium">
								{lastRun.caseId}: {lastRun.title}
							</div>
							<span className="rounded-md border px-2 py-1 text-xs">{lastRun.passed ? "passed" : "failed"}</span>
							<span className="rounded-md border px-2 py-1 text-xs">{lastRun.executionMode}</span>
						</div>
						<DataTable
							headers={["Assertion", "Result", "Expected", "Actual"]}
							rows={lastRun.assertions.map((assertion) => [
								assertion.name,
								assertion.passed ? "passed" : "failed",
								assertion.expected,
								assertion.actual,
							])}
						/>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}

export function AdminEimsOverviewPage() {
	const { data, isLoading } = useAdminEimsOverview();
	if (isLoading || !data) return <LoadingPanel />;
	const overview = data.data;
	const stats = [
		["Tenants", String(overview.tenantsTotal)],
		["Blocked", String(overview.tenantsBlocked)],
		["Accepted Today", String(overview.acceptedToday)],
		["Pending Offline", String(overview.pendingOffline)],
		["Unknown", String(overview.unknownSubmissions)],
		["Cert Alerts", String(overview.certificateAlerts)],
	] as const;

	return (
		<div className="space-y-5">
			<PageHeader
				title="Platform EIMS Operations"
				description="Super-admin view across tenants, source queues, certificate risks, and backend EIMS test-connector failures."
			/>
			<div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
				{stats.map(([label, value]) => (
					<Card key={label}>
						<CardContent className="p-4">
							<p className="text-xs uppercase text-muted-foreground">{label}</p>
							<p className="mt-2 text-2xl font-semibold">{value}</p>
						</CardContent>
					</Card>
				))}
			</div>
			<AdminActionPanel
				title="Platform Controls"
				description="Operational actions that super admins need before sandbox access: pause queues, run health checks, and generate evidence."
				actions={[
					{ label: "Run EIMS health check", action: "platform.health-check" },
					{ label: "Pause all unknown queues", action: "platform.pause-unknown", variant: "outline" },
					{ label: "Generate evidence package", action: "platform.generate-evidence", variant: "outline" },
				]}
			/>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Latest Failures</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Tenant", "Source", "Error", "Category", "Action"]}
						rows={overview.latestFailures.map((row) => [
							row.tenant,
							row.sourceSystem,
							row.errorCode,
							row.category,
							row.recommendedAction,
						])}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function AdminEimsTenantsPage() {
	const { data, isLoading } = useAdminEimsTenants();
	if (isLoading || !data) return <LoadingPanel />;

	return (
		<div className="space-y-5">
			<PageHeader title="EIMS Tenants" description="Tenant readiness and throughput by branch/source footprint." />
			<AdminActionPanel
				title="Tenant Onboarding Operations"
				description="Use these controls when a subscribed tenant asks to enable EIMS or gets blocked during setup."
				actions={[
					{ label: "Review Habesha onboarding", action: "tenant.review-onboarding", targetId: "org_mock_1" },
					{
						label: "Escalate Shoa credential blocker",
						action: "tenant.escalate-blocker",
						targetId: "org_mock_2",
						variant: "outline",
					},
				]}
			/>
			<Card>
				<CardContent className="p-0">
					<DataTable
						headers={["Tenant", "Status", "Branches", "Sources", "Accepted", "Pending", "Subscription"]}
						rows={data.data.map((row) => [
							row.name,
							row.status,
							String(row.branches),
							String(row.sources),
							String(row.acceptedToday),
							String(row.pendingOffline),
							row.status === "ready" ? "EIMS add-on active" : "EIMS add-on blocked",
						])}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function AdminEimsFailuresPage() {
	const { data, isLoading } = useAdminEimsFailures();
	if (isLoading || !data) return <LoadingPanel />;

	return (
		<div className="space-y-5">
			<PageHeader
				title="EIMS Failures"
				description="Error classification and operator action list for retryable, rule, and manual-intervention failures."
			/>
			<AdminActionPanel
				title="Failure Queue Operations"
				description="Retry only retryable failures; rule errors stay blocked until the source counter and PreviousIrn chain are reconciled."
				actions={[
					{ label: "Retry OCSP failure", action: "failure.retry", targetId: "fail_mock_2" },
					{
						label: "Mark 7015 manual review",
						action: "failure.manual-review",
						targetId: "fail_mock_1",
						variant: "outline",
					},
				]}
			/>
			<Card>
				<CardContent className="p-0">
					<DataTable
						headers={["Tenant", "Source", "Error", "Category", "Action"]}
						rows={data.data.map((row) => [
							row.tenant,
							row.sourceSystem,
							row.errorCode,
							row.category,
							row.recommendedAction,
						])}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function AdminEimsCertificatesPage() {
	const { data, isLoading } = useAdminEimsCertificates();
	if (isLoading || !data) return <LoadingPanel />;

	return (
		<div className="space-y-5">
			<PageHeader title="EIMS Certificates" description="Platform certificate expiry and revocation watchlist." />
			<AdminActionPanel
				title="Certificate Renewal Operations"
				description="Send renewal reminders, disable revoked sources, or start assisted certificate rotation."
				actions={[
					{ label: "Send Habesha renewal reminder", action: "certificate.renewal-reminder", targetId: "cert_habesha" },
					{
						label: "Open rotation checklist",
						action: "certificate.rotation-checklist",
						targetId: "cert_habesha",
						variant: "outline",
					},
				]}
			/>
			<Card>
				<CardContent className="p-0">
					<DataTable
						headers={["Tenant", "Source", "Valid To", "Status"]}
						rows={data.data.map((row) => [row.tenant, row.sourceSystem, row.validTo, row.status])}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function AdminEimsResourcesPage() {
	const { data, isLoading } = useAdminEimsResources();
	if (isLoading || !data) return <LoadingPanel />;

	return (
		<div className="space-y-5">
			<PageHeader
				title="EIMS Resources"
				description="Queue, signing provider, Vault, and MoR endpoint status for operations."
			/>
			<AdminActionPanel
				title="Runtime Operations"
				description="Source queues and Vault availability need explicit controls because unknown submissions must block safely."
				actions={[
					{ label: "Test Vault signer", action: "resource.test-vault" },
					{ label: "Resume healthy queues", action: "resource.resume-queues", variant: "outline" },
					{ label: "Pause pending approval queues", action: "resource.pause-pending", variant: "outline" },
				]}
			/>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Queues</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Name", "Depth", "Status"]}
						rows={data.data.queues.map((row) => [row.name, String(row.depth), row.status])}
					/>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Signing and MoR Connectivity</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Control", "Status", "Detail"]}
						rows={[
							["Vault", data.data.vault.status, data.data.vault.provider],
							["MoR sandbox", data.data.mor.sandbox, "sandbox"],
							["MoR production", data.data.mor.production, "production"],
						]}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function AdminEimsCompliancePage() {
	const { data, isLoading } = useAdminEimsCompliance();
	if (isLoading || !data) return <LoadingPanel />;
	const rows = [
		...data.data.ready.map((item) => [item, "ready"]),
		...data.data.missing.map((item) => [item, "missing"]),
	];

	return (
		<div className="space-y-5">
			<PageHeader
				title="EIMS Compliance"
				description="Platform evidence readiness for INSA/MoR paperwork and audits."
			/>
			<AdminActionPanel
				title="Compliance Package Operations"
				description="Generate and track audit evidence for architecture, RLS, Vault, DR, guarantee, and test results."
				actions={[
					{ label: "Generate platform evidence", action: "compliance.generate-evidence" },
					{ label: "Record guarantee renewal check", action: "compliance.guarantee-renewal", variant: "outline" },
				]}
			/>
			<AcceptanceCaseRunner />
			<Card>
				<CardContent className="p-4">
					<p className="text-sm text-muted-foreground">Readiness</p>
					<p className="mt-1 text-3xl font-semibold">{data.data.readiness}%</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="p-0">
					<DataTable headers={["Evidence", "Status"]} rows={rows} />
				</CardContent>
			</Card>
		</div>
	);
}
