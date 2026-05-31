import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import {
	type EimsAcceptanceCase,
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
import { DataTable as SharedDataTable } from "#shared/components/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type TableRows = readonly (readonly string[])[];
type RecordTableRow = {
	readonly id: string;
	readonly values: readonly string[];
	readonly byHeader: Record<string, string>;
};

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
	const tableRows = React.useMemo<RecordTableRow[]>(
		() =>
			rows.map((row, index) => ({
				id: `${index}-${row.join("|")}`,
				values: row,
				byHeader: Object.fromEntries(headers.map((header, cellIndex) => [header, row[cellIndex] ?? ""])),
			})),
		[headers, rows],
	);
	const columns = React.useMemo<ColumnDef<RecordTableRow, string>[]>(
		() =>
			headers.map((header, index) => ({
				id: `${header}-${index}`,
				accessorFn: (row) => row.byHeader[header] ?? row.values[index] ?? "",
				header,
				cell: ({ row }) => row.original.values[index] ?? "",
				meta: {
					filter: { type: "text" },
					className: index === headers.length - 1 ? "max-w-md whitespace-normal" : undefined,
				},
			})),
		[headers],
	);

	return (
		<SharedDataTable
			columns={columns}
			data={tableRows}
			enableColumnVisibility={false}
			emptyTitle="No operational records"
			emptyMessage="No EIMS platform records match this view."
			getRowId={(row) => row.id}
			pageSize={10}
			searchPlaceholder="Search EIMS operations..."
			totalCount={tableRows.length}
		/>
	);
}

function AdminOperationsHero({ stats }: { readonly stats: readonly (readonly [string, string])[] }) {
	return (
		<section className="overflow-hidden rounded-md border border-[#3a2217] bg-[#1a130f] text-white">
			<div className="grid gap-5 p-5 xl:grid-cols-[1fr_0.85fr] xl:p-6">
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="rounded-md bg-[#f2b36d] px-2.5 py-1 text-xs font-medium text-[#25170c]">
							Platform EIMS command center
						</span>
						<span className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/70">
							Cross-tenant controls
						</span>
					</div>
					<h1 className="mt-3 text-2xl font-semibold tracking-normal md:text-3xl">Platform EIMS Operations</h1>
					<p className="mt-2 max-w-3xl text-sm leading-6 text-white/68">
						Track blocked tenants, retry queues, certificate expiry, compliance evidence, and source approval health
						before they reach support escalations.
					</p>
				</div>
				<div className="grid gap-2 sm:grid-cols-3">
					{stats.slice(0, 6).map(([label, value]) => (
						<div key={label} className="rounded-md border border-white/10 bg-white/[0.06] p-3">
							<div className="text-xs uppercase text-white/48">{label}</div>
							<div className="mt-1 text-2xl font-semibold">{value}</div>
						</div>
					))}
				</div>
			</div>
			<div className="grid border-t border-white/10 bg-white/[0.03] text-sm md:grid-cols-4">
				{["Tenants", "Failure queue", "Certificates", "Evidence"].map((label) => (
					<div key={label} className="border-white/10 px-5 py-3 text-white/70 md:border-r last:md:border-r-0">
						{label}
					</div>
				))}
			</div>
		</section>
	);
}

const adminLaunchLanes = [
	{
		title: "Tenant intake lane",
		detail: "Payment proof, TIN, owner contact, and organization shell are captured before MoR work starts.",
		status: "Active",
	},
	{
		title: "MoR/INSA queue",
		detail: "Staff can separate portal approval waits from certificate request waits and follow up on stale handoffs.",
		status: "Watch",
	},
	{
		title: "Controlled invoice proof lane",
		detail: "Every tenant must produce a test IRN and QR evidence before the live invoice switch is opened.",
		status: "Gate",
	},
] as const;

const authorityDeskLanes = [
	{
		title: "MoR approval desk",
		sla: "1-5 business days",
		signal: "Source registration waiting on authority approval",
		next: "Follow up with tenant contact when OTP or portal evidence is missing",
	},
	{
		title: "INSA certificate desk",
		sla: "1-3 business days after CSR",
		signal: "CSR sent but issued certificate has not been uploaded",
		next: "Send follow-up package and keep request evidence attached to the tenant task",
	},
	{
		title: "Controlled test invoice desk",
		sla: "Same day after certificate",
		signal: "Credentials and certificate exist but test invoice has not returned IRN",
		next: "Run the controlled invoice, record QR evidence, and classify failures before retry",
	},
	{
		title: "Live switch desk",
		sla: "After training",
		signal: "Tenant can issue daily invoices only after first production IRN",
		next: "Schedule cashier training and keep production launch blocked until the invoice is accepted",
	},
] as const;

const adminMorInsaLaunchSteps = [
	["1", "Tenant intake", "TIN, owner contact, payment proof"],
	["2", "Subscription verified", "EIMS add-on and receipt confirmed"],
	["3", "Organization shell", "Tenant, owner, settings, and VAT metadata"],
	["4", "MoR portal signup", "Portal request and OTP handoff"],
	["5", "Portal login and 2FA", "Changed password and backup codes"],
	["6", "Register source system", "Register/POS source request submitted"],
	["7", "MoR approval wait", "Authority status and follow-up notes"],
	["8", "Capture API credentials", "Encrypted credential bundle"],
	["9", "Generate CSR", "CSR and encrypted key material"],
	["10", "Send INSA request", "Email package and request form"],
	["11", "Upload certificate", "Issued cert validated against key and TIN"],
	["12", "Controlled test invoice", "Sandbox IRN and signed QR evidence"],
	["13", "Notify tenant", "SMS, email, and training appointment"],
	["14", "First live invoice", "Production IRN observed with cashier"],
	["15", "Evidence archive", "Launch dossier ready for audit"],
] as const;

function AdminMorInsaTimelinePanel() {
	return (
		<section className="rounded-md border bg-background">
			<div className="grid gap-4 border-b bg-muted/25 p-4 lg:grid-cols-[1fr_340px]">
				<div>
					<p className="text-sm font-semibold">15-step EIMS launch queue</p>
					<h2 className="mt-1 text-xl font-semibold tracking-normal">MoR and INSA operator timeline</h2>
					<p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
						Every tenant moves through the same operational path, so support can identify exactly where authority
						approval, credential capture, certificate issuance, or live invoice proof is stuck.
					</p>
				</div>
				<div className="rounded-md border bg-background p-3">
					<p className="text-xs font-medium uppercase text-muted-foreground">Default service mode</p>
					<p className="mt-1 text-lg font-semibold">Concierge first, self-service only by exception</p>
					<p className="mt-1 text-xs leading-5 text-muted-foreground">
						The timeline keeps tenant handoffs and staff-only authority work in one operational view.
					</p>
				</div>
			</div>
			<div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
				{adminMorInsaLaunchSteps.map(([number, title, proof], index) => (
					<div key={title} className="rounded-md border p-3">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="text-xs font-medium uppercase text-muted-foreground">Step {number}</p>
								<p className="mt-1 font-medium">{title}</p>
							</div>
							<span
								className={`rounded-md border px-2 py-1 text-xs ${
									index < 3 ? "bg-primary/5 text-primary" : index < 12 ? "bg-amber-50 text-amber-950" : ""
								}`}
							>
								{index < 3 ? "intake" : index < 12 ? "authority" : "launch"}
							</span>
						</div>
						<p className="mt-3 text-xs leading-5 text-muted-foreground">{proof}</p>
					</div>
				))}
			</div>
		</section>
	);
}

function AdminConciergeQueuePanel({ stats }: { readonly stats: readonly (readonly [string, string])[] }) {
	const tenantsTotal = stats.find(([label]) => label === "Tenants")?.[1] ?? "0";
	const blocked = stats.find(([label]) => label === "Blocked")?.[1] ?? "0";

	return (
		<section className="rounded-md border bg-background">
			<div className="grid gap-4 border-b bg-muted/25 p-4 lg:grid-cols-[1fr_320px]">
				<div>
					<p className="text-sm font-semibold">Concierge launch operations</p>
					<h2 className="mt-1 text-xl font-semibold tracking-normal">Tenant onboarding command queue</h2>
					<p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
						Cross-tenant view for the 15-step EIMS restaurant launch workflow: staff intake, MoR approval, INSA
						certificate, controlled invoice proof, and first production invoice.
					</p>
				</div>
				<div className="grid grid-cols-2 gap-2">
					<div className="rounded-md border bg-background p-3">
						<p className="text-xs font-medium uppercase text-muted-foreground">Tenant queue</p>
						<p className="mt-1 text-2xl font-semibold">{tenantsTotal}</p>
					</div>
					<div className="rounded-md border bg-background p-3">
						<p className="text-xs font-medium uppercase text-muted-foreground">Blocked launches</p>
						<p className="mt-1 text-2xl font-semibold">{blocked}</p>
					</div>
				</div>
			</div>
			<div className="grid gap-3 p-4 lg:grid-cols-3">
				{adminLaunchLanes.map((lane) => (
					<div key={lane.title} className="rounded-md border p-4">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="font-medium">{lane.title}</p>
								<p className="mt-2 text-sm leading-6 text-muted-foreground">{lane.detail}</p>
							</div>
							<span className="rounded-md border px-2 py-1 text-xs">{lane.status}</span>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}

function AdminAuthorityDeskPanel({ stats }: { readonly stats: readonly (readonly [string, string])[] }) {
	const pendingOffline = stats.find(([label]) => label === "Pending Offline")?.[1] ?? "0";
	const unknown = stats.find(([label]) => label === "Unknown")?.[1] ?? "0";
	const certAlerts = stats.find(([label]) => label === "Cert Alerts")?.[1] ?? "0";

	return (
		<section className="rounded-md border bg-background">
			<div className="grid gap-4 border-b bg-muted/25 p-4 lg:grid-cols-[1fr_360px]">
				<div>
					<p className="text-sm font-semibold">MoR/INSA authority desk</p>
					<h2 className="mt-1 text-xl font-semibold tracking-normal">Cross-tenant launch blockers</h2>
					<p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
						Operations view for authority waits, certificate handoffs, controlled invoice proof, and the live invoice switch.
					</p>
				</div>
				<div className="grid grid-cols-3 gap-2">
					{[
						["Pending sync", pendingOffline],
						["Unknown", unknown],
						["Cert alerts", certAlerts],
					].map(([label, value]) => (
						<div key={label} className="rounded-md border bg-background p-3">
							<p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
							<p className="mt-1 text-xl font-semibold">{value}</p>
						</div>
					))}
				</div>
			</div>
			<div className="grid gap-3 p-4 xl:grid-cols-4">
				{authorityDeskLanes.map((lane) => (
					<div key={lane.title} className="rounded-md border p-4">
						<div className="flex items-start justify-between gap-3">
							<p className="font-medium">{lane.title}</p>
							<span className="rounded-md border px-2 py-1 text-xs">{lane.sla}</span>
						</div>
						<p className="mt-3 text-sm leading-6 text-muted-foreground">{lane.signal}</p>
						<p className="mt-3 rounded-md border bg-muted/30 p-2 text-xs leading-5 text-muted-foreground">
							{lane.next}
						</p>
					</div>
				))}
			</div>
		</section>
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
	const caseColumns: ColumnDef<EimsAcceptanceCase, unknown>[] = [
		{
			accessorKey: "caseId",
			header: "Case",
			cell: ({ row }) => (
				<div>
					<div className="font-medium">{row.original.caseId}</div>
					<div className="max-w-sm text-xs text-muted-foreground">{row.original.title}</div>
				</div>
			),
			meta: { filter: { type: "text" } },
		},
		{ accessorKey: "operation", header: "Operation", meta: { filter: { type: "text" } } },
		{
			accessorKey: "endpoint",
			header: "Endpoint",
			cell: ({ row }) => <code className="text-xs">{row.original.endpoint}</code>,
			meta: { filter: { type: "text" } },
		},
		{
			id: "evidence",
			accessorFn: (row) => row.requiredEvidence.join(", "),
			header: "Evidence",
			cell: ({ row }) => (
				<span className="max-w-sm text-xs text-muted-foreground">{row.original.requiredEvidence.join(", ")}</span>
			),
			meta: { filter: { type: "text" } },
		},
		{
			id: "action",
			header: "Action",
			enableSorting: false,
			enableColumnFilter: false,
			cell: ({ row }) => (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => void executeCase(row.original.caseId)}
					disabled={runCase.isPending}
				>
					Run {row.original.caseId}
				</Button>
			),
		},
	];

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
				<SharedDataTable
					columns={caseColumns}
					data={cases.data.data}
					emptyTitle="No acceptance cases"
					emptyMessage="No EIMS acceptance cases are available."
					getRowId={(row) => row.caseId}
					pageSize={20}
					searchPlaceholder="Search acceptance cases..."
					totalCount={cases.data.data.length}
				/>
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
			<AdminOperationsHero stats={stats} />
			<AdminConciergeQueuePanel stats={stats} />
			<AdminAuthorityDeskPanel stats={stats} />
			<AdminMorInsaTimelinePanel />
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
				description="Operational actions that super admins need before authority testing access: pause queues, run health checks, and generate evidence."
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
							["MoR test environment", data.data.mor.sandbox, "authority test"],
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
