import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import React from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export interface CommandItem {
	readonly id: string;
	readonly label: string;
	readonly description: string;
	readonly path: string;
	readonly keywords: readonly string[];
}

export const WORKSPACE_COMMANDS: readonly CommandItem[] = [
	{
		id: "tenant-onboarding",
		label: "Tenant onboarding",
		description: "Open the active setup workflow",
		path: "/onboarding",
		keywords: ["tenant", "setup", "wizard", "concierge"],
	},
	{
		id: "main-dashboard",
		label: "Main dashboard",
		description: "Review workspace metrics",
		path: "/reports/dashboard/main",
		keywords: ["reports", "dashboard", "metrics"],
	},
	{
		id: "files",
		label: "Files",
		description: "Upload and manage workspace files",
		path: "/files",
		keywords: ["assets", "documents", "uploads"],
	},
	{
		id: "notifications",
		label: "Notifications",
		description: "Review notification inbox and preferences",
		path: "/notifications",
		keywords: ["email", "inbox", "messages"],
	},
	{
		id: "organization-settings",
		label: "Organization settings",
		description: "Manage regional, billing, and brand settings",
		path: "/settings/organization",
		keywords: ["settings", "brand", "locale", "currency"],
	},
] as const;

export const ADMIN_COMMANDS: readonly CommandItem[] = [
	{
		id: "admin-overview",
		label: "Admin overview",
		description: "Open platform health, growth, and operations metrics",
		path: "/admin",
		keywords: ["platform", "dashboard", "overview", "metrics"],
	},
	{
		id: "admin-onboarding",
		label: "Concierge onboarding",
		description: "Review tenant launch queues and stuck setup work",
		path: "/admin/onboarding",
		keywords: ["tenant", "launch", "setup", "concierge", "queue"],
	},
	{
		id: "admin-onboarding-new",
		label: "New tenant onboarding",
		description: "Create a staff-owned onboarding workflow",
		path: "/admin/onboarding/new",
		keywords: ["tenant", "intake", "workflow", "create"],
	},
	{
		id: "admin-organizations",
		label: "Organizations",
		description: "Search tenants, owners, and organization state",
		path: "/admin/organizations",
		keywords: ["tenant", "customer", "owner", "directory"],
	},
	{
		id: "admin-billing-dashboard",
		label: "Billing dashboard",
		description: "Inspect revenue, past-due invoices, and manual payment review",
		path: "/admin/billing/dashboard",
		keywords: ["billing", "revenue", "past due", "payments"],
	},
	{
		id: "admin-jobs",
		label: "Jobs",
		description: "Monitor queues, failed jobs, and retry operations",
		path: "/admin/jobs",
		keywords: ["queue", "background", "retry", "cron"],
	},
	{
		id: "admin-audit-logs",
		label: "Audit logs",
		description: "Review platform evidence and export audit records",
		path: "/admin/audit-logs",
		keywords: ["audit", "evidence", "security", "compliance"],
	},
	{
		id: "admin-feature-flags",
		label: "Feature flags",
		description: "Manage global rollout and tenant-specific overrides",
		path: "/admin/feature-flags",
		keywords: ["rollout", "entitlements", "features", "overrides"],
	},
] as const;

const matchesCommand = (command: CommandItem, query: string) => {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	const haystack = [command.label, command.description, command.path, ...command.keywords].join(" ").toLowerCase();
	return haystack.includes(q);
};

export function CommandPalette({
	commands = WORKSPACE_COMMANDS,
	buttonLabel = "Command",
	description = "Search routes, settings, and workspace actions.",
}: {
	readonly commands?: readonly CommandItem[];
	readonly buttonLabel?: string;
	readonly description?: string;
}) {
	const navigate = useNavigate();
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState("");
	const filteredCommands = React.useMemo(
		() => commands.filter((command) => matchesCommand(command, query)),
		[commands, query],
	);

	React.useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setOpen((value) => !value);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const runCommand = React.useCallback(
		(path: string) => {
			setOpen(false);
			setQuery("");
			navigate({ to: path });
		},
		[navigate],
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="inline-flex size-9 justify-center gap-0 md:size-auto md:min-w-48 md:justify-between md:gap-3"
				>
					<span className="flex items-center gap-2 text-muted-foreground">
						<HugeiconsIcon icon={Search01Icon} size={16} />
						<span className="hidden md:inline">{buttonLabel}</span>
						<span className="sr-only md:hidden">{buttonLabel}</span>
					</span>
					<kbd className="hidden rounded border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">
						Ctrl K
					</kbd>
				</Button>
			</DialogTrigger>
			<DialogContent className="gap-4 sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Command palette</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<Input autoFocus placeholder="Search..." value={query} onChange={(event) => setQuery(event.target.value)} />
				<div className="max-h-80 overflow-y-auto rounded-md border">
					{filteredCommands.map((command) => (
						<button
							key={command.id}
							type="button"
							className="block w-full border-b px-4 py-3 text-left last:border-0 hover:bg-muted"
							onClick={() => runCommand(command.path)}
						>
							<span className="block text-sm font-medium">{command.label}</span>
							<span className="block text-xs text-muted-foreground">{command.description}</span>
						</button>
					))}
					{filteredCommands.length === 0 && (
						<p className="px-4 py-8 text-center text-sm text-muted-foreground">No commands found.</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
