import React from "react";
import {
	type EimsOverview,
	useCreateMockEimsSubmission,
	useEimsBranchHealth,
	useEimsBulkBatches,
	useEimsBuyers,
	useEimsCancellations,
	useEimsCertificates,
	useEimsComplianceEvidence,
	useEimsCredentials,
	useEimsNotificationLogs,
	useEimsOverview,
	useEimsPrintLayouts,
	useEimsReceipts,
	useEimsSubmissions,
} from "#features/eims/api/eims.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DirectoryKind = "enterprises" | "establishments" | "sources";
type TableRows = readonly (readonly string[])[];

const badgeVariant = (status: string) => {
	if (["accepted", "active", "approved", "complete", "ready"].includes(status)) return "default";
	if (["failed_retryable", "blocked", "unknown_submission"].includes(status)) return "destructive";
	if (["pending", "pending_offline", "attention", "mocked"].includes(status)) return "secondary";
	return "outline";
};

function StatusBadge({ status }: { readonly status: string }) {
	return <Badge variant={badgeVariant(status)}>{status.replace(/_/g, " ")}</Badge>;
}

function LoadingPanel() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-9 w-72" />
			<Skeleton className="h-36 w-full" />
			<Skeleton className="h-48 w-full" />
		</div>
	);
}

function PageHeader({
	title,
	description,
	mode,
}: {
	readonly title: string;
	readonly description: string;
	readonly mode?: string;
}) {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
				<p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
			</div>
			{mode ? <StatusBadge status={mode === "mock" ? "Mock Mode" : mode} /> : null}
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
							<TableCell key={String(index)} className={index === row.length - 1 ? "max-w-md truncate" : undefined}>
								{cell}
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function StatCards({ overview }: { readonly overview: EimsOverview }) {
	const stats = [
		["Accepted Today", String(overview.stats.acceptedToday)],
		["Pending Offline", String(overview.stats.pendingOffline)],
		["Unknown", String(overview.stats.unknownSubmissions)],
		["Cert Alerts", String(overview.stats.certificatesExpiring)],
	] as const;

	return (
		<div className="grid gap-3 md:grid-cols-4">
			{stats.map(([label, value]) => (
				<Card key={label}>
					<CardContent className="p-4">
						<p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
						<p className="mt-2 text-2xl font-semibold">{value}</p>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function SetupProgress({ overview }: { readonly overview: EimsOverview }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Setup Progress</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-2 md:grid-cols-2">
				{overview.setupProgress.map((step) => (
					<div key={step.key} className="flex items-center justify-between gap-3 rounded-md border p-3">
						<span className="text-sm font-medium">{step.label}</span>
						<StatusBadge status={step.status} />
					</div>
				))}
			</CardContent>
		</Card>
	);
}

const submissionRows = (rows: EimsOverview["recentSubmissions"]) =>
	rows.map((row) => [
		row.documentNumber,
		`${row.documentType} / ${row.transactionType}`,
		row.status,
		row.sourceSystem,
		`${row.totalValue} ETB`,
		row.irn ?? "Pending EIMS acceptance",
	]);

export function EimsOverviewPage() {
	const { data, isLoading } = useEimsOverview();
	if (isLoading || !data) return <LoadingPanel />;
	const overview = data.data;

	return (
		<div className="space-y-5">
			<PageHeader
				title="EIMS Control Center"
				description="Operational view for enterprise, branch, source, submission, receipt, and compliance readiness."
				mode={overview.mode}
			/>
			<StatCards overview={overview} />
			<SetupProgress overview={overview} />
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Recent Submissions</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Document", "Type", "Status", "Source", "Total", "IRN"]}
						rows={submissionRows(overview.recentSubmissions)}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function EimsSetupPage() {
	const { data, isLoading } = useEimsOverview();
	const branchHealth = useEimsBranchHealth();
	const buyers = useEimsBuyers();
	if (isLoading || !data || branchHealth.isLoading || buyers.isLoading || !branchHealth.data || !buyers.data) {
		return <LoadingPanel />;
	}
	const overview = data.data;

	return (
		<div className="space-y-5">
			<PageHeader
				title="EIMS Setup"
				description="Track onboarding gates before production invoice submission is enabled."
				mode={overview.mode}
			/>
			<SetupProgress overview={overview} />
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Current Blockers</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					{overview.blockers.map((blocker) => (
						<div key={blocker} className="rounded-md border border-border p-3 text-sm">
							{blocker}
						</div>
					))}
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Branch Health</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Branch", "Status", "Today", "Pending", "Sources", "Alerts"]}
						rows={branchHealth.data.data.map((row) => [
							row.establishmentName,
							row.status,
							String(row.todayInvoices),
							String(row.pendingOffline),
							`${row.activeSources} active / ${row.pendingSources} pending`,
							row.alerts.join("; "),
						])}
					/>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Buyer Directory Seed</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Buyer", "TIN", "Type", "Government", "City"]}
						rows={buyers.data.data.map((row) => [
							row.legalName,
							row.buyerTin,
							row.buyerType,
							row.isGovernment ? "yes" : "no",
							row.city,
						])}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function EimsDirectoryPage({ kind }: { readonly kind: DirectoryKind }) {
	const { data, isLoading } = useEimsOverview();
	if (isLoading || !data) return <LoadingPanel />;
	const overview = data.data;

	if (kind === "enterprises") {
		return (
			<div className="space-y-5">
				<PageHeader title="EIMS Enterprises" description="Legal taxpayer identities linked to this SaaS tenant." />
				<Card>
					<CardContent className="p-0">
						<DataTable
							headers={["Legal Name", "TIN", "VAT", "Status"]}
							rows={overview.enterprises.map((row) => [row.legalName, row.tin, row.vatNumber, row.status])}
						/>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (kind === "establishments") {
		return (
			<div className="space-y-5">
				<PageHeader
					title="EIMS Establishments"
					description="Registered branch and sub-TIN context for invoice source resolution."
				/>
				<Card>
					<CardContent className="p-0">
						<DataTable
							headers={["Name", "Code", "Sub-TIN", "City", "Status"]}
							rows={overview.establishments.map((row) => [row.name, row.code, row.subTin, row.city, row.status])}
						/>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-5">
			<PageHeader
				title="EIMS Source Systems"
				description="POS, ERP, and source systems that own counters, certificates, credentials, and PreviousIrn chains."
			/>
			<Card>
				<CardContent className="p-0">
					<DataTable
						headers={["Name", "System Number", "Type", "Approval", "Counter"]}
						rows={overview.sourceSystems.map((row) => [
							row.name,
							row.systemNumber,
							row.systemType,
							row.approvalStatus,
							String(row.lastAcceptedCounter),
						])}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function EimsCredentialsPage() {
	const { data, isLoading } = useEimsCredentials();
	if (isLoading || !data) return <LoadingPanel />;

	return (
		<div className="space-y-5">
			<PageHeader
				title="EIMS Credentials"
				description="Credential storage is backend-only and envelope-encrypted; this mock surface verifies lifecycle visibility."
			/>
			<Card>
				<CardContent className="p-0">
					<DataTable
						headers={["Source", "Environment", "Lifecycle", "Token cache", "Secrets returned", "Last test"]}
						rows={data.data.map((row) => [
							row.sourceSystem,
							row.environment,
							row.lifecycle,
							row.tokenCache,
							row.secretsReturned ? "unsafe" : "redacted",
							`${row.lastTestStatus} at ${row.lastTestedAt}`,
						])}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function EimsCertificatesPage() {
	const { data, isLoading } = useEimsCertificates();
	if (isLoading || !data) return <LoadingPanel />;

	return (
		<div className="space-y-5">
			<PageHeader
				title="EIMS Certificates"
				description="Certificate metadata, CSR flow, expiry windows, and signing key version tracking."
			/>
			<Card>
				<CardContent className="p-0">
					<DataTable
						headers={["Source", "Provider", "CSR", "Key", "Algorithm", "Valid To", "Status"]}
						rows={data.data.map((row) => [
							row.sourceSystem,
							row.provider,
							row.csrStrategy,
							`${row.keyProvider} ${row.keyVersion}`,
							row.signatureAlgorithm,
							row.validTo,
							row.status,
						])}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function EimsSubmissionsPage() {
	const { data, isLoading } = useEimsSubmissions();
	const mutation = useCreateMockEimsSubmission();
	const [lastIrn, setLastIrn] = React.useState<string | null>(null);
	const createMock = React.useCallback(async () => {
		const result = await mutation.mutateAsync(`INV-MOCK-${Date.now()}`);
		setLastIrn(result.data.irn);
	}, [mutation]);
	if (isLoading || !data) return <LoadingPanel />;

	return (
		<div className="space-y-5">
			<PageHeader
				title="EIMS Submissions"
				description="Mocked accepted, offline, retryable, and unknown states for source-counter flow testing."
			/>
			<div className="flex flex-wrap items-center gap-3">
				<Button type="button" onClick={createMock} disabled={mutation.isPending}>
					Create mock accepted invoice
				</Button>
				{lastIrn ? <Badge variant="secondary">{lastIrn}</Badge> : null}
			</div>
			<Card>
				<CardContent className="p-0">
					<DataTable
						headers={["Document", "Type", "Status", "Source", "Total", "IRN"]}
						rows={submissionRows(data.data)}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function EimsReceiptsPage() {
	const { data, isLoading } = useEimsReceipts();
	if (isLoading || !data) return <LoadingPanel />;

	return (
		<div className="space-y-5">
			<PageHeader
				title="EIMS Receipts"
				description="Sales and withholding receipt states linked to accepted invoice IRNs."
			/>
			<Card>
				<CardContent className="p-0">
					<DataTable
						headers={["Receipt", "Type", "Status", "Payment", "Amount", "RRN"]}
						rows={data.data.map((row) => [
							row.receiptNumber,
							row.receiptType,
							row.status,
							row.paymentMode,
							row.paidAmount,
							row.rrn ?? "Pending",
						])}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function EimsBulkPage() {
	const bulk = useEimsBulkBatches();
	const cancellations = useEimsCancellations();
	if (bulk.isLoading || cancellations.isLoading || !bulk.data || !cancellations.data) return <LoadingPanel />;

	return (
		<div className="space-y-5">
			<PageHeader
				title="EIMS Bulk"
				description="Bulk conversations, callback idempotency, and reconciliation polling are ready for sandbox wiring."
			/>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Bulk Conversations</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Conversation", "Endpoint", "Status", "Accepted", "Failed", "Callback", "Reconciliation"]}
						rows={bulk.data.data.map((row) => [
							row.conversationId,
							row.endpoint,
							row.status,
							String(row.accepted),
							String(row.failed),
							row.callbackStatus,
							`${row.reconciliationStatus} after ${row.reconciliationAfterMinutes}m`,
						])}
					/>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Cancellation Controls</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["IRN", "Reason", "Remark", "Status", "Usage", "Warning"]}
						rows={cancellations.data.data.map((row) => [
							row.invoiceIrn,
							`${row.reasonCode} - ${row.reasonLabel}`,
							row.remark,
							row.status,
							`${row.countToday}/${row.knownLimitToday} ${row.limitWindow}`,
							row.warningThreshold,
						])}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function EimsCompliancePage() {
	const { data, isLoading } = useEimsComplianceEvidence();
	const printLayouts = useEimsPrintLayouts();
	const notifications = useEimsNotificationLogs();
	if (
		isLoading ||
		!data ||
		printLayouts.isLoading ||
		notifications.isLoading ||
		!printLayouts.data ||
		!notifications.data
	) {
		return <LoadingPanel />;
	}

	return (
		<div className="space-y-5">
			<PageHeader
				title="EIMS Compliance"
				description="Continuously generated evidence package readiness against V3 controls."
			/>
			<Card>
				<CardContent className="p-4">
					<p className="text-sm text-muted-foreground">Readiness</p>
					<p className="mt-1 text-3xl font-semibold">{data.data.readiness}%</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="p-0">
					<DataTable headers={["Evidence", "Status"]} rows={data.data.items.map((item) => [item.label, item.status])} />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Print Layout Compliance</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Layout", "Paper", "QR Source", "Required Fields"]}
						rows={printLayouts.data.data.map((row) => [
							row.layout,
							row.paper,
							row.qrSource,
							row.requiredFields.join(", "),
						])}
					/>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Buyer Notifications</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Channel", "Provider", "Status", "IRN", "Retries"]}
						rows={notifications.data.data.map((row) => [
							row.channel,
							row.provider,
							row.status,
							row.invoiceIrn,
							String(row.retryCount),
						])}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
