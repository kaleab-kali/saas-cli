import { Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { useAdminOrgList } from "#features/admin/api/admin.queries";
import {
	type OnboardingMode,
	type OnboardingStep,
	type OnboardingTask,
	type OnboardingTaskStatus,
	type OnboardingTemplate,
	type TenantOnboarding,
	useAdminOnboardingTask,
	useAdminOnboardingTasks,
	useBlockOnboardingTask,
	useCancelOnboardingTask,
	useCompleteAdminOnboardingStep,
	useCompleteTenantOnboardingStep,
	useCreateOnboardingTask,
	useOnboardingTemplates,
	useTenantOnboarding,
} from "#features/onboarding/api/onboarding.hooks";
import { DataTable } from "#shared/components/DataTable";
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

const currentStep = (task: OnboardingTask) =>
	task.steps.find((step) => step.stepKey === task.currentStepKey) ??
	task.steps.find((step) => step.status === "IN_PROGRESS") ??
	task.steps.find((step) => step.status !== "COMPLETED") ??
	null;

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
					title="Onboarding"
					description="Follow the baseline setup checklist or ask staff to run the same workflow in concierge mode."
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
				title="Onboarding"
				description="Your active tenant setup workflow, shared with support staff when concierge or hybrid mode is enabled."
				actions={
					<>
						<Badge variant={statusVariant(data.status)}>{data.status}</Badge>
						<Badge variant="outline">{modeLabel(data.mode)}</Badge>
					</>
				}
			/>

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
	const [status, setStatus] = React.useState<OnboardingTaskStatus | "ALL">("ACTIVE");
	const [mode, setMode] = React.useState<OnboardingMode | "ALL">("ALL");
	const { data, isLoading, error, refetch } = useAdminOnboardingTasks({
		status: status === "ALL" ? undefined : status,
		mode: mode === "ALL" ? undefined : mode,
	});
	const tasks = data?.data ?? [];
	const summary = data?.summary;

	const columns = React.useMemo<ColumnDef<OnboardingTask, unknown>[]>(
		() => [
			{
				id: "tenant",
				accessorFn: (task) =>
					`${task.organization?.name ?? task.organizationId} ${task.contactName} ${task.contactEmail} ${task.contactPhone}`,
				header: "Tenant",
				cell: ({ row }) => (
					<div>
						<div className="font-medium">{row.original.organization?.name ?? row.original.organizationId}</div>
						<div className="text-xs text-muted-foreground">
							{row.original.contactName} - {row.original.contactPhone}
						</div>
						<div className="text-xs text-muted-foreground">{row.original.contactEmail}</div>
					</div>
				),
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

			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				<MetricCard label="Active" value={summary?.active ?? 0} />
				<MetricCard label="Blocked" value={summary?.blocked ?? 0} />
				<MetricCard label="Stale" value={summary?.stale ?? 0} helper="Needs staff follow-up" />
				<MetricCard label="Done this month" value={summary?.completedThisMonth ?? 0} />
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
						toolbarActions={toolbarActions}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function AdminOnboardingDetailPage({ taskId }: { readonly taskId: string }) {
	const { data: task, isLoading } = useAdminOnboardingTask(taskId);
	const complete = useCompleteAdminOnboardingStep(taskId);
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

	return (
		<div className="space-y-6">
			<PageHeader
				eyebrow="Concierge workflow"
				title={task.organization?.name ?? "Tenant onboarding"}
				description={`${task.contactName} - ${task.contactPhone} - ${task.contactEmail}`}
				actions={
					<>
						<Link to="/admin/onboarding">
							<Button variant="outline">Back</Button>
						</Link>
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
				<MetricCard label="Assigned" value={task.assignedTo?.name ?? "Unassigned"} />
			</div>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Current action</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<ProgressBar {...task.progress} />
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
								<EmptyState title="No active step" description="All steps have been completed or cancelled." />
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
							<CategoryBreakdown steps={task.steps} />
							<StepList steps={task.steps} onComplete={handleComplete} isCompleting={complete.isPending} />
						</CardContent>
					</Card>
				</div>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Tenant contact</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							<div>
								<div className="text-muted-foreground">Name</div>
								<div className="font-medium">{task.contactName}</div>
							</div>
							<div>
								<div className="text-muted-foreground">Phone</div>
								<div className="font-medium">{task.contactPhone}</div>
							</div>
							<div>
								<div className="text-muted-foreground">Email</div>
								<div className="font-medium">{task.contactEmail}</div>
							</div>
							{task.blockedReason && (
								<p className="rounded-md bg-destructive/10 p-3 text-destructive">{task.blockedReason}</p>
							)}
						</CardContent>
					</Card>

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
	const { data: templates = [] } = useOnboardingTemplates();
	const createTask = useCreateOnboardingTask();
	const [organizationId, setOrganizationId] = React.useState("");
	const [templateKey, setTemplateKey] = React.useState("");
	const [mode, setMode] = React.useState<OnboardingMode>("CONCIERGE");
	const [contactName, setContactName] = React.useState("");
	const [contactPhone, setContactPhone] = React.useState("");
	const [contactEmail, setContactEmail] = React.useState("");

	React.useEffect(() => {
		if (!organizationId && orgs?.data[0]) setOrganizationId(orgs.data[0].id);
		if (!templateKey && templates[0]) setTemplateKey(templates[0].key);
	}, [organizationId, orgs, templateKey, templates]);

	const selectedTemplate = templates.find((template) => template.key === templateKey);
	const canSubmit = organizationId && templateKey && contactName.trim() && contactPhone.trim() && contactEmail.trim();
	const submit = React.useCallback(async () => {
		if (!canSubmit) return;
		const result = await createTask.mutateAsync({
			organizationId,
			templateKey,
			mode,
			contactName,
			contactPhone,
			contactEmail,
		});
		navigate({ to: "/admin/onboarding/$taskId", params: { taskId: result.data.id } });
	}, [canSubmit, contactEmail, contactName, contactPhone, createTask, mode, navigate, organizationId, templateKey]);

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
						<CardTitle className="text-base">Task details</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4">
						<div className="grid gap-2">
							<Label>Organization</Label>
							<Select value={organizationId} onValueChange={setOrganizationId}>
								<SelectTrigger>
									<SelectValue placeholder="Select organization" />
								</SelectTrigger>
								<SelectContent>
									{orgs?.data.map((org) => (
										<SelectItem key={org.id} value={org.id}>
											{org.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label>Template</Label>
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
						<div className="grid gap-3 md:grid-cols-3">
							<div className="grid gap-2">
								<Label>Contact name</Label>
								<Input value={contactName} onChange={(event) => setContactName(event.target.value)} />
							</div>
							<div className="grid gap-2">
								<Label>Contact phone</Label>
								<Input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} />
							</div>
							<div className="grid gap-2">
								<Label>Contact email</Label>
								<Input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
							</div>
						</div>
						<div className="flex justify-end">
							<Button onClick={submit} disabled={!canSubmit || createTask.isPending}>
								{createTask.isPending ? "Creating..." : "Create onboarding task"}
							</Button>
						</div>
					</CardContent>
				</Card>

				<TemplatePreview template={selectedTemplate} />
			</div>
		</div>
	);
}
