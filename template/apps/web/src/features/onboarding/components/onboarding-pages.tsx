import { Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { useAdminOrgList, useAdminUserList } from "#features/admin/api/admin.queries";
import {
	type OnboardingMode,
	type OnboardingStep,
	type OnboardingSummary,
	type OnboardingTask,
	type OnboardingTaskStatus,
	type OnboardingTemplate,
	type TenantOnboarding,
	useAdminOnboardingTask,
	useAdminOnboardingTasks,
	useAssignOnboardingTask,
	useBlockOnboardingTask,
	useCancelOnboardingTask,
	useCompleteAdminOnboardingStep,
	useCompleteTenantOnboardingStep,
	useCreateOnboardingTask,
	useOnboardingTemplates,
	useTenantOnboarding,
} from "#features/onboarding/api/onboarding.hooks";
import { DataTable, useDataTableState } from "#shared/components/DataTable";
import { EmptyState, LoadingState, MetricCard, PageHeader } from "#shared/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const isTask = (value: TenantOnboarding | undefined): value is OnboardingTask => !!value && "id" in value;

const statusVariant = (status: string) => {
	if (status === "BLOCKED" || status === "FAILED" || status === "CANCELLED") return "destructive";
	if (status === "COMPLETED") return "default";
	return "secondary";
};

const modeLabel = (mode: OnboardingMode) => mode.replace("_", " ");
const statusFilters = ["ALL", "ACTIVE", "COMPLETED", "BLOCKED", "CANCELLED"] as const;
const modeFilters = ["ALL", "CONCIERGE", "SELF_SERVICE", "HYBRID"] as const;
const staleFilters = ["ALL", "5", "10", "15"] as const;

interface OnboardingTaskMetadata {
	readonly businessType?: string;
	readonly legalName?: string;
	readonly tradeName?: string;
	readonly taxId?: string;
	readonly vatNumber?: string;
	readonly region?: string;
	readonly subCity?: string;
	readonly woreda?: string;
	readonly houseNumber?: string;
	readonly managerPhone?: string;
	readonly preferredChannel?: string;
	readonly plan?: string;
	readonly paymentMethod?: string;
	readonly paymentAmount?: string;
	readonly paymentReference?: string;
	readonly receiptReference?: string;
}

const isStatusFilter = (value: unknown): value is OnboardingTaskStatus | "ALL" =>
	typeof value === "string" && statusFilters.includes(value as (typeof statusFilters)[number]);

const isModeFilter = (value: unknown): value is OnboardingMode | "ALL" =>
	typeof value === "string" && modeFilters.includes(value as (typeof modeFilters)[number]);

const isStaleFilter = (value: unknown): value is (typeof staleFilters)[number] =>
	typeof value === "string" && staleFilters.includes(value as (typeof staleFilters)[number]);

const taskMetadata = (task: OnboardingTask): OnboardingTaskMetadata =>
	task.metadata && typeof task.metadata === "object" && !Array.isArray(task.metadata)
		? (task.metadata as OnboardingTaskMetadata)
		: {};

const displayValue = (value: unknown, fallback = "-") => (typeof value === "string" && value.trim() ? value : fallback);

const daysSince = (date: string | null | undefined) => {
	if (!date) return 0;
	const timestamp = Date.parse(date);
	if (Number.isNaN(timestamp)) return 0;
	return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
};

const currentStep = (task: OnboardingTask) =>
	task.steps.find((step) => step.stepKey === task.currentStepKey) ??
	task.steps.find((step) => step.status === "IN_PROGRESS") ??
	task.steps.find((step) => step.status !== "COMPLETED") ??
	null;

const currentStepDays = (task: OnboardingTask) => daysSince(currentStep(task)?.startedAt ?? task.startedAt);

const averageCompletedDays = (tasks: readonly OnboardingTask[]) => {
	const completed = tasks
		.map((task) => {
			if (!task.completedAt) return null;
			const start = Date.parse(task.startedAt);
			const end = Date.parse(task.completedAt);
			if (Number.isNaN(start) || Number.isNaN(end)) return null;
			return Math.max(1, Math.ceil((end - start) / 86_400_000));
		})
		.filter((value): value is number => typeof value === "number");
	if (completed.length === 0) return "-";
	const total = completed.reduce((sum, value) => sum + value, 0);
	return `${Math.round(total / completed.length)}d`;
};

function ProgressBar({
	completed,
	total,
	percent,
}: {
	readonly completed: number;
	readonly total: number;
	readonly percent: number;
}) {
	return (
		<div className="min-w-36 space-y-1">
			<div className="h-2 overflow-hidden rounded bg-muted">
				<div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
			</div>
			<div className="text-xs text-muted-foreground">
				{completed}/{total} steps
			</div>
		</div>
	);
}

function StepList({
	steps,
	onComplete,
	isCompleting,
	tenantOnly,
}: {
	readonly steps: readonly OnboardingStep[];
	readonly onComplete?: (step: OnboardingStep) => void;
	readonly isCompleting?: boolean;
	readonly tenantOnly?: boolean;
}) {
	return (
		<ol className="space-y-3">
			{steps.map((step) => {
				const active = step.status === "IN_PROGRESS";
				const canComplete =
					onComplete &&
					step.status !== "COMPLETED" &&
					step.status !== "SKIPPED" &&
					(!tenantOnly || step.assigneeType === "TENANT" || step.canBeSelfService);
				return (
					<li key={step.id ?? step.stepKey} className="grid grid-cols-[2.25rem_1fr] gap-3">
						<div className="flex flex-col items-center">
							<div
								className={`flex size-9 items-center justify-center rounded-full border text-sm font-semibold ${
									active ? "border-primary bg-primary text-primary-foreground" : "bg-background"
								}`}
							>
								{step.stepOrder}
							</div>
							<div className="mt-2 h-full min-h-6 w-px bg-border" />
						</div>
						<div className={`rounded-md border p-4 ${active ? "border-primary/50 bg-primary/5" : "bg-background"}`}>
							<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
								<div className="min-w-0 space-y-2">
									<div className="flex flex-wrap items-center gap-2">
										<h3 className="font-medium">{step.title}</h3>
										<Badge variant={statusVariant(step.status)}>{step.status.replace("_", " ")}</Badge>
										<Badge variant="outline">{step.assigneeType}</Badge>
										<Badge variant="secondary">{step.category}</Badge>
									</div>
									{step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
									{step.notes && <p className="rounded bg-muted px-3 py-2 text-sm">{step.notes}</p>}
									{step.completedAt && (
										<p className="text-xs text-muted-foreground">
											Completed {new Date(step.completedAt).toLocaleString()}
										</p>
									)}
								</div>
								{canComplete && (
									<Button size="sm" onClick={() => onComplete(step)} disabled={isCompleting}>
										Complete step
									</Button>
								)}
							</div>
						</div>
					</li>
				);
			})}
		</ol>
	);
}

function CategoryBreakdown({ steps }: { readonly steps: readonly OnboardingStep[] }) {
	const counts = React.useMemo(() => {
		const next = new Map<string, { total: number; completed: number }>();
		for (const step of steps) {
			const current = next.get(step.category) ?? { total: 0, completed: 0 };
			current.total += 1;
			if (step.status === "COMPLETED") current.completed += 1;
			next.set(step.category, current);
		}
		return [...next.entries()];
	}, [steps]);

	return (
		<div className="flex flex-wrap gap-2">
			{counts.map(([category, count]) => (
				<Badge key={category} variant="outline">
					{category}: {count.completed}/{count.total}
				</Badge>
			))}
		</div>
	);
}

function TemplatePreview({ template }: { readonly template: OnboardingTemplate | undefined }) {
	if (!template) {
		return (
			<Card>
				<CardContent className="py-8">
					<p className="text-sm text-muted-foreground">Select a template to preview its steps.</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{template.name}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-3 sm:grid-cols-3">
					{[
						["Vertical", template.vertical],
						["Estimated", `${template.estimatedDays}d`],
						["Steps", template.stepDefinitions.length],
					].map(([label, value]) => (
						<div key={label} className="rounded-md border bg-muted/30 p-3">
							<div className="text-xs uppercase text-muted-foreground">{label}</div>
							<div className="text-lg font-semibold">{value}</div>
						</div>
					))}
				</div>
				<div className="space-y-2">
					{template.stepDefinitions.slice(0, 6).map((step) => (
						<div key={step.stepKey} className="flex items-start gap-3 rounded-md border p-3">
							<div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
								{step.stepOrder}
							</div>
							<div>
								<div className="text-sm font-medium">{step.title}</div>
								<div className="text-xs text-muted-foreground">{step.description}</div>
							</div>
						</div>
					))}
					{template.stepDefinitions.length > 6 && (
						<p className="text-xs text-muted-foreground">+{template.stepDefinitions.length - 6} more steps</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function OnboardingConsoleBand({
	mode,
	progress,
	current,
}: {
	readonly mode: string;
	readonly progress: { readonly completed: number; readonly total: number; readonly percent: number };
	readonly current: { readonly title: string; readonly description?: string | null } | null;
}) {
	return (
		<section className="overflow-hidden rounded-lg border border-[#1e241a] bg-[#11130f] text-white">
			<div className="grid gap-6 p-5 md:grid-cols-[1.2fr_0.8fr] md:p-6">
				<div className="space-y-4">
					<div className="flex flex-wrap items-center gap-2">
						<Badge className="bg-primary text-primary-foreground hover:bg-primary">{mode}</Badge>
						<Badge variant="outline" className="border-white/20 text-white">
							{progress.percent}% ready
						</Badge>
					</div>
					<div className="space-y-2">
						<h2 className="text-2xl font-semibold tracking-normal">Concierge launch workflow</h2>
						<p className="max-w-2xl text-sm leading-6 text-white/65">
							The base template now treats tenant setup as an operational workflow: staff-assisted by default,
							self-service when appropriate, and starter-pack ready for EIMS or any future vertical.
						</p>
					</div>
					<div className="grid gap-2 sm:grid-cols-3">
						{["Collect tenant details", "Complete assisted setup", "Verify first live action"].map((item, index) => (
							<div key={item} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
								<div className="font-mono text-xs text-white/40">0{index + 1}</div>
								<div className="mt-2 text-sm font-medium">{item}</div>
							</div>
						))}
					</div>
				</div>
				<div className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
					<div className="text-xs font-medium uppercase text-white/45">Current action</div>
					<div className="mt-3 text-xl font-semibold">{current?.title ?? "Ready to create workflow"}</div>
					<p className="mt-2 text-sm leading-6 text-white/62">
						{current?.description ??
							"Create or assign a tenant workflow from the admin onboarding queue to start tracking setup."}
					</p>
					<div className="mt-5">
						<ProgressBar {...progress} />
					</div>
				</div>
			</div>
		</section>
	);
}

const assistedLaunchLanes = [
	{
		title: "Tenant intake",
		owner: "Staff",
		detail: "Business identity, payment evidence, contact channel, and support owner.",
	},
	{
		title: "Setup execution",
		owner: "Staff + tenant",
		detail: "Workspace settings, access, billing checks, and starter-pack tasks.",
	},
	{
		title: "Tenant handoff",
		owner: "Tenant",
		detail: "Self-service steps, training checkpoints, and first operator confirmation.",
	},
	{
		title: "Launch proof",
		owner: "Staff",
		detail: "Final readiness note, blocked-task audit, and production approval.",
	},
] as const;

function AssistedLaunchDesk({
	mode,
	progress,
	current,
}: {
	readonly mode: string;
	readonly progress: { readonly completed: number; readonly total: number; readonly percent: number };
	readonly current: OnboardingStep | null;
}) {
	const displayMode = mode.replace("_", " ");

	return (
		<section className="rounded-md border bg-background">
			<div className="grid gap-4 border-b bg-muted/30 p-4 lg:grid-cols-[1fr_20rem]">
				<div>
					<p className="text-sm font-semibold">Assisted launch desk</p>
					<h2 className="mt-1 text-xl font-semibold tracking-normal">Operational handoff map</h2>
					<p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
						{displayMode} mode keeps the current owner, next handoff, and launch evidence visible before the tenant
						reaches production.
					</p>
				</div>
				<div className="rounded-md border bg-background p-3">
					<div className="text-xs font-medium uppercase text-muted-foreground">Now handling</div>
					<div className="mt-2 text-lg font-semibold">{current?.title ?? "Workflow not started"}</div>
					<div className="mt-1 text-sm text-muted-foreground">
						{progress.completed}/{progress.total} checkpoints complete
					</div>
				</div>
			</div>
			<div className="grid gap-3 p-4 lg:grid-cols-4">
				{assistedLaunchLanes.map((lane, index) => {
					const active =
						current &&
						(index === 0
							? ["setup", "profile"].includes(current.category)
							: index === 1
								? ["access", "billing"].includes(current.category)
								: index === 2
									? current.assigneeType === "TENANT"
									: ["launch", "verification"].includes(current.category));
					return (
						<div key={lane.title} className={`rounded-md border p-4 ${active ? "border-primary/45 bg-primary/5" : ""}`}>
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-medium">{lane.title}</p>
									<p className="mt-2 text-sm leading-6 text-muted-foreground">{lane.detail}</p>
								</div>
								<Badge variant={active ? "default" : "outline"}>{lane.owner}</Badge>
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}

function AdminConciergeQueueBoard({
	tasks,
	summary,
}: {
	readonly tasks: readonly OnboardingTask[];
	readonly summary: OnboardingSummary | undefined;
}) {
	const unassigned = tasks.filter((task) => !task.assignedToUserId).length;
	const tenantHandoffs = tasks.filter((task) => currentStep(task)?.assigneeType === "TENANT").length;
	const staffOwned = tasks.filter((task) => currentStep(task)?.assigneeType === "STAFF").length;
	const blocked = summary?.blocked ?? 0;
	const stale = summary?.stale ?? 0;
	const lanes = [
		["Unassigned intake", unassigned, "Needs a staff owner"],
		["Staff execution", staffOwned, "Work currently owned by support"],
		["Tenant handoff", tenantHandoffs, "Waiting on tenant action"],
		["Blocked or stale", blocked + stale, "Escalate before launch slips"],
	] as const;

	return (
		<section className="rounded-md border bg-background">
			<div className="grid gap-4 border-b bg-muted/30 p-4 lg:grid-cols-[1fr_18rem]">
				<div>
					<p className="text-sm font-semibold">Concierge launch desk</p>
					<h2 className="mt-1 text-xl font-semibold tracking-normal">Queue by owner and risk</h2>
					<p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
						Staff can separate new intake, active setup work, tenant handoffs, and blocked launches without leaving the
						onboarding table.
					</p>
				</div>
				<div className="rounded-md border bg-background p-3">
					<div className="text-xs font-medium uppercase text-muted-foreground">Visible queue</div>
					<div className="mt-2 text-3xl font-semibold">{tasks.length}</div>
					<div className="mt-1 text-sm text-muted-foreground">Rows in the current filtered view</div>
				</div>
			</div>
			<div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
				{lanes.map(([label, value, helper]) => (
					<div key={label} className="rounded-md border p-4">
						<div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
						<div className="mt-2 text-2xl font-semibold">{value}</div>
						<div className="mt-1 text-sm text-muted-foreground">{helper}</div>
					</div>
				))}
			</div>
		</section>
	);
}

function ConciergeIntakeHandoffPanel({
	mode,
	template,
	assigned,
}: {
	readonly mode: OnboardingMode;
	readonly template: OnboardingTemplate | undefined;
	readonly assigned: string;
}) {
	const selectedMode = modeLabel(mode);
	const owner = assigned === "UNASSIGNED" ? "Unassigned" : "Staff owner selected";
	const rows = [
		["Mode", selectedMode],
		["Template", template?.name ?? "Template pending"],
		["Staff owner", owner],
		["Checkpoints", `${template?.stepDefinitions.length ?? 0}`],
	] as const;

	return (
		<section className="rounded-md border bg-background">
			<div className="border-b bg-muted/30 p-4">
				<p className="text-sm font-semibold">Launch handoff</p>
				<h2 className="mt-1 text-xl font-semibold tracking-normal">Create a staff-owned workflow</h2>
				<p className="mt-2 text-sm leading-6 text-muted-foreground">
					The task starts with intake evidence, then moves through staff execution, tenant-owned checks, and launch
					approval.
				</p>
			</div>
			<div className="grid gap-2 p-4">
				{rows.map(([label, value]) => (
					<div key={label} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
						<span className="text-muted-foreground">{label}</span>
						<span className="font-medium text-right">{value}</span>
					</div>
				))}
			</div>
		</section>
	);
}

function IntakeSummary({ task }: { readonly task: OnboardingTask }) {
	const metadata = taskMetadata(task);
	const items = [
		["Legal name", metadata.legalName ?? task.organization?.name],
		["Trade name", metadata.tradeName],
		["TIN", metadata.taxId],
		["VAT", metadata.vatNumber],
		["Business type", metadata.businessType],
		["Region", metadata.region],
		["Sub-city", metadata.subCity],
		["Woreda", metadata.woreda],
	];

	return (
		<div className="grid gap-2 sm:grid-cols-2">
			{items.map(([label, value]) => (
				<div key={label} className="rounded-md border bg-muted/20 p-3">
					<div className="text-xs uppercase text-muted-foreground">{label}</div>
					<div className="mt-1 truncate text-sm font-medium">{displayValue(value)}</div>
				</div>
			))}
		</div>
	);
}

function StepActionPanel({
	task,
	step,
	notes,
	onNotesChange,
	onComplete,
	isCompleting,
}: {
	readonly task: OnboardingTask;
	readonly step: OnboardingStep | null;
	readonly notes: string;
	readonly onNotesChange: (value: string) => void;
	readonly onComplete: (step: OnboardingStep) => void;
	readonly isCompleting: boolean;
}) {
	const metadata = taskMetadata(task);
	const checklist = React.useMemo(() => {
		if (!step) return [];
		if (step.stepKey.includes("mor")) {
			return [
				`Copy TIN ${displayValue(metadata.taxId)} into the MoR portal`,
				`Use ${displayValue(task.contactPhone)} for OTP coordination`,
				"Record portal status and any officer follow-up note",
			];
		}
		if (step.stepKey.includes("credential")) {
			return [
				"Capture client ID, client secret, API key, and system number only in backend forms",
				"Confirm the credential test succeeds before moving forward",
				"Never paste raw secrets into notes or activity comments",
			];
		}
		if (step.stepKey.includes("csr") || step.stepKey.includes("certificate") || step.stepKey.includes("insa")) {
			return [
				"Generate CSR server-side with the configured signing provider",
				"Send CSR and supporting forms to INSA",
				"Validate issued certificate expiry and key match before activation",
			];
		}
		if (step.stepKey.includes("payment") || step.category === "billing") {
			return [
				`Plan: ${displayValue(metadata.plan)}`,
				`Payment: ${displayValue(metadata.paymentMethod)} ${displayValue(metadata.paymentAmount, "")}`.trim(),
				`Reference: ${displayValue(metadata.paymentReference)}`,
			];
		}
		return [
			"Confirm required evidence has been captured",
			"Add a concise completion note for the next staff member",
			"Complete the step only when the tenant can safely proceed",
		];
	}, [metadata, step, task.contactPhone]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Current action panel</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<ProgressBar {...task.progress} />
				{step ? (
					<div className="space-y-4">
						<div className="rounded-md border bg-primary/5 p-4">
							<div className="flex flex-wrap items-center gap-2">
								<h2 className="font-medium">{step.title}</h2>
								<Badge variant="outline">{step.category}</Badge>
								<Badge variant="secondary">{step.assigneeType}</Badge>
								<Badge variant={statusVariant(step.status)}>{step.status.replace("_", " ")}</Badge>
							</div>
							{step.description && <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>}
						</div>
						<div className="grid gap-2">
							{checklist.map((item) => (
								<div key={item} className="flex gap-3 rounded-md border p-3 text-sm">
									<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
										-
									</span>
									<span>{item}</span>
								</div>
							))}
						</div>
						<div className="grid gap-2">
							<Label htmlFor="admin-step-note">Completion note</Label>
							<Input
								id="admin-step-note"
								placeholder="What changed, what evidence was checked, or who confirmed it?"
								value={notes}
								onChange={(event) => onNotesChange(event.target.value)}
							/>
						</div>
						<Button onClick={() => onComplete(step)} disabled={isCompleting || step.status === "COMPLETED"}>
							{isCompleting ? "Completing..." : "Complete current step"}
						</Button>
					</div>
				) : (
					<EmptyState title="No active step" description="All steps have been completed or the task is paused." />
				)}
			</CardContent>
		</Card>
	);
}

function TenantContactCard({ task }: { readonly task: OnboardingTask }) {
	const metadata = taskMetadata(task);
	const phoneHref = `tel:${task.contactPhone}`;
	const emailHref = `mailto:${task.contactEmail}`;
	const whatsappHref = `https://wa.me/${task.contactPhone.replace(/\D/g, "")}`;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Tenant contact</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4 text-sm">
				<div className="grid gap-3">
					<div>
						<div className="text-muted-foreground">Owner</div>
						<div className="font-medium">{task.contactName}</div>
					</div>
					<div>
						<div className="text-muted-foreground">Manager phone</div>
						<div className="font-medium">{displayValue(metadata.managerPhone)}</div>
					</div>
					<div>
						<div className="text-muted-foreground">Preferred channel</div>
						<div className="font-medium">{displayValue(metadata.preferredChannel, "Phone")}</div>
					</div>
				</div>
				<div className="grid gap-2">
					<Button variant="outline" asChild>
						<a href={whatsappHref} target="_blank" rel="noreferrer">
							Open WhatsApp
						</a>
					</Button>
					<Button variant="outline" asChild>
						<a href={phoneHref}>Call tenant</a>
					</Button>
					<Button variant="outline" asChild>
						<a href={emailHref}>Send email</a>
					</Button>
				</div>
				{task.blockedReason && (
					<p className="rounded-md bg-destructive/10 p-3 text-destructive">{task.blockedReason}</p>
				)}
			</CardContent>
		</Card>
	);
}

export function TenantOnboardingPage() {
	const { data, isLoading } = useTenantOnboarding();
	const complete = useCompleteTenantOnboardingStep();
	const [notes, setNotes] = React.useState("");

	const handleComplete = React.useCallback(
		(step: OnboardingStep) => {
			complete.mutate({ stepKey: step.stepKey, notes });
			setNotes("");
		},
		[complete, notes],
	);

	if (isLoading) return <LoadingState rows={5} />;

	if (!isTask(data)) {
		const steps = data?.defaultTemplate.steps ?? [];
		const previewSteps = steps.map((step, index) => ({
			...step,
			id: step.stepKey,
			status: index === 0 ? "IN_PROGRESS" : "PENDING",
			startedAt: null,
			completedAt: null,
			completedByUserId: null,
			notes: null,
			blocked: false,
			blockedReason: null,
		})) satisfies OnboardingStep[];

		return (
			<div className="space-y-6">
				<PageHeader
					eyebrow="Workspace setup"
					title="Launch console"
					description="The default SaaS entry screen now shows the assisted onboarding workflow instead of a generic starter page."
				/>
				<OnboardingConsoleBand
					mode="CONCIERGE DEFAULT"
					progress={{ completed: 0, total: previewSteps.length, percent: 0 }}
					current={previewSteps[0] ?? null}
				/>
				<AssistedLaunchDesk
					mode="CONCIERGE"
					progress={{ completed: 0, total: previewSteps.length, percent: 0 }}
					current={previewSteps[0] ?? null}
				/>
				<div className="grid gap-4 md:grid-cols-3">
					<MetricCard label="Default mode" value="Concierge" helper="Staff-assisted setup is ready by default." />
					<MetricCard label="Self-service" value="Available" helper="Tenant-visible steps can be completed here." />
					<MetricCard label="Checklist" value={previewSteps.length} helper="Starter packs can add their own steps." />
				</div>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{data?.defaultTemplate.name ?? "Generic SaaS setup"}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<CategoryBreakdown steps={previewSteps} />
						<StepList steps={previewSteps} tenantOnly />
					</CardContent>
				</Card>
			</div>
		);
	}

	const step = currentStep(data);

	return (
		<div className="space-y-6">
			<PageHeader
				eyebrow="Workspace setup"
				title="Launch console"
				description="Your active tenant setup workflow, shared with support staff when concierge or hybrid mode is enabled."
				actions={
					<>
						<Badge variant={statusVariant(data.status)}>{data.status}</Badge>
						<Badge variant="outline">{modeLabel(data.mode)}</Badge>
					</>
				}
			/>

			<OnboardingConsoleBand mode={modeLabel(data.mode)} progress={data.progress} current={step} />
			<AssistedLaunchDesk mode={data.mode} progress={data.progress} current={step} />

			<div className="grid gap-4 md:grid-cols-3">
				<MetricCard
					label="Progress"
					value={`${data.progress.percent}%`}
					helper={`${data.progress.completed}/${data.progress.total} steps`}
				/>
				<MetricCard label="Current step" value={step?.stepOrder ?? "-"} helper={step?.title ?? "No active step"} />
				<MetricCard
					label="Assignee"
					value={step?.assigneeType ?? "-"}
					helper={data.assignedTo?.name ?? "Shared workflow"}
				/>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Current action</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<ProgressBar {...data.progress} />
					{step ? (
						<div className="rounded-md border bg-primary/5 p-4">
							<div className="flex flex-wrap items-center gap-2">
								<h2 className="font-medium">{step.title}</h2>
								<Badge variant="outline">{step.category}</Badge>
								<Badge variant="secondary">{step.assigneeType}</Badge>
							</div>
							{step.description && <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>}
						</div>
					) : (
						<EmptyState
							title="No active step"
							description="The workflow is either complete or waiting for staff review."
						/>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Step timeline</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<Input
						placeholder="Optional completion note"
						value={notes}
						onChange={(event) => setNotes(event.target.value)}
					/>
					<CategoryBreakdown steps={data.steps} />
					<StepList steps={data.steps} onComplete={handleComplete} isCompleting={complete.isPending} tenantOnly />
				</CardContent>
			</Card>
		</div>
	);
}

export function AdminOnboardingListPage() {
	const tableState = useDataTableState({
		defaultPageSize: 20,
		defaultSort: [{ id: "startedAt", desc: true }],
	});
	const status = isStatusFilter(tableState.urlSearch.status) ? tableState.urlSearch.status : "ACTIVE";
	const mode = isModeFilter(tableState.urlSearch.mode) ? tableState.urlSearch.mode : "ALL";
	const vertical = typeof tableState.urlSearch.vertical === "string" ? tableState.urlSearch.vertical : "ALL";
	const assignedToUserId =
		typeof tableState.urlSearch.assignedToUserId === "string" ? tableState.urlSearch.assignedToUserId : "ALL";
	const staleDays = isStaleFilter(tableState.urlSearch.staleDays) ? tableState.urlSearch.staleDays : "ALL";
	const setStatus = React.useCallback(
		(value: OnboardingTaskStatus | "ALL") =>
			tableState.setSearchParams({ status: value === "ALL" ? undefined : value, page: 1 }),
		[tableState],
	);
	const setMode = React.useCallback(
		(value: OnboardingMode | "ALL") =>
			tableState.setSearchParams({ mode: value === "ALL" ? undefined : value, page: 1 }),
		[tableState],
	);
	const setVertical = React.useCallback(
		(value: string) => tableState.setSearchParams({ vertical: value === "ALL" ? undefined : value, page: 1 }),
		[tableState],
	);
	const setAssignedToUserId = React.useCallback(
		(value: string) => tableState.setSearchParams({ assignedToUserId: value === "ALL" ? undefined : value, page: 1 }),
		[tableState],
	);
	const setStaleDays = React.useCallback(
		(value: (typeof staleFilters)[number]) =>
			tableState.setSearchParams({ staleDays: value === "ALL" ? undefined : value, page: 1 }),
		[tableState],
	);
	const { data: users } = useAdminUserList({ limit: 100 });
	const staffUsers = Array.isArray(users?.data) ? users.data : [];
	const { data, isLoading, error, refetch } = useAdminOnboardingTasks({
		status: status === "ALL" ? undefined : status,
		mode: mode === "ALL" ? undefined : mode,
		vertical: vertical === "ALL" ? undefined : vertical,
		assignedToUserId: assignedToUserId === "ALL" ? undefined : assignedToUserId,
		staleDays: staleDays === "ALL" ? undefined : Number(staleDays),
		page: tableState.queryParams.page,
		limit: tableState.queryParams.limit,
		search: tableState.queryParams.search,
		sort: tableState.queryParams.sort,
	});
	const tasks = data?.data ?? [];
	const summary = data?.summary;
	const avgCompletedDays = averageCompletedDays(tasks);

	const columns = React.useMemo<ColumnDef<OnboardingTask, unknown>[]>(
		() => [
			{
				id: "tenant",
				accessorFn: (task) =>
					`${task.organization?.name ?? task.organizationId} ${task.contactName} ${task.contactEmail} ${task.contactPhone} ${displayValue(taskMetadata(task).taxId, "")} ${displayValue(taskMetadata(task).businessType, "")}`,
				header: "Tenant",
				cell: ({ row }) => {
					const metadata = taskMetadata(row.original);
					return (
						<div>
							<div className="font-medium">{row.original.organization?.name ?? row.original.organizationId}</div>
							<div className="text-xs text-muted-foreground">
								{displayValue(metadata.businessType, row.original.templateKey)} - TIN {displayValue(metadata.taxId)}
							</div>
							<div className="text-xs text-muted-foreground">
								{row.original.contactName} - {row.original.contactPhone}
							</div>
						</div>
					);
				},
				meta: { filter: { type: "text" } },
			},
			{
				id: "mode",
				accessorFn: (task) => task.mode,
				header: "Mode",
				cell: ({ row }) => <Badge variant="outline">{modeLabel(row.original.mode)}</Badge>,
				meta: {
					filter: {
						type: "select",
						options: [
							{ value: "CONCIERGE", label: "Concierge" },
							{ value: "SELF_SERVICE", label: "Self service" },
							{ value: "HYBRID", label: "Hybrid" },
						],
					},
				},
			},
			{
				id: "status",
				accessorFn: (task) => task.status,
				header: "Status",
				cell: ({ row }) => <Badge variant={statusVariant(row.original.status)}>{row.original.status}</Badge>,
				meta: {
					filter: {
						type: "select",
						options: [
							{ value: "ACTIVE", label: "Active" },
							{ value: "BLOCKED", label: "Blocked" },
							{ value: "COMPLETED", label: "Completed" },
							{ value: "CANCELLED", label: "Cancelled" },
						],
					},
				},
			},
			{
				id: "currentStep",
				accessorFn: (task) => currentStep(task)?.title ?? "Complete",
				header: "Current step",
				cell: ({ row }) => {
					const step = currentStep(row.original);
					return (
						<div>
							<div className="font-medium">{step?.title ?? "Complete"}</div>
							<div className="text-xs text-muted-foreground">{step?.category ?? row.original.templateKey}</div>
						</div>
					);
				},
				meta: { filter: { type: "text" } },
			},
			{
				id: "progress",
				accessorFn: (task) => task.progress.percent,
				header: "Progress",
				cell: ({ row }) => <ProgressBar {...row.original.progress} />,
				enableSorting: false,
				meta: { filter: { type: "number-range" } },
			},
			{
				id: "assigned",
				accessorFn: (task) => task.assignedTo?.name ?? "Unassigned",
				header: "Assigned",
				cell: ({ row }) => row.original.assignedTo?.name ?? "Unassigned",
				meta: { filter: { type: "text" } },
			},
			{
				id: "daysInStep",
				accessorFn: (task) => currentStepDays(task),
				header: "Days in step",
				cell: ({ row }) => {
					const days = currentStepDays(row.original);
					return (
						<Badge variant={days > 5 ? "destructive" : "secondary"}>
							{days}d{days > 5 ? " stuck" : ""}
						</Badge>
					);
				},
				enableSorting: false,
				meta: { filter: { type: "number-range" } },
			},
			{
				id: "actions",
				header: "Actions",
				enableSorting: false,
				enableColumnFilter: false,
				cell: ({ row }) => (
					<div className="text-right">
						<Link to="/admin/onboarding/$taskId" params={{ taskId: row.original.id }}>
							<Button variant="outline" size="sm">
								View
							</Button>
						</Link>
					</div>
				),
				meta: { className: "text-right", headerClassName: "text-right" },
			},
		],
		[],
	);

	const toolbarActions = (
		<>
			<Select value={status} onValueChange={(value) => setStatus(value as OnboardingTaskStatus | "ALL")}>
				<SelectTrigger className="w-full md:w-44">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="ALL">All statuses</SelectItem>
					<SelectItem value="ACTIVE">Active</SelectItem>
					<SelectItem value="BLOCKED">Blocked</SelectItem>
					<SelectItem value="COMPLETED">Completed</SelectItem>
					<SelectItem value="CANCELLED">Cancelled</SelectItem>
				</SelectContent>
			</Select>
			<Select value={mode} onValueChange={(value) => setMode(value as OnboardingMode | "ALL")}>
				<SelectTrigger className="w-full md:w-44">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="ALL">All modes</SelectItem>
					<SelectItem value="CONCIERGE">Concierge</SelectItem>
					<SelectItem value="SELF_SERVICE">Self service</SelectItem>
					<SelectItem value="HYBRID">Hybrid</SelectItem>
				</SelectContent>
			</Select>
			<Select value={vertical} onValueChange={setVertical}>
				<SelectTrigger className="w-full md:w-44">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="ALL">All verticals</SelectItem>
					<SelectItem value="generic">Generic</SelectItem>
					<SelectItem value="restaurant">Restaurant</SelectItem>
					<SelectItem value="hotel">Hotel</SelectItem>
					<SelectItem value="retail">Retail</SelectItem>
				</SelectContent>
			</Select>
			<Select value={assignedToUserId} onValueChange={setAssignedToUserId}>
				<SelectTrigger className="w-full md:w-48">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="ALL">All staff</SelectItem>
					<SelectItem value="UNASSIGNED">Unassigned</SelectItem>
					{staffUsers.map((user) => (
						<SelectItem key={user.id} value={user.id}>
							{user.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select value={staleDays} onValueChange={(value) => setStaleDays(value as (typeof staleFilters)[number])}>
				<SelectTrigger className="w-full md:w-44">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="ALL">Any age</SelectItem>
					<SelectItem value="5">Stuck 5d+</SelectItem>
					<SelectItem value="10">Stuck 10d+</SelectItem>
					<SelectItem value="15">Stuck 15d+</SelectItem>
				</SelectContent>
			</Select>
			<Link to="/admin/onboarding/new">
				<Button>New tenant</Button>
			</Link>
		</>
	);

	return (
		<div className="space-y-6">
			<PageHeader
				eyebrow="Operations"
				title="Concierge onboarding"
				description="Staff-assisted tenant setup workflows, stuck-task visibility, and handoffs for self-service or hybrid tenants."
			/>

			<AdminConciergeQueueBoard tasks={tasks} summary={summary} />

			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				<MetricCard label="Active" value={summary?.active ?? 0} />
				<MetricCard
					label="Stuck >5d"
					value={summary?.stale ?? 0}
					helper="Needs staff follow-up"
					className={summary?.stale ? "border-destructive/40 bg-destructive/5" : undefined}
				/>
				<MetricCard label="Done this month" value={summary?.completedThisMonth ?? 0} />
				<MetricCard label="Avg completion" value={avgCompletedDays} helper="Visible for completed rows in view" />
			</div>

			<Card>
				<CardContent className="p-4">
					<DataTable
						columns={columns}
						data={tasks}
						isLoading={isLoading}
						error={error}
						onRetry={() => void refetch()}
						searchPlaceholder="Search tenants, contacts, or steps..."
						emptyTitle="No onboarding tasks"
						emptyMessage="Create the first tenant onboarding workflow to start tracking setup."
						emptyAction={
							<Link to="/admin/onboarding/new">
								<Button>Create onboarding task</Button>
							</Link>
						}
						totalCount={data?.meta.total}
						pageCount={data?.meta.totalPages}
						toolbarActions={toolbarActions}
						{...tableState.tableProps}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function AdminOnboardingDetailPage({ taskId }: { readonly taskId: string }) {
	const { data: task, isLoading } = useAdminOnboardingTask(taskId);
	const { data: users } = useAdminUserList({ limit: 100 });
	const staffUsers = Array.isArray(users?.data) ? users.data : [];
	const complete = useCompleteAdminOnboardingStep(taskId);
	const assign = useAssignOnboardingTask(taskId);
	const block = useBlockOnboardingTask(taskId);
	const cancel = useCancelOnboardingTask(taskId);
	const [notes, setNotes] = React.useState("");

	const handleComplete = React.useCallback(
		(step: OnboardingStep) => {
			complete.mutate({ stepKey: step.stepKey, notes });
			setNotes("");
		},
		[complete, notes],
	);

	const handleBlock = React.useCallback(() => {
		const reason = window.prompt("Why is this onboarding blocked?");
		if (reason?.trim()) block.mutate(reason.trim());
	}, [block]);

	const handleCancel = React.useCallback(() => {
		if (window.confirm("Cancel this onboarding task?")) cancel.mutate();
	}, [cancel]);

	if (isLoading) return <LoadingState rows={6} />;
	if (!task) return <EmptyState title="Onboarding task not found" />;

	const step = currentStep(task);
	const metadata = taskMetadata(task);
	const daysInStep = currentStepDays(task);

	return (
		<div className="space-y-6">
			<PageHeader
				eyebrow="Concierge workflow"
				title={task.organization?.name ?? "Tenant onboarding"}
				description={`${displayValue(metadata.businessType, "Tenant")} - ${displayValue(metadata.taxId, "TIN pending")} - ${task.contactName}`}
				actions={
					<>
						<Link to="/admin/onboarding">
							<Button variant="outline">Back</Button>
						</Link>
						<Select
							value={task.assignedToUserId ?? "UNASSIGNED"}
							onValueChange={(value) => assign.mutate(value === "UNASSIGNED" ? null : value)}
							disabled={assign.isPending}
						>
							<SelectTrigger className="w-full md:w-48">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="UNASSIGNED">Unassigned</SelectItem>
								{staffUsers.map((user) => (
									<SelectItem key={user.id} value={user.id}>
										{user.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button variant="outline" onClick={handleBlock} disabled={block.isPending}>
							Block
						</Button>
						<Button variant="destructive" onClick={handleCancel} disabled={cancel.isPending}>
							Cancel
						</Button>
					</>
				}
			/>

			<div className="grid gap-4 md:grid-cols-4">
				<MetricCard label="Status" value={<Badge variant={statusVariant(task.status)}>{task.status}</Badge>} />
				<MetricCard label="Mode" value={modeLabel(task.mode)} />
				<MetricCard
					label="Progress"
					value={`${task.progress.percent}%`}
					helper={`${task.progress.completed}/${task.progress.total} steps`}
				/>
				<MetricCard
					label="Days in step"
					value={daysInStep}
					helper={daysInStep > 5 ? "Needs staff follow-up" : "Within target"}
					className={daysInStep > 5 ? "border-destructive/40 bg-destructive/5" : undefined}
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
				<div className="space-y-4">
					<StepActionPanel
						task={task}
						step={step}
						notes={notes}
						onNotesChange={setNotes}
						onComplete={handleComplete}
						isCompleting={complete.isPending}
					/>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Step timeline</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<CategoryBreakdown steps={task.steps} />
							<StepList steps={task.steps} onComplete={handleComplete} isCompleting={complete.isPending} />
						</CardContent>
					</Card>
				</div>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Tenant intake</CardTitle>
						</CardHeader>
						<CardContent>
							<IntakeSummary task={task} />
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Payment evidence</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							<div>
								<div className="text-muted-foreground">Plan</div>
								<div className="font-medium">{displayValue(metadata.plan)}</div>
							</div>
							<div>
								<div className="text-muted-foreground">Method</div>
								<div className="font-medium">{displayValue(metadata.paymentMethod)}</div>
							</div>
							<div>
								<div className="text-muted-foreground">Reference</div>
								<div className="font-medium">{displayValue(metadata.paymentReference)}</div>
							</div>
						</CardContent>
					</Card>

					<TenantContactCard task={task} />

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Activity</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{task.activities.map((activity) => (
								<div key={activity.id} className="border-b pb-3 last:border-0 last:pb-0">
									<div className="text-sm font-medium">{activity.message}</div>
									<div className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleString()}</div>
								</div>
							))}
							{task.activities.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

export function AdminOnboardingNewPage() {
	const navigate = useNavigate();
	const { data: orgs } = useAdminOrgList({ limit: 100 });
	const { data: users } = useAdminUserList({ limit: 100 });
	const { data: templates = [] } = useOnboardingTemplates();
	const organizations = React.useMemo(() => (Array.isArray(orgs?.data) ? orgs.data : []), [orgs?.data]);
	const staffUsers = React.useMemo(() => (Array.isArray(users?.data) ? users.data : []), [users?.data]);
	const createTask = useCreateOnboardingTask();
	const [organizationId, setOrganizationId] = React.useState("");
	const [templateKey, setTemplateKey] = React.useState("");
	const [mode, setMode] = React.useState<OnboardingMode>("CONCIERGE");
	const [assignedToUserId, setAssignedToUserId] = React.useState("UNASSIGNED");
	const [intakeStep, setIntakeStep] = React.useState("company");
	const [legalName, setLegalName] = React.useState("");
	const [tradeName, setTradeName] = React.useState("");
	const [taxId, setTaxId] = React.useState("");
	const [vatNumber, setVatNumber] = React.useState("");
	const [businessType, setBusinessType] = React.useState("restaurant");
	const [region, setRegion] = React.useState("");
	const [subCity, setSubCity] = React.useState("");
	const [woreda, setWoreda] = React.useState("");
	const [houseNumber, setHouseNumber] = React.useState("");
	const [contactName, setContactName] = React.useState("");
	const [contactPhone, setContactPhone] = React.useState("");
	const [contactEmail, setContactEmail] = React.useState("");
	const [managerPhone, setManagerPhone] = React.useState("");
	const [preferredChannel, setPreferredChannel] = React.useState("WhatsApp");
	const [plan, setPlan] = React.useState("pro");
	const [paymentMethod, setPaymentMethod] = React.useState("telebirr");
	const [paymentAmount, setPaymentAmount] = React.useState("");
	const [paymentReference, setPaymentReference] = React.useState("");
	const [receiptReference, setReceiptReference] = React.useState("");

	React.useEffect(() => {
		if (!organizationId && organizations[0]) setOrganizationId(organizations[0].id);
		if (!templateKey && templates[0]) setTemplateKey(templates[0].key);
	}, [organizationId, organizations, templateKey, templates]);

	const selectedTemplate = templates.find((template) => template.key === templateKey);
	const canSubmit = organizationId && templateKey && contactName.trim() && contactPhone.trim() && contactEmail.trim();
	const selectedOrg = organizations.find((org) => org.id === organizationId);
	const submit = React.useCallback(async () => {
		if (!canSubmit) return;
		const result = await createTask.mutateAsync({
			organizationId,
			templateKey,
			mode,
			contactName,
			contactPhone,
			contactEmail,
			assignedToUserId: assignedToUserId === "UNASSIGNED" ? undefined : assignedToUserId,
			metadata: {
				businessType,
				houseNumber,
				legalName: legalName || selectedOrg?.name,
				managerPhone,
				paymentAmount,
				paymentMethod,
				paymentReference,
				plan,
				preferredChannel,
				receiptReference,
				region,
				subCity,
				taxId,
				tradeName,
				vatNumber,
				woreda,
			},
		});
		navigate({ to: "/admin/onboarding/$taskId", params: { taskId: result.data.id } });
	}, [
		assignedToUserId,
		businessType,
		canSubmit,
		contactEmail,
		contactName,
		contactPhone,
		createTask,
		houseNumber,
		legalName,
		managerPhone,
		mode,
		navigate,
		organizationId,
		paymentAmount,
		paymentMethod,
		paymentReference,
		plan,
		preferredChannel,
		receiptReference,
		region,
		selectedOrg?.name,
		subCity,
		taxId,
		templateKey,
		tradeName,
		vatNumber,
		woreda,
	]);

	const wizardSteps = [
		{ key: "company", label: "Company" },
		{ key: "contact", label: "Contact" },
		{ key: "subscription", label: "Subscription" },
		{ key: "setup", label: "Setup" },
	] as const;

	return (
		<div className="space-y-6">
			<PageHeader
				eyebrow="Operations"
				title="New tenant onboarding"
				description="Create a tracked setup workflow for an existing organization and choose concierge, self-service, or hybrid handoff."
				actions={
					<Link to="/admin/onboarding">
						<Button variant="outline">Back</Button>
					</Link>
				}
			/>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Concierge intake</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4">
						<div className="grid gap-2 sm:grid-cols-4">
							{wizardSteps.map((step) => (
								<Button
									key={step.key}
									type="button"
									variant={intakeStep === step.key ? "default" : "outline"}
									onClick={() => setIntakeStep(step.key)}
								>
									{step.label}
								</Button>
							))}
						</div>

						{intakeStep === "company" && (
							<div className="grid gap-4">
								<div className="grid gap-2">
									<Label>Existing organization</Label>
									<Select value={organizationId} onValueChange={setOrganizationId}>
										<SelectTrigger>
											<SelectValue placeholder="Select organization" />
										</SelectTrigger>
										<SelectContent>
											{organizations.map((org) => (
												<SelectItem key={org.id} value={org.id}>
													{org.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="grid gap-3 md:grid-cols-2">
									<div className="grid gap-2">
										<Label>Legal name</Label>
										<Input value={legalName} onChange={(event) => setLegalName(event.target.value)} />
									</div>
									<div className="grid gap-2">
										<Label>Trade name</Label>
										<Input value={tradeName} onChange={(event) => setTradeName(event.target.value)} />
									</div>
									<div className="grid gap-2">
										<Label>TIN</Label>
										<Input value={taxId} onChange={(event) => setTaxId(event.target.value)} />
									</div>
									<div className="grid gap-2">
										<Label>VAT number</Label>
										<Input value={vatNumber} onChange={(event) => setVatNumber(event.target.value)} />
									</div>
								</div>
								<div className="grid gap-3 md:grid-cols-4">
									<div className="grid gap-2">
										<Label>Business type</Label>
										<Select value={businessType} onValueChange={setBusinessType}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="restaurant">Restaurant</SelectItem>
												<SelectItem value="hotel">Hotel</SelectItem>
												<SelectItem value="retail">Retail</SelectItem>
												<SelectItem value="generic">Generic SaaS</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="grid gap-2">
										<Label>Region</Label>
										<Input value={region} onChange={(event) => setRegion(event.target.value)} />
									</div>
									<div className="grid gap-2">
										<Label>Sub-city</Label>
										<Input value={subCity} onChange={(event) => setSubCity(event.target.value)} />
									</div>
									<div className="grid gap-2">
										<Label>Woreda</Label>
										<Input value={woreda} onChange={(event) => setWoreda(event.target.value)} />
									</div>
								</div>
								<div className="grid gap-2">
									<Label>House number</Label>
									<Input value={houseNumber} onChange={(event) => setHouseNumber(event.target.value)} />
								</div>
							</div>
						)}

						{intakeStep === "contact" && (
							<div className="grid gap-3 md:grid-cols-2">
								<div className="grid gap-2">
									<Label>Owner full name</Label>
									<Input value={contactName} onChange={(event) => setContactName(event.target.value)} />
								</div>
								<div className="grid gap-2">
									<Label>Owner phone</Label>
									<Input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
								</div>
								<div className="grid gap-2">
									<Label>Owner email</Label>
									<Input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
								</div>
								<div className="grid gap-2">
									<Label>Manager phone</Label>
									<Input value={managerPhone} onChange={(event) => setManagerPhone(event.target.value)} />
								</div>
								<div className="grid gap-2 md:col-span-2">
									<Label>Preferred contact channel</Label>
									<Select value={preferredChannel} onValueChange={setPreferredChannel}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="WhatsApp">WhatsApp</SelectItem>
											<SelectItem value="Phone call">Phone call</SelectItem>
											<SelectItem value="Email">Email</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						)}

						{intakeStep === "subscription" && (
							<div className="grid gap-3 md:grid-cols-2">
								<div className="grid gap-2">
									<Label>Plan</Label>
									<Select value={plan} onValueChange={setPlan}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="free">Free</SelectItem>
											<SelectItem value="pro">Pro</SelectItem>
											<SelectItem value="enterprise">Enterprise</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="grid gap-2">
									<Label>Payment method</Label>
									<Select value={paymentMethod} onValueChange={setPaymentMethod}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="cash">Cash</SelectItem>
											<SelectItem value="telebirr">Telebirr</SelectItem>
											<SelectItem value="bank">Bank transfer</SelectItem>
											<SelectItem value="trial">Trial</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="grid gap-2">
									<Label>Amount</Label>
									<Input value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
								</div>
								<div className="grid gap-2">
									<Label>Reference number</Label>
									<Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} />
								</div>
								<div className="grid gap-2 md:col-span-2">
									<Label>Receipt reference</Label>
									<Input value={receiptReference} onChange={(event) => setReceiptReference(event.target.value)} />
								</div>
							</div>
						)}

						{intakeStep === "setup" && (
							<div className="grid gap-4">
								<div className="grid gap-2">
									<Label>Mode</Label>
									<Select value={mode} onValueChange={(value) => setMode(value as OnboardingMode)}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="CONCIERGE">Concierge</SelectItem>
											<SelectItem value="SELF_SERVICE">Self service</SelectItem>
											<SelectItem value="HYBRID">Hybrid</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="grid gap-2">
									<Label>Task template</Label>
									<Select value={templateKey} onValueChange={setTemplateKey}>
										<SelectTrigger>
											<SelectValue placeholder="Select template" />
										</SelectTrigger>
										<SelectContent>
											{templates.map((template) => (
												<SelectItem key={template.key} value={template.key}>
													{template.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="grid gap-2">
									<Label>Assigned staff</Label>
									<Select value={assignedToUserId} onValueChange={setAssignedToUserId}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="UNASSIGNED">Unassigned</SelectItem>
											{staffUsers.map((user) => (
												<SelectItem key={user.id} value={user.id}>
													{user.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						)}

						<div className="flex justify-end">
							<Button onClick={submit} disabled={!canSubmit || createTask.isPending}>
								{createTask.isPending ? "Creating..." : "Create onboarding task"}
							</Button>
						</div>
					</CardContent>
				</Card>

				<div className="space-y-4">
					<ConciergeIntakeHandoffPanel mode={mode} template={selectedTemplate} assigned={assignedToUserId} />
					<TemplatePreview template={selectedTemplate} />
				</div>
			</div>
		</div>
	);
}
