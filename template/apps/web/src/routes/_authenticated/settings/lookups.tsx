import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	type LookupItem,
	useCreateLookup,
	useDeleteLookup,
	useLookups,
	useUpdateLookup,
} from "#shared/api/lookup.hooks";
import { DataTable } from "#shared/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings/lookups")({
	component: LookupsPage,
});

const STORAGE_KEY = "vyllion.lookups.kinds";

type LookupPageState = {
	kinds: string[];
	kind: string;
	includeArchived: boolean;
	newKindInput: string;
	error: string;
};

type LookupPageAction =
	| { type: "setKind"; kind: string }
	| { type: "setIncludeArchived"; includeArchived: boolean }
	| { type: "setNewKindInput"; value: string }
	| { type: "addKind"; kind: string }
	| { type: "removeKind"; kind: string }
	| { type: "setError"; error: string };

const loadKinds = (): string[] => {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as string[]) : [];
	} catch {
		return [];
	}
};

const saveKinds = (kinds: string[]) => {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(kinds));
};

const createInitialLookupState = (): LookupPageState => {
	const kinds = loadKinds();
	return {
		kinds,
		kind: kinds[0] ?? "",
		includeArchived: false,
		newKindInput: "",
		error: "",
	};
};

const lookupPageReducer = (state: LookupPageState, action: LookupPageAction): LookupPageState => {
	switch (action.type) {
		case "setKind":
			return { ...state, kind: action.kind };
		case "setIncludeArchived":
			return { ...state, includeArchived: action.includeArchived };
		case "setNewKindInput":
			return { ...state, newKindInput: action.value };
		case "addKind": {
			const kinds = Array.from(new Set([...state.kinds, action.kind]));
			return { ...state, kinds, kind: action.kind, newKindInput: "" };
		}
		case "removeKind": {
			const kinds = state.kinds.filter((k) => k !== action.kind);
			return { ...state, kinds, kind: state.kind === action.kind ? (kinds[0] ?? "") : state.kind };
		}
		case "setError":
			return { ...state, error: action.error };
	}
};

function LookupsPage() {
	const { t } = useTranslation();
	const [state, dispatch] = React.useReducer(lookupPageReducer, null, createInitialLookupState);
	const { kinds, kind, includeArchived, newKindInput, error } = state;

	const { data: items = [], isLoading } = useLookups(kind, includeArchived);
	const createLookup = useCreateLookup(kind);
	const updateLookup = useUpdateLookup(kind);
	const deleteLookup = useDeleteLookup(kind);

	const addKind = React.useCallback(() => {
		const trimmed = newKindInput
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_]/g, "_");
		if (!trimmed) return;
		const next = Array.from(new Set([...kinds, trimmed]));
		saveKinds(next);
		dispatch({ type: "addKind", kind: trimmed });
	}, [newKindInput, kinds]);

	const removeKind = React.useCallback(
		(k: string) => {
			const next = kinds.filter((x) => x !== k);
			saveKinds(next);
			dispatch({ type: "removeKind", kind: k });
		},
		[kinds],
	);

	const handleCreate = React.useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			dispatch({ type: "setError", error: "" });
			const form = e.currentTarget;
			const fd = new FormData(form);
			const label = (fd.get("label") as string)?.trim();
			const value = (fd.get("value") as string)?.trim() || undefined;
			const description = (fd.get("description") as string)?.trim() || undefined;
			const color = (fd.get("color") as string)?.trim() || undefined;
			const sortOrder = fd.get("sortOrder") ? Number(fd.get("sortOrder")) : undefined;
			if (!label) {
				dispatch({
					type: "setError",
					error: t("settings.lookups.labelRequired", { defaultValue: "Label required" }),
				});
				return;
			}
			try {
				await createLookup.mutateAsync({ label, value, description, color, sortOrder });
				form.reset();
			} catch (err) {
				dispatch({ type: "setError", error: (err as Error).message });
			}
		},
		[createLookup, t],
	);

	const handleArchiveToggle = React.useCallback(
		(item: LookupItem) => {
			updateLookup.mutate({ id: item.id, archived: !item.archived });
		},
		[updateLookup],
	);

	const handleDelete = React.useCallback(
		(id: string) => {
			if (!window.confirm(t("settings.lookups.deleteConfirm", { defaultValue: "Delete this value?" }))) return;
			deleteLookup.mutate(id, {
				onError: (err) => window.alert(err.message),
			});
		},
		[deleteLookup, t],
	);

	const columns = useLookupColumns(updateLookup.isPending, handleArchiveToggle, handleDelete);

	return (
		<div className="space-y-6">
			<LookupPageHeader />

			<div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
				<LookupCatalogCard
					kinds={kinds}
					kind={kind}
					newKindInput={newKindInput}
					onAddKind={addKind}
					onKindInputChange={(value) => dispatch({ type: "setNewKindInput", value })}
					onKindSelect={(selectedKind) => dispatch({ type: "setKind", kind: selectedKind })}
					onRemoveKind={removeKind}
				/>

				<div className="space-y-4">
					{!kind ? (
						<EmptyLookupPanel />
					) : (
						<LookupWorkspace
							columns={columns}
							createPending={createLookup.isPending}
							error={error}
							includeArchived={includeArchived}
							isLoading={isLoading}
							items={items}
							kind={kind}
							onCreate={handleCreate}
							onIncludeArchivedChange={(checked) => dispatch({ type: "setIncludeArchived", includeArchived: checked })}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

function useLookupColumns(
	updatePending: boolean,
	handleArchiveToggle: (item: LookupItem) => void,
	handleDelete: (id: string) => void,
) {
	const { t } = useTranslation();

	return React.useMemo<ColumnDef<LookupItem>[]>(
		() => [
			{
				accessorKey: "label",
				header: t("settings.lookups.labelHeader", { defaultValue: "Label" }),
				cell: ({ row }) => (
					<div className="flex items-center gap-2">
						{row.original.color && (
							<span
								className="inline-block size-3 rounded-full border"
								style={{ backgroundColor: row.original.color }}
							/>
						)}
						<span className="font-medium">{row.original.label}</span>
						{row.original.archived && (
							<Badge variant="secondary" className="text-xs">
								archived
							</Badge>
						)}
					</div>
				),
			},
			{
				accessorKey: "value",
				header: t("settings.lookups.valueHeader", { defaultValue: "Value" }),
				cell: ({ row }) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.original.value}</code>,
			},
			{
				accessorKey: "description",
				header: t("settings.lookups.descriptionHeader", { defaultValue: "Description" }),
				cell: ({ row }) => row.original.description || "-",
			},
			{
				accessorKey: "sortOrder",
				header: () => <div className="text-right">Order</div>,
				cell: ({ row }) => <div className="text-right">{row.original.sortOrder}</div>,
			},
			{
				id: "actions",
				header: () => <div className="text-right">Actions</div>,
				enableSorting: false,
				cell: ({ row }) => (
					<div className="text-right flex justify-end gap-1">
						<Button
							variant="ghost"
							size="sm"
							aria-label={`${row.original.archived ? "Unarchive" : "Archive"} ${row.original.label}`}
							onClick={() => handleArchiveToggle(row.original)}
							disabled={updatePending}
						>
							{row.original.archived ? "Unarchive" : "Archive"}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="text-destructive"
							aria-label={`${t("common.delete", { defaultValue: "Delete" })} ${row.original.label}`}
							onClick={() => handleDelete(row.original.id)}
						>
							{t("common.delete", { defaultValue: "Delete" })}
						</Button>
					</div>
				),
			},
		],
		[handleArchiveToggle, handleDelete, updatePending, t],
	);
}

function LookupPageHeader() {
	const { t } = useTranslation();

	return (
		<div>
			<Link to="/settings" className="text-sm text-muted-foreground hover:underline">
				&larr; {t("settings.lookups.back", { defaultValue: "Back to Settings" })}
			</Link>
			<h1 className="text-2xl font-semibold mt-2">
				{t("settings.lookups.title", { defaultValue: "Lookup Catalogs" })}
			</h1>
			<p className="text-muted-foreground mt-1">
				{t("settings.lookups.subtitle", {
					defaultValue:
						"Per-organization enum catalogs. Create a kind (e.g. 'project_status'), then add values your domain modules can reference.",
				})}
			</p>
		</div>
	);
}

type LookupCatalogCardProps = {
	kinds: string[];
	kind: string;
	newKindInput: string;
	onAddKind: () => void;
	onKindInputChange: (value: string) => void;
	onKindSelect: (kind: string) => void;
	onRemoveKind: (kind: string) => void;
};

function LookupCatalogCard({
	kinds,
	kind,
	newKindInput,
	onAddKind,
	onKindInputChange,
	onKindSelect,
	onRemoveKind,
}: LookupCatalogCardProps) {
	const { t } = useTranslation();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("settings.lookups.catalogs", { defaultValue: "Catalogs" })}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3 p-4">
				{kinds.length === 0 && (
					<p className="text-xs text-muted-foreground">
						{t("settings.lookups.noKinds", {
							defaultValue: "No catalogs yet. Add one below.",
						})}
					</p>
				)}
				<ul className="space-y-1">
					{kinds.map((k) => (
						<li key={k} className="flex items-center gap-1">
							<button
								type="button"
								aria-label={`Select catalog ${k}`}
								onClick={() => onKindSelect(k)}
								className={`flex-1 text-left px-2 py-1.5 rounded text-sm ${
									kind === k ? "bg-accent font-medium" : "hover:bg-accent/50"
								}`}
							>
								{k}
							</button>
							<Button
								variant="ghost"
								size="sm"
								aria-label={`Remove catalog ${k}`}
								onClick={() => onRemoveKind(k)}
								className="text-destructive"
							>
								&times;
							</Button>
						</li>
					))}
				</ul>
				<div className="flex gap-1 pt-2 border-t">
					<Label htmlFor="lookup-kind-input" className="sr-only">
						Catalog kind
					</Label>
					<Input
						id="lookup-kind-input"
						placeholder="new_kind_name"
						value={newKindInput}
						onChange={(e) => onKindInputChange(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") onAddKind();
						}}
						className="text-xs"
					/>
					<Button size="sm" onClick={onAddKind} disabled={!newKindInput.trim()}>
						Add
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function EmptyLookupPanel() {
	const { t } = useTranslation();

	return (
		<Card>
			<CardContent className="py-12 text-center text-muted-foreground">
				{t("settings.lookups.pickOrAdd", {
					defaultValue: "Add a catalog kind on the left to manage values.",
				})}
			</CardContent>
		</Card>
	);
}

type LookupWorkspaceProps = {
	columns: ColumnDef<LookupItem>[];
	createPending: boolean;
	error: string;
	includeArchived: boolean;
	isLoading: boolean;
	items: LookupItem[];
	kind: string;
	onCreate: React.FormEventHandler<HTMLFormElement>;
	onIncludeArchivedChange: (checked: boolean) => void;
};

function LookupWorkspace({
	columns,
	createPending,
	error,
	includeArchived,
	isLoading,
	items,
	kind,
	onCreate,
	onIncludeArchivedChange,
}: LookupWorkspaceProps) {
	return (
		<>
			<div className="rounded-md border bg-muted/30 p-3">
				<div className="font-mono font-medium">{kind}</div>
			</div>
			<LookupValueForm createPending={createPending} error={error} onCreate={onCreate} />
			<LookupValuesTable
				columns={columns}
				includeArchived={includeArchived}
				isLoading={isLoading}
				items={items}
				onIncludeArchivedChange={onIncludeArchivedChange}
			/>
		</>
	);
}

type LookupValueFormProps = {
	createPending: boolean;
	error: string;
	onCreate: React.FormEventHandler<HTMLFormElement>;
};

function LookupValueForm({ createPending, error, onCreate }: LookupValueFormProps) {
	const { t } = useTranslation();

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{t("settings.lookups.addValue", { defaultValue: "Add value" })}</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={onCreate} className="space-y-3">
					{error && <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
						<div className="space-y-1">
							<Label htmlFor="lk-label">Label *</Label>
							<Input id="lk-label" name="label" required />
						</div>
						<div className="space-y-1">
							<Label htmlFor="lk-value">Value (optional)</Label>
							<Input id="lk-value" name="value" placeholder="auto-from-label" />
						</div>
						<div className="space-y-1">
							<Label htmlFor="lk-sort">Sort order</Label>
							<Input id="lk-sort" name="sortOrder" type="number" defaultValue="100" />
						</div>
						<div className="space-y-1">
							<Label htmlFor="lk-color">Color</Label>
							<Input id="lk-color" name="color" type="color" className="h-10 p-1" />
						</div>
					</div>
					<div className="space-y-1">
						<Label htmlFor="lk-desc">Description (optional)</Label>
						<Input id="lk-desc" name="description" />
					</div>
					<Button type="submit" size="sm" disabled={createPending}>
						{createPending ? "Adding..." : "Add value"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

type LookupValuesTableProps = {
	columns: ColumnDef<LookupItem>[];
	includeArchived: boolean;
	isLoading: boolean;
	items: LookupItem[];
	onIncludeArchivedChange: (checked: boolean) => void;
};

function LookupValuesTable({
	columns,
	includeArchived,
	isLoading,
	items,
	onIncludeArchivedChange,
}: LookupValuesTableProps) {
	const { t } = useTranslation();

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">{t("settings.lookups.values", { defaultValue: "Values" })}</h2>
				<label className="flex items-center gap-2 text-sm cursor-pointer">
					<input
						type="checkbox"
						className="size-4"
						checked={includeArchived}
						onChange={(e) => onIncludeArchivedChange(e.target.checked)}
					/>
					Show archived
				</label>
			</div>

			<DataTable
				columns={columns}
				data={items}
				isLoading={isLoading}
				searchPlaceholder="Search values..."
				emptyMessage="No values yet"
				pageSize={50}
			/>
		</div>
	);
}
