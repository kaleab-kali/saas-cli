import {
	useAdminEimsCertificates,
	useAdminEimsCompliance,
	useAdminEimsFailures,
	useAdminEimsOverview,
	useAdminEimsResources,
	useAdminEimsTenants,
} from "#features/eims/api/eims.hooks";
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
				description="Super-admin view across tenants, source queues, certificate risks, and mock EIMS failures."
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
			<Card>
				<CardContent className="p-0">
					<DataTable
						headers={["Tenant", "Status", "Branches", "Sources", "Accepted", "Pending"]}
						rows={data.data.map((row) => [
							row.name,
							row.status,
							String(row.branches),
							String(row.sources),
							String(row.acceptedToday),
							String(row.pendingOffline),
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
