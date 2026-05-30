import React from "react";
import {
	type EimsOverview,
	type EimsTenantWorkspace,
	useCancelEimsInvoice,
	useCreateEimsBulkBatch,
	useCreateEimsEnterprise,
	useCreateEimsEstablishment,
	useCreateEimsReceipt,
	useCreateEimsSourceSystem,
	useCreateEimsSubmission,
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
	useEimsSetup,
	useEimsSubmissions,
	useEimsTenantWorkspace,
	useGenerateEimsCsr,
	useGenerateEimsEvidence,
	useImportEimsCertificate,
	useReconcileEimsBulkBatch,
	useSaveEimsCredential,
	useTestEimsCredential,
} from "#features/eims/api/eims.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DirectoryKind = "enterprises" | "establishments" | "sources";
type TableRows = readonly (readonly string[])[];

const badgeVariant = (status: string) => {
	const normalized = status.toLowerCase();
	if (["accepted", "active", "approved", "complete", "ready", "test_ready"].includes(normalized)) return "default";
	if (["failed_retryable", "blocked", "unknown_submission", "error"].includes(normalized)) return "destructive";
	if (["pending", "pending_offline", "attention", "warning", "test_mode"].includes(normalized)) return "secondary";
	return "outline";
};

const statusLabel = (status: string) => status.replace(/_/g, " ");
const businessStatusLabel = (status: string) => {
	const normalized = status.toLowerCase();
	const labels: Record<string, string> = {
		accepted: "accepted",
		active: "active",
		approved: "ready",
		blocked_credentials: "needs connection details",
		complete: "complete",
		draft: "draft",
		expires_soon: "renew soon",
		failed_retryable: "will retry",
		pending: "pending",
		pending_approval: "waiting for approval",
		pending_mor_approval: "waiting for approval",
		pending_offline: "pending sync",
		ready: "ready",
		test_ready: "ready",
		unknown_submission: "needs review",
	};
	return labels[normalized] ?? statusLabel(status);
};

function StatusBadge({ status }: { readonly status: string }) {
	return <Badge variant={badgeVariant(status)}>{businessStatusLabel(status)}</Badge>;
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
			{mode ? <Badge variant="outline">{mode}</Badge> : null}
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

function Field({
	label,
	value,
	onChange,
	placeholder,
	type = "text",
	required,
	autoComplete,
}: {
	readonly label: string;
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly placeholder?: string;
	readonly type?: string;
	readonly required?: boolean;
	readonly autoComplete?: string;
}) {
	return (
		<label className="grid gap-1 text-sm">
			<span className="font-medium">{label}</span>
			<input
				className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
				type={type}
				value={value}
				required={required}
				autoComplete={autoComplete}
				placeholder={placeholder}
				onChange={(event) => onChange(event.target.value)}
			/>
		</label>
	);
}

function SelectField({
	label,
	value,
	onChange,
	options,
}: {
	readonly label: string;
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly options: readonly string[];
}) {
	return (
		<label className="grid gap-1 text-sm">
			<span className="font-medium">{label}</span>
			<select
				className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
				value={value}
				onChange={(event) => onChange(event.target.value)}
			>
				{options.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
		</label>
	);
}

function ActionResult({ message }: { readonly message: string | null }) {
	if (!message) return null;
	return <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">{message}</div>;
}

function StatCards({ overview }: { readonly overview: EimsOverview }) {
	const stats = [
		["Accepted today", String(overview.stats.acceptedToday)],
		["Pending sync", String(overview.stats.pendingOffline)],
		["Needs review", String(overview.stats.unknownSubmissions)],
		["Certificate alerts", String(overview.stats.certificatesExpiring)],
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

function RequiredInputsPanel({ workspace }: { readonly workspace: EimsTenantWorkspace }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Required documents and details</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<ul className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
					{workspace.requiredInputs.map((item) => (
						<li key={item} className="rounded-md border p-3">
							{item}
						</li>
					))}
				</ul>
				<p className="text-sm text-muted-foreground">{workspace.supportNote}</p>
			</CardContent>
		</Card>
	);
}

function ReadinessSteps({ workspace }: { readonly workspace: EimsTenantWorkspace }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Setup checklist</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-3">
				{workspace.readiness.steps.map((step) => (
					<div key={step.key} className="rounded-md border p-4">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<div className="font-medium">{step.label}</div>
								<div className="text-xs text-muted-foreground">{step.tenantProvides.join(", ")}</div>
							</div>
							<StatusBadge status={step.status} />
						</div>
						{step.actionLabel ? (
							<div className="mt-2 text-xs text-muted-foreground">Next action: {step.actionLabel}</div>
						) : null}
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
		businessStatusLabel(row.status),
		row.establishment,
		`${row.totalValue} ETB`,
		row.irn ?? "Pending acceptance",
	]);

function BusinessProfileForm() {
	const mutation = useCreateEimsEnterprise();
	const [form, setForm] = React.useState({
		tin: "0074136947",
		legalName: "Habesha Restaurant PLC",
		tradeName: "Habesha Restaurant",
		vatNumber: "REGVAT123456789",
		email: "finance@habesha.example",
		phone: "+251911000111",
	});
	const [message, setMessage] = React.useState<string | null>(null);
	const setValue = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		const result = await mutation.mutateAsync(form);
		setMessage(result.data.message ?? `Business profile saved for TIN ${form.tin}`);
	};
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Business tax profile</CardTitle>
			</CardHeader>
			<CardContent>
				<form className="grid gap-4" onSubmit={submit}>
					<div className="grid gap-3 md:grid-cols-3">
						<Field label="TIN" value={form.tin} onChange={setValue("tin")} required />
						<Field label="Legal business name" value={form.legalName} onChange={setValue("legalName")} required />
						<Field label="Trade name" value={form.tradeName} onChange={setValue("tradeName")} />
						<Field label="VAT number" value={form.vatNumber} onChange={setValue("vatNumber")} />
						<Field label="Finance email" value={form.email} onChange={setValue("email")} type="email" />
						<Field label="Business phone" value={form.phone} onChange={setValue("phone")} />
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<Button type="submit" disabled={mutation.isPending}>
							Save business profile
						</Button>
						<Badge variant="outline">TIN is checked before tax sync</Badge>
					</div>
					<ActionResult message={message} />
				</form>
			</CardContent>
		</Card>
	);
}

function BranchProfileForm({ enterpriseId }: { readonly enterpriseId: string }) {
	const mutation = useCreateEimsEstablishment();
	const [form, setForm] = React.useState({
		enterpriseId,
		name: "Bole Branch",
		code: "BOL",
		subTin: "0074136947-01",
		region: "14",
		city: "Addis Ababa",
	});
	const [message, setMessage] = React.useState<string | null>(null);
	React.useEffect(() => setForm((current) => ({ ...current, enterpriseId })), [enterpriseId]);
	const setValue = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		const result = await mutation.mutateAsync(form);
		setMessage(result.data.message ?? `Branch saved: ${form.name}`);
	};
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Branch details</CardTitle>
			</CardHeader>
			<CardContent>
				<form className="grid gap-4" onSubmit={submit}>
					<div className="grid gap-3 md:grid-cols-3">
						<Field label="Branch name" value={form.name} onChange={setValue("name")} required />
						<Field label="Branch code" value={form.code} onChange={setValue("code")} required />
						<Field label="Branch Sub-TIN (optional)" value={form.subTin} onChange={setValue("subTin")} />
						<Field label="Region code" value={form.region} onChange={setValue("region")} />
						<Field label="City" value={form.city} onChange={setValue("city")} />
					</div>
					<Button type="submit" className="w-fit" disabled={mutation.isPending}>
						Save branch details
					</Button>
					<ActionResult message={message} />
				</form>
			</CardContent>
		</Card>
	);
}

function SourceReferenceForm({
	enterpriseId,
	establishmentId,
}: {
	readonly enterpriseId: string;
	readonly establishmentId: string;
}) {
	const mutation = useCreateEimsSourceSystem();
	const [form, setForm] = React.useState({
		enterpriseId,
		establishmentId,
		name: "Front POS",
		systemType: "POS",
		systemNumber: "329D03B6F0",
		softwareVersion: "restaurant-saas-v3.0.0",
		inHouseDeveloped: true,
	});
	const [message, setMessage] = React.useState<string | null>(null);
	React.useEffect(
		() => setForm((current) => ({ ...current, enterpriseId, establishmentId })),
		[enterpriseId, establishmentId],
	);
	const setValue = (key: keyof typeof form) => (value: string | boolean) =>
		setForm((current) => ({ ...current, [key]: value }));
	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		const result = await mutation.mutateAsync(form);
		setMessage(result.data.message ?? `Register/POS details saved: ${form.name}`);
	};
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Register/POS details</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="mb-4 text-sm text-muted-foreground">
					Enter the register or POS reference for this branch. Your onboarding specialist can help collect it if you do
					not have it yet.
				</p>
				<form className="grid gap-4" onSubmit={submit}>
					<div className="grid gap-3 md:grid-cols-3">
						<Field label="Register/POS name" value={form.name} onChange={(value) => setValue("name")(value)} required />
						<SelectField
							label="Register type"
							value={form.systemType}
							onChange={(value) => setValue("systemType")(value)}
							options={["POS", "ERP", "CRM", "SYS", "MAN", "EFD"]}
						/>
						<Field
							label="Register number"
							value={form.systemNumber}
							onChange={(value) => setValue("systemNumber")(value)}
						/>
					</div>
					<Button type="submit" className="w-fit" disabled={mutation.isPending}>
						Save register/POS details
					</Button>
					<ActionResult message={message} />
				</form>
			</CardContent>
		</Card>
	);
}

function SecureConnectionPanel({ sourceSystemId }: { readonly sourceSystemId: string }) {
	const saveCredential = useSaveEimsCredential();
	const testCredential = useTestEimsCredential();
	const generateCsr = useGenerateEimsCsr();
	const importCertificate = useImportEimsCertificate();
	const [credential, setCredential] = React.useState({
		sourceSystemId,
		clientId: "",
		username: "",
		apiKey: "",
		password: "",
		clientSecret: "",
	});
	const [certificatePem, setCertificatePem] = React.useState("");
	const [message, setMessage] = React.useState<string | null>(null);
	React.useEffect(() => setCredential((current) => ({ ...current, sourceSystemId })), [sourceSystemId]);
	const setCredentialValue = (key: keyof typeof credential) => (value: string) =>
		setCredential((current) => ({ ...current, [key]: value }));
	const save = async (event: React.FormEvent) => {
		event.preventDefault();
		const result = await saveCredential.mutateAsync(credential);
		setMessage(result.data.message ?? "Secure connection details saved");
	};
	const test = async () => {
		const result = await testCredential.mutateAsync(sourceSystemId);
		setMessage(result.data.message ?? "Secure connection test succeeded");
	};
	const generate = async () => {
		const result = await generateCsr.mutateAsync(sourceSystemId);
		setMessage(`${result.data.message} ${result.data.reference ?? ""}`.trim());
	};
	const importCert = async () => {
		const result = await importCertificate.mutateAsync({
			sourceSystemId,
			certificatePem,
		});
		setMessage(result.data.message ?? "Certificate saved");
	};
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Secure tax connection</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-4">
				<p className="text-sm text-muted-foreground">
					Add the API credentials and issued certificate. Most tenants complete this step with an onboarding specialist.
				</p>
				<form className="grid gap-4" onSubmit={save}>
					<div className="grid gap-3 md:grid-cols-3">
						<Field
							label="Client ID"
							value={credential.clientId}
							onChange={setCredentialValue("clientId")}
							autoComplete="off"
							required
						/>
						<Field
							label="Username"
							value={credential.username}
							onChange={setCredentialValue("username")}
							autoComplete="off"
							required
						/>
						<Field
							label="API key"
							value={credential.apiKey}
							onChange={setCredentialValue("apiKey")}
							autoComplete="off"
							required
						/>
						<Field
							label="Password"
							value={credential.password}
							onChange={setCredentialValue("password")}
							type="password"
							autoComplete="new-password"
							required
						/>
						<Field
							label="Client secret"
							value={credential.clientSecret}
							onChange={setCredentialValue("clientSecret")}
							type="password"
							autoComplete="new-password"
							required
						/>
					</div>
					<div className="flex flex-wrap gap-3">
						<Button type="submit" disabled={saveCredential.isPending}>
							Save connection details
						</Button>
						<Button type="button" variant="outline" onClick={test} disabled={testCredential.isPending}>
							Test connection
						</Button>
					</div>
				</form>
				<div className="grid gap-3">
					<div className="flex flex-wrap gap-3">
						<Button type="button" variant="outline" onClick={generate} disabled={generateCsr.isPending}>
							Generate certificate request
						</Button>
					</div>
					<label className="grid gap-1 text-sm">
						<span className="font-medium">Issued certificate</span>
						<textarea
							className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
							value={certificatePem}
							onChange={(event) => setCertificatePem(event.target.value)}
							placeholder="Paste the issued certificate"
						/>
					</label>
					<Button type="button" className="w-fit" onClick={importCert} disabled={importCertificate.isPending}>
						Save issued certificate
					</Button>
				</div>
				<ActionResult message={message} />
			</CardContent>
		</Card>
	);
}

function ReceiptForm() {
	const mutation = useCreateEimsReceipt();
	const [form, setForm] = React.useState({
		receiptType: "sales" as "sales" | "withholding",
		invoiceIrn: "TEST-IRN-51fa3144ae45d2a06873a1e81c59ab74",
		paymentMode: "CASH",
		paidAmount: "517.50",
		withholdingType: "TWHT",
	});
	const [message, setMessage] = React.useState<string | null>(null);
	const setValue = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		const result = await mutation.mutateAsync(form);
		setMessage(result.data.message ?? "Receipt submitted");
	};
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Record receipt</CardTitle>
			</CardHeader>
			<CardContent>
				<form className="grid gap-4" onSubmit={submit}>
					<div className="grid gap-3 md:grid-cols-4">
						<SelectField
							label="Receipt type"
							value={form.receiptType}
							onChange={(value) => setValue("receiptType")(value)}
							options={["sales", "withholding"]}
						/>
						<Field label="Invoice tax reference" value={form.invoiceIrn} onChange={setValue("invoiceIrn")} required />
						<Field label="Payment mode" value={form.paymentMode} onChange={setValue("paymentMode")} required />
						<Field label="Paid amount" value={form.paidAmount} onChange={setValue("paidAmount")} required />
						<Field label="Withholding type" value={form.withholdingType} onChange={setValue("withholdingType")} />
					</div>
					<Button type="submit" className="w-fit" disabled={mutation.isPending}>
						Submit receipt
					</Button>
					<ActionResult message={message} />
				</form>
			</CardContent>
		</Card>
	);
}

function CancellationAndBatchActions({ firstConversationId }: { readonly firstConversationId: string }) {
	const createBulk = useCreateEimsBulkBatch();
	const reconcileBulk = useReconcileEimsBulkBatch();
	const cancelInvoice = useCancelEimsInvoice();
	const [cancelForm, setCancelForm] = React.useState({
		invoiceIrn: "TEST-IRN-51fa3144ae45d2a06873a1e81c59ab74",
		reasonCode: "4",
		remark: "Customer returned the order",
	});
	const [message, setMessage] = React.useState<string | null>(null);
	const setCancelValue = (key: keyof typeof cancelForm) => (value: string) =>
		setCancelForm((current) => ({ ...current, [key]: value }));
	const startBulk = async () => {
		const result = await createBulk.mutateAsync();
		setMessage(result.data.message ?? "Batch sync started");
	};
	const reconcile = async () => {
		const result = await reconcileBulk.mutateAsync(firstConversationId);
		setMessage(result.data.message ?? "Batch status refresh scheduled");
	};
	const submitCancel = async (event: React.FormEvent) => {
		event.preventDefault();
		const result = await cancelInvoice.mutateAsync(cancelForm);
		setMessage(result.data.message ?? "Cancellation submitted");
	};
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Cancel invoice or refresh batch status</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-4">
				<form className="grid gap-4" onSubmit={submitCancel}>
					<div className="grid gap-3 md:grid-cols-3">
						<Field
							label="Invoice tax reference"
							value={cancelForm.invoiceIrn}
							onChange={setCancelValue("invoiceIrn")}
							required
						/>
						<SelectField
							label="Reason code"
							value={cancelForm.reasonCode}
							onChange={setCancelValue("reasonCode")}
							options={["1", "2", "3", "4", "6"]}
						/>
						<Field label="Remark" value={cancelForm.remark} onChange={setCancelValue("remark")} />
					</div>
					<Button type="submit" className="w-fit" disabled={cancelInvoice.isPending}>
						Submit cancellation
					</Button>
				</form>
				<div className="flex flex-wrap gap-3">
					<Button type="button" variant="outline" onClick={startBulk} disabled={createBulk.isPending}>
						Start batch sync
					</Button>
					<Button type="button" variant="outline" onClick={reconcile} disabled={reconcileBulk.isPending}>
						Refresh first batch
					</Button>
				</div>
				<ActionResult message={message} />
			</CardContent>
		</Card>
	);
}

function ExportAction() {
	const mutation = useGenerateEimsEvidence();
	const [message, setMessage] = React.useState<string | null>(null);
	const generate = async () => {
		const result = await mutation.mutateAsync();
		setMessage(`${result.data.message} ${result.data.reference ?? ""}`.trim());
	};
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Export tenant records</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-3">
				<p className="text-sm text-muted-foreground">
					Exports include invoices, receipts, cancellations, notifications, and audit evidence for the selected period.
				</p>
				<Button type="button" className="w-fit" onClick={generate} disabled={mutation.isPending}>
					Generate export package
				</Button>
				<ActionResult message={message} />
			</CardContent>
		</Card>
	);
}

export function EimsOverviewPage() {
	const overviewQuery = useEimsOverview();
	const workspaceQuery = useEimsTenantWorkspace();
	if (overviewQuery.isLoading || workspaceQuery.isLoading || !overviewQuery.data || !workspaceQuery.data)
		return <LoadingPanel />;
	const overview = overviewQuery.data.data;
	const workspace = workspaceQuery.data.data;

	return (
		<div className="space-y-5">
			<PageHeader
				title="Tax invoicing status"
				description={workspace.plainLanguageSummary}
				mode={workspace.operationModeLabel}
			/>
			{workspace.alerts.map((alert) => (
				<div key={alert.message} className="rounded-md border border-border bg-muted/30 p-3 text-sm">
					<span className="font-medium">{alert.level === "warning" ? "Next step" : alert.level}: </span>
					{alert.message}
				</div>
			))}
			<StatCards overview={overview} />
			<RequiredInputsPanel workspace={workspace} />
			<ReadinessSteps workspace={workspace} />
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Recent tax invoices</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Document", "Type", "Status", "Branch", "Total", "Tax reference"]}
						rows={submissionRows(overview.recentSubmissions)}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function EimsSetupPage() {
	const overviewQuery = useEimsOverview();
	const workspaceQuery = useEimsTenantWorkspace();
	const setupQuery = useEimsSetup();
	const branchHealth = useEimsBranchHealth();
	const buyers = useEimsBuyers();
	if (
		overviewQuery.isLoading ||
		workspaceQuery.isLoading ||
		setupQuery.isLoading ||
		branchHealth.isLoading ||
		buyers.isLoading ||
		!overviewQuery.data ||
		!workspaceQuery.data ||
		!setupQuery.data ||
		!branchHealth.data ||
		!buyers.data
	) {
		return <LoadingPanel />;
	}
	const overview = overviewQuery.data.data;
	const workspace = workspaceQuery.data.data;
	const setup = setupQuery.data.data;
	const enterpriseId = setup.enterprises[0]?.id ?? overview.enterprises[0]?.id ?? "ent_test_1";
	const establishmentId = setup.establishments[0]?.id ?? overview.establishments[0]?.id ?? "est_test_1";
	const sourceSystemId = setup.sourceSystems[0]?.id ?? overview.sourceSystems[0]?.id ?? "src_test_1";

	return (
		<div className="space-y-5">
			<PageHeader
				title="Guided tax setup"
				description="Enter the business tax details, branch details, register/POS reference, API credentials, and issued certificate."
				mode={workspace.operationModeLabel}
			/>
			<ReadinessSteps workspace={workspace} />
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Current blockers</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					{workspace.readiness.blockers.map((blocker) => (
						<div key={blocker} className="rounded-md border border-border p-3 text-sm">
							{blocker}
						</div>
					))}
				</CardContent>
			</Card>
			<BusinessProfileForm />
			<BranchProfileForm enterpriseId={enterpriseId} />
			<SourceReferenceForm enterpriseId={enterpriseId} establishmentId={establishmentId} />
			<SecureConnectionPanel sourceSystemId={sourceSystemId} />
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Saved setup details</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Business profiles", "Branches", "Registers/POS"]}
						rows={[
							[
								String(setup.counts.enterprises),
								String(setup.counts.establishments),
								String(setup.counts.sourceSystems),
							],
						]}
					/>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Branch health</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Branch", "Status", "Today", "Pending sync", "Registers/POS", "Alerts"]}
						rows={branchHealth.data.data.map((row) => [
							row.establishmentName,
							businessStatusLabel(row.status),
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
					<CardTitle className="text-base">Frequent customers and government buyers</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Customer", "TIN", "Type", "Government", "City"]}
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
	const { data, isLoading } = useEimsSetup();
	if (isLoading || !data) return <LoadingPanel />;
	const setup = data.data;

	if (kind === "enterprises") {
		return (
			<div className="space-y-5">
				<PageHeader title="Business tax profile" description="Legal taxpayer details used as seller information." />
				<BusinessProfileForm />
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Saved business profiles</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<DataTable
							headers={["Legal Name", "TIN", "VAT", "Status"]}
							rows={setup.enterprises.map((row) => [
								row.legalName,
								row.tin,
								row.vatNumber,
								businessStatusLabel(row.status),
							])}
						/>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (kind === "establishments") {
		return (
			<div className="space-y-5">
				<PageHeader title="Branch details" description="Branch and address details used on invoices and reports." />
				<BranchProfileForm enterpriseId={setup.enterprises[0]?.id ?? "ent_test_1"} />
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Saved branches</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<DataTable
							headers={["Name", "Code", "Sub-TIN", "City", "Status"]}
							rows={setup.establishments.map((row) => [
								row.name,
								row.code,
								row.subTin,
								row.city,
								businessStatusLabel(row.status),
							])}
						/>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-5">
			<PageHeader
				title="Register/POS details"
				description="Saved register and POS details used to sync invoices for the right branch."
			/>
			<SourceReferenceForm
				enterpriseId={setup.enterprises[0]?.id ?? "ent_test_1"}
				establishmentId={setup.establishments[0]?.id ?? "est_test_1"}
			/>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Saved references</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Name", "Register number", "Type", "Readiness", "Last accepted"]}
						rows={setup.sourceSystems.map((row) => [
							row.name,
							row.systemNumber,
							row.systemType,
							businessStatusLabel(row.approvalStatus),
							String(row.lastAcceptedCounter ?? 0),
						])}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function EimsCredentialsPage() {
	const credentials = useEimsCredentials();
	const setup = useEimsSetup();
	if (credentials.isLoading || setup.isLoading || !credentials.data || !setup.data) return <LoadingPanel />;
	const sourceSystemId = setup.data.data.sourceSystems[0]?.id ?? "src_test_1";

	return (
		<div className="space-y-5">
			<PageHeader
				title="Secure connection details"
				description="Connection status for the credentials linked to each approved register/POS."
			/>
			<SecureConnectionPanel sourceSystemId={sourceSystemId} />
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Connection status</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Register/POS", "Connection status", "Secret fields", "Last tested"]}
						rows={credentials.data.data.map((row) => [
							row.sourceSystem,
							businessStatusLabel(row.lifecycle),
							row.secretsReturned ? "Needs review" : "Hidden",
							`${row.lastTestStatus} at ${row.lastTestedAt}`,
						])}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function EimsCertificatesPage() {
	const certificates = useEimsCertificates();
	if (certificates.isLoading || !certificates.data) return <LoadingPanel />;

	return (
		<div className="space-y-5">
			<PageHeader title="Certificate status" description="Certificate validity for each approved register/POS." />
			<Card>
				<CardContent className="p-0">
					<DataTable
						headers={["Register/POS", "CSR", "Valid To", "Status"]}
						rows={certificates.data.data.map((row) => [
							row.sourceSystem,
							row.csrStrategy,
							row.validTo,
							businessStatusLabel(row.status),
						])}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function EimsSubmissionsPage() {
	const { data, isLoading } = useEimsSubmissions();
	const mutation = useCreateEimsSubmission();
	const [lastIrn, setLastIrn] = React.useState<string | null>(null);
	const createTestInvoice = React.useCallback(async () => {
		const result = await mutation.mutateAsync(`INV-SAMPLE-${Date.now()}`);
		setLastIrn(result.data.irn);
	}, [mutation]);
	if (isLoading || !data) return <LoadingPanel />;

	return (
		<div className="space-y-5">
			<PageHeader
				title="Tax invoices"
				description="Accepted invoices show a final tax reference. Pending invoices update automatically after acceptance."
			/>
			<div className="flex flex-wrap items-center gap-3">
				<Button type="button" onClick={createTestInvoice} disabled={mutation.isPending}>
					Submit invoice
				</Button>
				{lastIrn ? <Badge variant="secondary">{lastIrn}</Badge> : null}
			</div>
			<Card>
				<CardContent className="p-0">
					<DataTable
						headers={["Document", "Type", "Status", "Branch", "Total", "Tax reference"]}
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
				title="Receipts"
				description="Sales and withholding receipts are linked to accepted invoice tax references."
			/>
			<ReceiptForm />
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Receipt register</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Receipt", "Type", "Withholding", "Status", "Payment", "Amount", "RRN"]}
						rows={data.data.map((row) => [
							row.receiptNumber,
							row.receiptType,
							row.withholdingType ?? "none",
							businessStatusLabel(row.status),
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
				title="Cancellations"
				description="Cancel accepted invoices with the correct reason and track high-volume batch sync status when it is enabled."
			/>
			<CancellationAndBatchActions firstConversationId={bulk.data.data[0]?.conversationId ?? "BATCH-20260526-001"} />
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Cancellation history</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Tax reference", "Reason", "Remark", "Status", "Usage", "Limit threshold"]}
						rows={cancellations.data.data.map((row) => [
							row.invoiceIrn,
							`${row.reasonCode} - ${row.reasonLabel}`,
							row.remark,
							businessStatusLabel(row.status),
							`${row.countToday}/${row.knownLimitToday} ${row.limitWindow}`,
							row.warningThreshold,
						])}
					/>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Batch sync history</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Batch ID", "Status", "Submitted", "Accepted", "Failed", "Pending"]}
						rows={bulk.data.data.map((row) => [
							row.conversationId,
							businessStatusLabel(row.status),
							String(row.submitted),
							String(row.accepted),
							String(row.failed),
							String(row.pending),
						])}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function EimsCompliancePage() {
	const evidence = useEimsComplianceEvidence();
	const printLayouts = useEimsPrintLayouts();
	const notifications = useEimsNotificationLogs();
	if (
		evidence.isLoading ||
		printLayouts.isLoading ||
		notifications.isLoading ||
		!evidence.data ||
		!printLayouts.data ||
		!notifications.data
	) {
		return <LoadingPanel />;
	}

	return (
		<div className="space-y-5">
			<PageHeader
				title="Records and exports"
				description="Download invoice, receipt, cancellation, and account records for the selected period."
			/>
			<ExportAction />
			<Card>
				<CardContent className="p-4">
					<p className="text-sm text-muted-foreground">Export readiness</p>
					<p className="mt-1 text-3xl font-semibold">{evidence.data.data.readiness}%</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="p-0">
					<DataTable
						headers={["Record set", "Status"]}
						rows={evidence.data.data.items.map((item) => [item.label, businessStatusLabel(item.status)])}
					/>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Receipt print layouts</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Paper", "Layout", "QR source", "Required fields"]}
						rows={printLayouts.data.data.map((layout) => [
							layout.paper,
							layout.layout,
							layout.qrSource,
							layout.requiredFields.join(", "),
						])}
					/>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Buyer notifications</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						headers={["Provider", "Channel", "Status", "Tax reference", "Retries"]}
						rows={notifications.data.data.map((notification) => [
							notification.provider,
							notification.channel,
							businessStatusLabel(notification.status),
							notification.invoiceIrn,
							String(notification.retryCount),
						])}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
