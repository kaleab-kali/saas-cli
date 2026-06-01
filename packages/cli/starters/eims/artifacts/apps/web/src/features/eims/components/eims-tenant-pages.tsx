import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import {
	type EimsBuyer,
	type EimsCancellation,
	type EimsOverview,
	type EimsSetupState,
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
import { DataTable as SharedDataTable } from "#shared/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type DirectoryKind = "enterprises" | "establishments" | "sources";
type TableRows = readonly (readonly string[])[];
type RecordTableRow = {
	readonly id: string;
	readonly values: readonly string[];
	readonly byHeader: Record<string, string>;
};

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
		test_ready: "test ready",
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

function EimsWorkspaceHeader({
	title,
	description,
	mode,
	overview,
}: {
	readonly title: string;
	readonly description: string;
	readonly mode?: string;
	readonly overview: EimsOverview;
}) {
	const metrics = [
		["Accepted today", String(overview.stats.acceptedToday)],
		["Pending sync", String(overview.stats.pendingOffline)],
		["Needs review", String(overview.stats.unknownSubmissions)],
		["Certificate alerts", String(overview.stats.certificatesExpiring)],
	] as const;
	const actions = [
		["Open launch console", "/onboarding"],
		["Continue EIMS setup", "/eims/setup"],
		["Submit invoice", "/eims/submissions"],
	] as const;
	const setupGates =
		overview.setupProgress.length > 0
			? overview.setupProgress
			: [
					{ key: "source", label: "MoR source approval", status: "pending" },
					{ key: "certificate", label: "INSA certificate", status: "pending" },
					{ key: "irn", label: "Official IRN and QR", status: "pending" },
				];

	return (
		<section className="overflow-hidden rounded-md border border-[#20351f] bg-[#101712] text-white">
			<div className="grid gap-5 p-5 xl:grid-cols-[1fr_0.7fr] xl:p-6">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<Badge className="bg-[#9dcc69] text-[#17200f] hover:bg-[#9dcc69]">Ethiopia tax workspace</Badge>
						{mode ? <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">{mode}</Badge> : null}
					</div>
					<h1 className="mt-3 text-2xl font-semibold tracking-normal md:text-3xl">{title}</h1>
					<p className="mt-2 max-w-3xl text-sm leading-6 text-white/68">{description}</p>
					<div className="mt-4 flex flex-wrap gap-2">
						{actions.map(([label, to], index) => (
							<Button
								key={to}
								asChild
								variant={index === 0 ? "default" : "outline"}
								className={
									index === 0
										? "bg-[#9dcc69] text-[#17200f] hover:bg-[#b4df79]"
										: "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
								}
							>
								<Link to={to}>{label}</Link>
							</Button>
						))}
					</div>
				</div>
				<div className="grid gap-2 sm:grid-cols-2">
					{metrics.map(([label, value]) => (
						<div key={label} className="rounded-md border border-white/10 bg-white/[0.06] p-3">
							<p className="text-xs font-medium uppercase text-white/50">{label}</p>
							<p className="mt-1 text-2xl font-semibold">{value}</p>
						</div>
					))}
				</div>
			</div>
			<div className="grid border-t border-white/10 bg-white/[0.03] text-sm md:grid-cols-2 xl:grid-cols-5">
				{setupGates.map((gate) => (
					<div key={gate.key} className="border-white/10 px-5 py-3 text-white/70 md:border-r last:md:border-r-0">
						<p>{gate.label}</p>
						<div className="mt-2">
							<StatusBadge status={gate.status} />
						</div>
					</div>
				))}
			</div>
		</section>
	);
}

function AuthorityFlowPanel({ overview }: { readonly overview: EimsOverview }) {
	const approvedSources = overview.sourceSystems.filter((source) => source.approvalStatus === "approved").length;
	const flow = [
		["1", "Tenant tax profile", `${overview.enterprises.length} business profile saved`],
		["2", "Authority source approval", `${approvedSources}/${overview.sourceSystems.length} registers ready`],
		["3", "INSA certificate", `${overview.stats.certificatesExpiring} certificate alerts`],
		["4", "Live tax invoice", `${overview.stats.acceptedToday} accepted today`],
	] as const;

	return (
		<div className="grid gap-3 lg:grid-cols-4">
			{flow.map(([index, title, detail]) => (
				<div key={title} className="rounded-md border bg-background p-4">
					<div className="flex items-center gap-3">
						<span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
							{index}
						</span>
						<div className="min-w-0">
							<div className="font-medium">{title}</div>
							<div className="text-xs text-muted-foreground">{detail}</div>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

const setupJourney = [
	["Company profile", "Confirm TIN, VAT, contact person, and branch ownership"],
	["MoR portal", "Track signup, OTP handoff, username, and portal readiness"],
	["Register/POS", "Save source system details before authority approval"],
	["Credentials", "Capture API access details through the secure backend"],
	["INSA certificate", "Generate the request package and upload the issued certificate"],
	["Go live", "Issue the first controlled invoice and prepare the tenant for daily use"],
] as const;

const eimsLaunchWizardSteps = [
	{
		title: "Welcome and MoR registration",
		lane: "Tenant with staff",
		proof: "MoR portal account confirmed",
		detail:
			"Confirm TIN, owner phone, OTP contact, payment proof, and portal signup readiness before credentials work.",
	},
	{
		title: "Authority credentials",
		lane: "Onboarding staff",
		proof: "Client ID and API key stored",
		detail: "Capture source system number, username, client secret, and API key through encrypted backend storage.",
	},
	{
		title: "Generate CSR",
		lane: "System assisted",
		proof: "CSR and private key generated",
		detail: "Create the RSA key pair, prepare the certificate signing request, and keep private material encrypted.",
	},
	{
		title: "Submit to INSA",
		lane: "Onboarding staff",
		proof: "INSA email package sent",
		detail: "Send the CSR package, request form, and business identity evidence to the certificate authority desk.",
	},
	{
		title: "Upload certificate",
		lane: "Onboarding staff",
		proof: "Issued certificate validated",
		detail: "Import the returned certificate, validate the key match, expiry, subject TIN, and production readiness.",
	},
	{
		title: "Verify and go live",
		lane: "Staff then tenant",
		proof: "Test invoice IRN and first live invoice",
		detail: "Run a controlled test invoice, capture QR evidence, train the cashier, then unlock live daily invoices.",
	},
] as const;

const doneStatuses = new Set(["accepted", "active", "approved", "complete", "ready", "test_ready"]);

const conciergeStages = [
	{
		title: "Tenant intake",
		owner: "Staff",
		window: "Day 1",
		items: ["TIN and legal name", "Contact and payment proof", "Organization shell"],
	},
	{
		title: "MoR portal",
		owner: "Staff + tenant",
		window: "Days 1-4",
		items: ["OTP handoff", "2FA backup codes", "Source registration"],
	},
	{
		title: "INSA certificate",
		owner: "Staff",
		window: "Days 4-8",
		items: ["CSR package", "Request email", "Signed certificate upload"],
	},
	{
		title: "Controlled test invoice",
		owner: "Staff",
		window: "Day 8",
		items: ["Test invoice", "IRN returned", "QR evidence captured"],
	},
	{
		title: "First live invoice",
		owner: "Tenant",
		window: "Day 10",
		items: ["Cashier training", "Production IRN", "Launch complete"],
	},
] as const;

const morInsaLaunchTimeline = [
	{
		title: "Tenant intake",
		owner: "Staff",
		proof: "Legal name, TIN, owner contact, and payment proof",
		action: "Create the onboarding task and confirm the restaurant launch mode.",
	},
	{
		title: "Subscription verified",
		owner: "Billing",
		proof: "Paid subscription and receipt reference",
		action: "Confirm the EIMS add-on is active before authority work starts.",
	},
	{
		title: "Organization shell",
		owner: "System",
		proof: "Organization, owner user, and tenant settings created",
		action: "Keep tenant branding, locale, currency, and VAT metadata available.",
	},
	{
		title: "MoR portal signup",
		owner: "Staff + tenant",
		proof: "MoR account request submitted",
		action: "Use the TIN and owner phone while the tenant handles OTP handoff.",
	},
	{
		title: "Portal login and 2FA",
		owner: "Staff",
		proof: "Username, password change, and backup codes secured",
		action: "Store credentials only through the encrypted backend path.",
	},
	{
		title: "Register source system",
		owner: "Staff",
		proof: "Register or POS source submitted to MoR",
		action: "Capture branch, source type, software version, and expected counter chain.",
	},
	{
		title: "MoR approval wait",
		owner: "Authority",
		proof: "Source approval status tracked",
		action: "Keep follow-up notes separate from credential and certificate work.",
	},
	{
		title: "Capture API credentials",
		owner: "Staff",
		proof: "Client ID, client secret, API key, username, and system number",
		action: "Run the credential test before CSR generation.",
	},
	{
		title: "Generate CSR",
		owner: "System",
		proof: "CSR and private key created",
		action: "Keep private key material encrypted and never render it back to the UI.",
	},
	{
		title: "Send INSA request",
		owner: "Staff",
		proof: "CSR email package sent",
		action: "Attach request form, CSR, and business identity evidence.",
	},
	{
		title: "Upload certificate",
		owner: "Staff",
		proof: "Issued certificate imported and validated",
		action: "Validate key match, CN/TIN, expiry window, and signature algorithm.",
	},
	{
		title: "Controlled test invoice",
		owner: "Staff",
		proof: "Controlled test IRN and signed QR captured",
		action: "Block live invoices until the controlled invoice is accepted.",
	},
	{
		title: "Notify tenant",
		owner: "Staff",
		proof: "SMS, email, and training appointment sent",
		action: "Send launch instructions and keep the first cashier session scheduled.",
	},
	{
		title: "First live invoice",
		owner: "Tenant + staff",
		proof: "Production IRN accepted",
		action: "Observe the first sale and confirm QR printing before handoff.",
	},
	{
		title: "Evidence archive",
		owner: "System",
		proof: "Launch dossier complete",
		action: "Archive MoR, INSA, invoice, training, and renewal evidence for audit.",
	},
] as const;

const stepStatusTone = (status: string) => {
	const normalized = status.toLowerCase();
	if (doneStatuses.has(normalized)) return "border-primary/30 bg-primary/5";
	if (["blocked", "error", "failed_retryable"].includes(normalized)) return "border-destructive/35 bg-destructive/5";
	if (["attention", "pending_offline", "warning"].includes(normalized))
		return "border-amber-300 bg-amber-50 text-amber-950";
	return "border-border bg-background";
};

function MorInsaFifteenStepTimelinePanel({ workspace }: { readonly workspace: EimsTenantWorkspace }) {
	const completedReadinessSteps = workspace.readiness.steps.filter((step) =>
		doneStatuses.has(step.status.toLowerCase()),
	).length;
	const readinessTotal = Math.max(workspace.readiness.steps.length, 1);
	const completedTimelineSteps = workspace.readiness.readyForLive
		? morInsaLaunchTimeline.length
		: Math.min(
				morInsaLaunchTimeline.length - 1,
				Math.floor((completedReadinessSteps / readinessTotal) * morInsaLaunchTimeline.length),
			);
	const currentTimelineIndex = workspace.readiness.readyForLive
		? morInsaLaunchTimeline.length - 1
		: Math.min(morInsaLaunchTimeline.length - 1, completedTimelineSteps);

	return (
		<section className="overflow-hidden rounded-md border bg-background">
			<div className="grid gap-4 border-b bg-muted/25 p-4 xl:grid-cols-[1fr_360px]">
				<div>
					<p className="text-sm font-semibold">15-step MoR/INSA launch timeline</p>
					<h2 className="mt-1 text-xl font-semibold tracking-normal">From tenant intake to first live invoice</h2>
					<p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
						Concierge operators can see the full authority workflow instead of a generic setup checklist: tenant intake,
						MoR source approval, encrypted credentials, INSA certificate, controlled invoice proof, and production
						launch.
					</p>
				</div>
				<div className="rounded-md border bg-background p-3">
					<p className="text-xs font-medium uppercase text-muted-foreground">Launch checkpoint</p>
					<p className="mt-1 text-lg font-semibold">{morInsaLaunchTimeline[currentTimelineIndex]?.title}</p>
					<p className="mt-1 text-xs leading-5 text-muted-foreground">
						{workspace.readiness.readyForLive
							? "The tenant is ready for daily EIMS invoices."
							: "The live invoice switch stays closed until every authority proof is captured."}
					</p>
				</div>
			</div>
			<div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
				{morInsaLaunchTimeline.map((step, index) => {
					const status =
						workspace.readiness.readyForLive || index < completedTimelineSteps
							? "complete"
							: index === currentTimelineIndex
								? "attention"
								: "pending";
					return (
						<div
							key={step.title}
							className={`rounded-md border p-3 ${stepStatusTone(status)} ${index === currentTimelineIndex ? "ring-2 ring-primary/25" : ""}`}
						>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="text-xs font-medium uppercase text-muted-foreground">Step {index + 1}</p>
									<p className="mt-1 font-semibold">{step.title}</p>
								</div>
								<StatusBadge status={status} />
							</div>
							<div className="mt-3 grid gap-2 text-xs">
								<div className="rounded-md border bg-background/70 p-2">
									<span className="font-medium">Owner: </span>
									<span className="text-muted-foreground">{step.owner}</span>
								</div>
								<div className="rounded-md border bg-background/70 p-2">
									<span className="font-medium">Proof: </span>
									<span className="text-muted-foreground">{step.proof}</span>
								</div>
							</div>
							<p className="mt-3 text-xs leading-5 text-muted-foreground">{step.action}</p>
						</div>
					);
				})}
			</div>
		</section>
	);
}

function SetupJourneyPanel({ workspace }: { readonly workspace: EimsTenantWorkspace }) {
	const firstOpenStepIndex = workspace.readiness.steps.findIndex(
		(step) => !doneStatuses.has(step.status.toLowerCase()),
	);
	const currentStepIndex =
		firstOpenStepIndex === -1 ? Math.max(0, workspace.readiness.steps.length - 1) : firstOpenStepIndex;
	const currentJourneyIndex = Math.min(currentStepIndex, setupJourney.length - 1);
	const currentStep = workspace.readiness.steps[currentStepIndex] ?? workspace.readiness.steps[0];
	const blockers = workspace.readiness.blockers.slice(0, 3);

	return (
		<section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
			<div className="rounded-md border bg-background">
				<div className="border-b p-4">
					<p className="text-sm font-semibold">EIMS setup path</p>
					<p className="mt-1 text-sm text-muted-foreground">
						The tenant sees plain business tasks while staff keeps the MoR and INSA handoffs moving.
					</p>
				</div>
				<div className="grid gap-2 p-3">
					{setupJourney.map(([title, description], index) => {
						const readinessStep = workspace.readiness.steps[index];
						const status = readinessStep?.status ?? (index < currentStepIndex ? "complete" : "pending");
						const isCurrent = index === currentJourneyIndex;
						return (
							<div
								key={title}
								className={`rounded-md border p-3 ${stepStatusTone(status)} ${isCurrent ? "ring-2 ring-primary/25" : ""}`}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="flex min-w-0 items-start gap-3">
										<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
											{index + 1}
										</span>
										<div className="min-w-0">
											<div className="font-medium">{title}</div>
											<p className="mt-1 text-sm text-muted-foreground">{description}</p>
										</div>
									</div>
									<StatusBadge status={status} />
								</div>
							</div>
						);
					})}
				</div>
			</div>

			<div className="grid gap-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Current staff handoff</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4">
						<div className="rounded-md border bg-muted/30 p-4">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div>
									<p className="text-xs font-medium uppercase text-muted-foreground">Next action</p>
									<p className="mt-1 text-lg font-semibold">{currentStep?.label ?? "Review setup progress"}</p>
								</div>
								<StatusBadge status={currentStep?.status ?? "pending"} />
							</div>
							{currentStep?.actionLabel ? (
								<p className="mt-3 text-sm text-muted-foreground">{currentStep.actionLabel}</p>
							) : null}
							{currentStep?.tenantProvides?.length ? (
								<div className="mt-3 flex flex-wrap gap-2">
									{currentStep.tenantProvides.map((item) => (
										<Badge key={item} variant="outline">
											{item}
										</Badge>
									))}
								</div>
							) : null}
						</div>
						<div className="grid gap-3 md:grid-cols-3">
							{[
								["Tenant contact", "Call, WhatsApp, or email before every authority step"],
								["Authority evidence", "Keep portal screenshots, issued files, and receipt notes together"],
								["Launch control", "Do not enable daily invoices until the first accepted invoice is confirmed"],
							].map(([title, detail]) => (
								<div key={title} className="rounded-md border p-3">
									<p className="text-sm font-medium">{title}</p>
									<p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Tenant handoff dossier</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-3">
						{blockers.length > 0 ? (
							blockers.map((blocker) => (
								<div
									key={blocker}
									className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
								>
									{blocker}
								</div>
							))
						) : (
							<div className="rounded-md border bg-muted/30 p-3 text-sm">No setup blockers are currently recorded.</div>
						)}
					</CardContent>
				</Card>
			</div>
		</section>
	);
}

function EimsLaunchWizardPanel({ workspace }: { readonly workspace: EimsTenantWorkspace }) {
	const firstOpenStepIndex = workspace.readiness.steps.findIndex(
		(step) => !doneStatuses.has(step.status.toLowerCase()),
	);
	const currentStepIndex =
		firstOpenStepIndex === -1 ? Math.max(0, workspace.readiness.steps.length - 1) : firstOpenStepIndex;

	return (
		<section className="rounded-md border bg-background">
			<div className="grid gap-4 border-b bg-muted/25 p-4 lg:grid-cols-[1fr_320px]">
				<div>
					<p className="text-sm font-semibold">EIMS six-step launch wizard</p>
					<h2 className="mt-1 text-xl font-semibold tracking-normal">MoR/INSA setup path</h2>
					<p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
						A dedicated launch screen for tax registration, source approval, certificate issuance, controlled test
						proof, and the first production invoice.
					</p>
				</div>
				<div className="rounded-md border bg-background p-3">
					<p className="text-xs font-medium uppercase text-muted-foreground">Current launch state</p>
					<p className="mt-1 text-lg font-semibold">
						{workspace.readiness.readyForLive ? "Ready for live invoices" : "Authority setup in progress"}
					</p>
					<p className="mt-1 text-xs leading-5 text-muted-foreground">{workspace.supportNote}</p>
				</div>
			</div>
			<div className="grid gap-3 p-4 lg:grid-cols-2 2xl:grid-cols-3">
				{eimsLaunchWizardSteps.map((step, index) => {
					const readinessStep = workspace.readiness.steps[index];
					const status = readinessStep?.status ?? (index < currentStepIndex ? "complete" : "pending");
					const isCurrent = index === Math.min(currentStepIndex, eimsLaunchWizardSteps.length - 1);
					return (
						<div
							key={step.title}
							className={`rounded-md border p-4 ${stepStatusTone(status)} ${isCurrent ? "ring-2 ring-primary/25" : ""}`}
						>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="text-xs font-medium uppercase text-muted-foreground">Step {index + 1}</p>
									<h3 className="mt-1 text-base font-semibold tracking-normal">{step.title}</h3>
								</div>
								<StatusBadge status={status} />
							</div>
							<div className="mt-3 grid gap-2 text-sm">
								<div className="rounded-md border bg-background/70 p-2">
									<span className="font-medium">Owner: </span>
									<span className="text-muted-foreground">{step.lane}</span>
								</div>
								<div className="rounded-md border bg-background/70 p-2">
									<span className="font-medium">Proof: </span>
									<span className="text-muted-foreground">{step.proof}</span>
								</div>
							</div>
							<p className="mt-3 text-sm leading-6 text-muted-foreground">{step.detail}</p>
						</div>
					);
				})}
			</div>
		</section>
	);
}

function AuthorityHandoffPacketPanel({
	setup,
	workspace,
}: {
	readonly setup: EimsSetupState;
	readonly workspace: EimsTenantWorkspace;
}) {
	const packetItems = [
		["Taxpayer profile", `${setup.counts.enterprises} saved`, "TIN, VAT, legal name, and contact channel"],
		[
			"Branch and source",
			`${setup.counts.establishments}/${setup.counts.sourceSystems}`,
			"Branch address and register/POS approval trail",
		],
		["MoR credentials", "encrypted", "API key, username, password, client ID, and client secret"],
		[
			"INSA certificate",
			workspace.readiness.readyForLive ? "validated" : "pending",
			"CSR, issued PEM, expiry, and key-match evidence",
		],
		[
			"Controlled test evidence",
			workspace.readiness.readyForLive ? "accepted" : "required",
			"Test invoice IRN, signed QR, and response payload",
		],
		[
			"Live launch",
			workspace.readiness.readyForLive ? "enabled" : "blocked",
			"Cashier training and first production invoice checkpoint",
		],
	] as const;

	return (
		<section className="rounded-md border bg-background">
			<div className="border-b p-4">
				<p className="text-sm font-semibold">Authority handoff packet</p>
				<p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
					All artifacts staff must collect before a tenant can issue compliant EIMS invoices in production.
				</p>
			</div>
			<div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
				{packetItems.map(([title, status, detail]) => (
					<div key={title} className="rounded-md border p-3">
						<div className="flex items-start justify-between gap-3">
							<p className="font-medium">{title}</p>
							<Badge variant="outline">{status}</Badge>
						</div>
						<p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
					</div>
				))}
			</div>
		</section>
	);
}

function ConciergeOnboardingCockpit({
	workspace,
	overview,
}: {
	readonly workspace: EimsTenantWorkspace;
	readonly overview: EimsOverview;
}) {
	const completedSteps = workspace.readiness.steps.filter((step) => doneStatuses.has(step.status.toLowerCase())).length;
	const totalSteps = Math.max(workspace.readiness.steps.length, 1);
	const firstOpenStepIndex = workspace.readiness.steps.findIndex(
		(step) => !doneStatuses.has(step.status.toLowerCase()),
	);
	const currentStepIndex = firstOpenStepIndex === -1 ? totalSteps - 1 : firstOpenStepIndex;
	const currentStageIndex = Math.min(
		conciergeStages.length - 1,
		Math.floor((currentStepIndex / totalSteps) * conciergeStages.length),
	);
	const summary = [
		["Setup gates", `${completedSteps}/${totalSteps}`],
		["Open blockers", String(workspace.readiness.blockers.length)],
		["Pending sync", String(overview.stats.pendingOffline)],
		["Cert alerts", String(overview.stats.certificatesExpiring)],
	] as const;

	return (
		<section className="overflow-hidden rounded-md border bg-background">
			<div className="grid gap-4 border-b bg-muted/25 p-4 xl:grid-cols-[1fr_420px]">
				<div>
					<p className="text-sm font-semibold">Concierge onboarding cockpit</p>
					<h2 className="mt-1 text-xl font-semibold tracking-normal">MoR and INSA launch control</h2>
					<p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
						Staff-assisted launch flow for tenant intake, MoR source approval, INSA certificate handling, controlled
						test proof, and first production invoice.
					</p>
				</div>
				<div className="grid grid-cols-2 gap-2">
					{summary.map(([label, value]) => (
						<div key={label} className="rounded-md border bg-background p-3">
							<p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
							<p className="mt-1 text-2xl font-semibold">{value}</p>
						</div>
					))}
				</div>
			</div>
			<div className="grid gap-3 p-4 xl:grid-cols-5">
				{conciergeStages.map((stage, index) => {
					const status = index < currentStageIndex ? "complete" : index === currentStageIndex ? "attention" : "pending";
					return (
						<div key={stage.title} className={`rounded-md border p-3 ${stepStatusTone(status)}`}>
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-sm font-semibold">{stage.title}</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{stage.owner} - {stage.window}
									</p>
								</div>
								<StatusBadge status={status} />
							</div>
							<ul className="mt-3 grid gap-2 text-xs text-muted-foreground">
								{stage.items.map((item) => (
									<li key={item} className="rounded-md border bg-background/70 px-2 py-1.5">
										{item}
									</li>
								))}
							</ul>
						</div>
					);
				})}
			</div>
			<div className="border-t px-4 py-3 text-sm text-muted-foreground">
				Launch gate timeline: tenant data before MoR, MoR approval before credentials, certificate before controlled
				test invoice, test invoice before live invoices.
			</div>
		</section>
	);
}

function TenantLaunchPanel({ workspace }: { readonly workspace: EimsTenantWorkspace }) {
	return (
		<section className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
			<div className="rounded-md border bg-background p-4">
				<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
					<div>
						<p className="text-sm font-semibold">Operational launch board</p>
						<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
							Track what the restaurant must provide, what staff controls, and when tax invoicing can be enabled.
						</p>
					</div>
					<Badge variant={workspace.readiness.readyForLive ? "default" : "secondary"}>
						{workspace.readiness.readyForLive ? "ready for live invoices" : "setup in progress"}
					</Badge>
				</div>
				<div className="mt-4 grid gap-3 md:grid-cols-3">
					{[
						{ label: "Open concierge launch console", href: "/onboarding" },
						...workspace.primaryActions.slice(0, 2),
					].map((action) => (
						<Button key={action.href} asChild variant="outline" className="justify-start">
							<a href={action.href}>{action.label}</a>
						</Button>
					))}
				</div>
			</div>
			<div className="rounded-md border bg-muted/25 p-4">
				<p className="text-sm font-semibold">Support note</p>
				<p className="mt-2 text-sm leading-6 text-muted-foreground">{workspace.supportNote}</p>
			</div>
		</section>
	);
}

function formatDateTime(value: string | null) {
	if (!value) return "No accepted invoice yet";
	return new Intl.DateTimeFormat(undefined, {
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		month: "short",
	}).format(new Date(value));
}

function EimsComplianceDashboardPanel({
	overview,
	workspace,
	cancellations,
	buyers,
}: {
	readonly overview: EimsOverview;
	readonly workspace: EimsTenantWorkspace;
	readonly cancellations?: readonly EimsCancellation[];
	readonly buyers?: readonly EimsBuyer[];
}) {
	const completedSteps = workspace.readiness.steps.filter((step) => doneStatuses.has(step.status.toLowerCase())).length;
	const totalSteps = Math.max(workspace.readiness.steps.length, 1);
	const complianceScore = Math.round((completedSteps / totalSteps) * 100);
	const failedSubmissions =
		overview.stats.unknownSubmissions +
		overview.recentSubmissions.filter((submission) => submission.status.toLowerCase().includes("failed")).length;
	const approvedSources = overview.sourceSystems.filter((source) => source.approvalStatus === "approved").length;
	const lastSuccessfulSubmission =
		overview.recentSubmissions.find((submission) => submission.status === "accepted" && submission.ackDate)?.ackDate ??
		null;
	const cancellationRate =
		cancellations && overview.recentSubmissions.length > 0
			? `${Math.round((cancellations.length / overview.recentSubmissions.length) * 100)}%`
			: "Measuring";
	const buyerCoverage =
		buyers && buyers.length > 0
			? `${Math.round((buyers.filter((buyer) => buyer.buyerTin).length / buyers.length) * 100)}%`
			: "Measuring";
	const scoreSweep = Math.max(0, Math.min(100, complianceScore)) * 3.6;
	const metrics = [
		{
			label: "Submissions this month",
			value: String(overview.recentSubmissions.length),
			detail: `${overview.stats.acceptedToday} accepted today`,
			tone: "border-l-emerald-500",
		},
		{
			label: "Failed submissions",
			value: String(failedSubmissions),
			detail: failedSubmissions > 0 ? "Action required before live launch" : "No current failures",
			tone: "border-l-rose-500",
		},
		{
			label: "Certificate expiry",
			value: overview.stats.certificatesExpiring > 0 ? `${overview.stats.certificatesExpiring} alert` : "Clear",
			detail: "INSA renewal countdown",
			tone: "border-l-amber-500",
		},
		{
			label: "Active source status",
			value: `${approvedSources}/${overview.sourceSystems.length}`,
			detail: "MoR-approved registers/POS",
			tone: "border-l-sky-500",
		},
		{
			label: "Last successful submission",
			value: formatDateTime(lastSuccessfulSubmission),
			detail: "Most recent accepted IRN",
			tone: "border-l-violet-500",
		},
		{
			label: "Cancellation rate",
			value: cancellationRate,
			detail: "Cancellations against visible invoices",
			tone: "border-l-orange-500",
		},
		{
			label: "Buyer registry coverage",
			value: buyerCoverage,
			detail: "Saved buyers with valid TINs",
			tone: "border-l-teal-500",
		},
		{
			label: "Open launch blockers",
			value: String(workspace.readiness.blockers.length),
			detail: workspace.readiness.readyForLive ? "Ready for production" : "Resolve before go-live",
			tone: "border-l-slate-500",
		},
	] as const;

	return (
		<section className="grid overflow-hidden rounded-md border bg-background lg:grid-cols-[320px_1fr]">
			<div className="border-b bg-[#101826] p-5 text-white lg:border-r lg:border-b-0">
				<p className="text-sm font-semibold">Compliance command center</p>
				<div
					className="mt-5 flex size-36 items-center justify-center rounded-full"
					style={{
						background: `conic-gradient(#22c55e ${scoreSweep}deg, rgba(255,255,255,0.14) 0deg)`,
					}}
				>
					<div className="flex size-28 flex-col items-center justify-center rounded-full bg-[#101826]">
						<span className="text-3xl font-semibold">{complianceScore}%</span>
						<span className="text-xs text-white/60">overall score</span>
					</div>
				</div>
				<p className="mt-4 text-sm leading-6 text-white/70">
					Review readiness before issuing live tax invoices. Resolve authority approval, certificate, invoice,
					cancellation, and buyer registry gaps before production launch.
				</p>
				<div className="mt-4 flex flex-wrap gap-2">
					<Button asChild className="bg-[#22c55e] text-[#07130c] hover:bg-[#4ade80]">
						<Link to="/onboarding">Open launch console</Link>
					</Button>
					<Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
						<Link to="/eims/setup">Continue EIMS setup</Link>
					</Button>
					<Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
						<Link to="/eims/compliance">Export evidence</Link>
					</Button>
				</div>
			</div>
			<div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
				{metrics.map((metric) => (
					<div key={metric.label} className={`rounded-md border border-border bg-muted/20 p-3 ${metric.tone}`}>
						<p className="text-xs font-medium uppercase text-muted-foreground">{metric.label}</p>
						<p className="mt-2 text-xl font-semibold tracking-normal">{metric.value}</p>
						<p className="mt-1 text-xs leading-5 text-muted-foreground">{metric.detail}</p>
					</div>
				))}
			</div>
		</section>
	);
}

function ComplianceReadinessPanel({
	readiness,
	readyCount,
	missingCount,
}: {
	readonly readiness: number;
	readonly readyCount: number;
	readonly missingCount: number;
}) {
	return (
		<Card>
			<CardContent className="grid gap-4 p-4 md:grid-cols-3">
				<div>
					<p className="text-sm text-muted-foreground">Export readiness</p>
					<p className="mt-1 text-3xl font-semibold">{readiness}%</p>
				</div>
				<div>
					<p className="text-sm text-muted-foreground">Ready evidence sets</p>
					<p className="mt-1 text-3xl font-semibold">{readyCount}</p>
				</div>
				<div>
					<p className="text-sm text-muted-foreground">Needs attention</p>
					<p className="mt-1 text-3xl font-semibold">{missingCount}</p>
				</div>
			</CardContent>
		</Card>
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
			emptyTitle="No records"
			emptyMessage="No EIMS records match this view."
			getRowId={(row) => row.id}
			pageSize={10}
			searchPlaceholder="Search EIMS records..."
			totalCount={tableRows.length}
		/>
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
	const cancellationsQuery = useEimsCancellations();
	const buyersQuery = useEimsBuyers();
	if (overviewQuery.isLoading || workspaceQuery.isLoading || !overviewQuery.data || !workspaceQuery.data)
		return <LoadingPanel />;
	const overview = overviewQuery.data.data;
	const workspace = workspaceQuery.data.data;

	return (
		<div className="space-y-5">
			<EimsWorkspaceHeader
				title="EIMS compliance dashboard"
				description={workspace.plainLanguageSummary}
				mode={workspace.operationModeLabel}
				overview={overview}
			/>
			<EimsComplianceDashboardPanel
				overview={overview}
				workspace={workspace}
				cancellations={cancellationsQuery.data?.data}
				buyers={buyersQuery.data?.data}
			/>
			{workspace.alerts.map((alert) => (
				<div key={alert.message} className="rounded-md border border-border bg-muted/30 p-3 text-sm">
					<span className="font-medium">{alert.level === "warning" ? "Next step" : alert.level}: </span>
					{alert.message}
				</div>
			))}
			<ConciergeOnboardingCockpit workspace={workspace} overview={overview} />
			<MorInsaFifteenStepTimelinePanel workspace={workspace} />
			<TenantLaunchPanel workspace={workspace} />
			<AuthorityFlowPanel overview={overview} />
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
			<EimsWorkspaceHeader
				title="MoR/INSA launch wizard"
				description="Move a tenant from taxpayer profile to source approval, encrypted credentials, issued certificate, test invoice IRN, and first live invoice."
				mode={workspace.operationModeLabel}
				overview={overview}
			/>
			<EimsLaunchWizardPanel workspace={workspace} />
			<MorInsaFifteenStepTimelinePanel workspace={workspace} />
			<AuthorityHandoffPacketPanel setup={setup} workspace={workspace} />
			<ConciergeOnboardingCockpit workspace={workspace} overview={overview} />
			<SetupJourneyPanel workspace={workspace} />
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
			<ComplianceReadinessPanel
				readiness={evidence.data.data.readiness}
				readyCount={evidence.data.data.items.filter((item) => businessStatusLabel(item.status) === "ready").length}
				missingCount={evidence.data.data.items.filter((item) => businessStatusLabel(item.status) !== "ready").length}
			/>
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
