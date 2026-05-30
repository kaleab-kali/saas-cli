import { Link, useNavigate } from "@tanstack/react-router";
import React from "react";
import { useAdminOrgList } from "#features/admin/api/admin.queries";
import {
	type OnboardingMode,
	type OnboardingStep,
	type OnboardingTask,
	type OnboardingTaskStatus,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const isTask = (value: TenantOnboarding | undefined): value is OnboardingTask => !!value && "id" in value;

const statusVariant = (status: string) => {
	if (status === "BLOCKED" || status === "FAILED" || status === "CANCELLED") return "destructive";
	if (status === "COMPLETED") return "default";
	return "secondary";
};

function ProgressBar({ completed, total, percent }: { completed: number; total: number; percent: number }) {
	return (
		<div className="min-w-32 space-y-1">
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
		<div className="space-y-2">
			{steps.map((step) => {
				const canComplete =
					onComplete &&
					step.status !== "COMPLETED" &&
					(!tenantOnly || step.assigneeType === "TENANT" || step.canBeSelfService);
				return (
					<div
						key={step.id ?? step.stepKey}
						className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center"
					>
						<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
							{step.stepOrder}
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<h3 className="font-medium">{step.title}</h3>
								<Badge variant={statusVariant(step.status)}>{step.status.replace("_", " ")}</Badge>
								<Badge variant="outline">{step.assigneeType}</Badge>
							</div>
							{step.description && <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>}
							{step.completedAt && (
								<p className="mt-1 text-xs text-muted-foreground">
									Completed {new Date(step.completedAt).toLocaleString()}
								</p>
							)}
						</div>
						{canComplete && (
							<Button size="sm" onClick={() => onComplete(step)} disabled={isCompleting}>
								Complete
							</Button>
						)}
					</div>
				);
			})}
		</div>
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

	if (isLoading) return <Skeleton className="h-96 w-full" />;

	if (!isTask(data)) {
		const steps = data?.defaultTemplate.steps ?? [];
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">Onboarding</h1>
					<p className="text-sm text-muted-foreground">Your workspace is ready for the baseline setup checklist.</p>
				</div>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{data?.defaultTemplate.name ?? "Generic SaaS setup"}</CardTitle>
					</CardHeader>
					<CardContent>
						<StepList
							steps={steps.map((step, index) => ({
								...step,
								id: step.stepKey,
								status: index === 0 ? "IN_PROGRESS" : "PENDING",
								startedAt: null,
								completedAt: null,
								completedByUserId: null,
								notes: null,
								blocked: false,
								blockedReason: null,
							}))}
							tenantOnly
						/>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Onboarding</h1>
					<p className="text-sm text-muted-foreground">Current setup workflow for this workspace.</p>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant={statusVariant(data.status)}>{data.status}</Badge>
					<Badge variant="outline">{data.mode.replace("_", " ")}</Badge>
				</div>
			</div>

			<Card>
				<CardContent className="py-4">
					<ProgressBar {...data.progress} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Steps</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<Input
						placeholder="Optional completion note"
						value={notes}
						onChange={(event) => setNotes(event.target.value)}
					/>
					<StepList steps={data.steps} onComplete={handleComplete} isCompleting={complete.isPending} tenantOnly />
				</CardContent>
			</Card>
		</div>
	);
}

export function AdminOnboardingListPage() {
	const [status, setStatus] = React.useState<OnboardingTaskStatus | "ALL">("ACTIVE");
	const [mode, setMode] = React.useState<OnboardingMode | "ALL">("ALL");
	const { data, isLoading } = useAdminOnboardingTasks({
		status: status === "ALL" ? undefined : status,
		mode: mode === "ALL" ? undefined : mode,
	});
	const tasks = data?.data ?? [];
	const summary = data?.summary;

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Onboarding</h1>
					<p className="text-sm text-muted-foreground">Staff-assisted tenant setup workflows and handoffs.</p>
				</div>
				<Link to="/admin/onboarding/new">
					<Button>New tenant</Button>
				</Link>
			</div>

			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				{[
					["Active", summary?.active ?? 0],
					["Blocked", summary?.blocked ?? 0],
					["Stale", summary?.stale ?? 0],
					["Completed this month", summary?.completedThisMonth ?? 0],
				].map(([label, value]) => (
					<Card key={label}>
						<CardHeader className="pb-2">
							<CardTitle className="text-xs uppercase text-muted-foreground">{label}</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-semibold font-mono">{value}</div>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="flex flex-col gap-3 md:flex-row">
				<Select value={status} onValueChange={(value) => setStatus(value as OnboardingTaskStatus | "ALL")}>
					<SelectTrigger className="w-full md:w-48">
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
					<SelectTrigger className="w-full md:w-48">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">All modes</SelectItem>
						<SelectItem value="CONCIERGE">Concierge</SelectItem>
						<SelectItem value="SELF_SERVICE">Self service</SelectItem>
						<SelectItem value="HYBRID">Hybrid</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<Card>
				<CardContent className="p-0">
					{isLoading ? (
						<div className="p-4">
							<Skeleton className="h-64 w-full" />
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Tenant</TableHead>
									<TableHead>Mode</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Progress</TableHead>
									<TableHead>Assigned</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{tasks.map((task) => (
									<TableRow key={task.id}>
										<TableCell>
											<div className="font-medium">{task.organization?.name ?? task.organizationId}</div>
											<div className="text-xs text-muted-foreground">{task.contactEmail}</div>
										</TableCell>
										<TableCell>
											<Badge variant="outline">{task.mode.replace("_", " ")}</Badge>
										</TableCell>
										<TableCell>
											<Badge variant={statusVariant(task.status)}>{task.status}</Badge>
										</TableCell>
										<TableCell>
											<ProgressBar {...task.progress} />
										</TableCell>
										<TableCell>{task.assignedTo?.name ?? "Unassigned"}</TableCell>
										<TableCell className="text-right">
											<Link to="/admin/onboarding/$taskId" params={{ taskId: task.id }}>
												<Button variant="outline" size="sm">
													View
												</Button>
											</Link>
										</TableCell>
									</TableRow>
								))}
								{tasks.length === 0 && (
									<TableRow>
										<TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
											No onboarding tasks found.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					)}
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

	if (isLoading) return <Skeleton className="h-96 w-full" />;
	if (!task) return <p className="text-muted-foreground">Onboarding task not found.</p>;

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div>
					<Link to="/admin/onboarding" className="text-sm text-muted-foreground hover:underline">
						Back to onboarding
					</Link>
					<h1 className="mt-2 text-2xl font-semibold">{task.organization?.name ?? "Tenant onboarding"}</h1>
					<p className="text-sm text-muted-foreground">
						{task.contactName} - {task.contactPhone} - {task.contactEmail}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button variant="outline" onClick={handleBlock} disabled={block.isPending}>
						Block
					</Button>
					<Button variant="destructive" onClick={handleCancel} disabled={cancel.isPending}>
						Cancel
					</Button>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-[1fr_320px]">
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
						<StepList steps={task.steps} onComplete={handleComplete} isCompleting={complete.isPending} />
					</CardContent>
				</Card>

				<div className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Task status</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 text-sm">
							<div className="flex justify-between gap-3">
								<span className="text-muted-foreground">Status</span>
								<Badge variant={statusVariant(task.status)}>{task.status}</Badge>
							</div>
							<div className="flex justify-between gap-3">
								<span className="text-muted-foreground">Mode</span>
								<span>{task.mode.replace("_", " ")}</span>
							</div>
							<div className="flex justify-between gap-3">
								<span className="text-muted-foreground">Assigned</span>
								<span>{task.assignedTo?.name ?? "Unassigned"}</span>
							</div>
							<ProgressBar {...task.progress} />
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
		<div className="max-w-3xl space-y-6">
			<div>
				<Link to="/admin/onboarding" className="text-sm text-muted-foreground hover:underline">
					Back to onboarding
				</Link>
				<h1 className="mt-2 text-2xl font-semibold">New tenant onboarding</h1>
				<p className="text-sm text-muted-foreground">Create a workflow for an existing organization.</p>
			</div>

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
					<div className="grid gap-2 md:grid-cols-3">
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
		</div>
	);
}
