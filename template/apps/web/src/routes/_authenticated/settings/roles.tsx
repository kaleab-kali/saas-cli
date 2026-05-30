import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	type CustomRole,
	useCreateRole,
	useCustomRoles,
	useDeleteRole,
	useRoleMatrix,
	useSystemRoles,
} from "#features/roles/api/roles.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/settings/roles")({ component: Page });

const SYSTEM_ROLE_AM: Record<string, string> = {
	owner: "ባለቤት",
	admin: "አስተዳዳሪ",
	member: "አባል",
	viewer: "ተመልካች",
};

const slugify = (v: string) =>
	v
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.slice(0, 40);

interface MatrixCellProps {
	readonly resource: string;
	readonly action: string;
	readonly checked: boolean;
	readonly onChange: (v: boolean) => void;
}

const MatrixCell = React.memo(
	({ resource: _resource, action, checked, onChange }: MatrixCellProps) => (
		<label className="flex items-center gap-2 text-sm">
			<input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
			<span className="font-mono text-xs">{action}</span>
		</label>
	),
	(a, b) => a.resource === b.resource && a.action === b.action && a.checked === b.checked,
);
MatrixCell.displayName = "MatrixCell";

const CreateRoleDialog = React.memo(() => {
	const { t } = useTranslation();
	const [open, setOpen] = React.useState(false);
	const [step, setStep] = React.useState<1 | 2 | 3>(1);
	const [copyFrom, setCopyFrom] = React.useState<string>("");
	const [nameEn, setNameEn] = React.useState("");
	const [nameAm, setNameAm] = React.useState("");
	const [slug, setSlug] = React.useState("");
	const [description, setDescription] = React.useState("");
	const [permissions, setPermissions] = React.useState<Record<string, string[]>>({});
	const { data: matrix = {} } = useRoleMatrix();
	const { data: systemRoles = [] } = useSystemRoles();
	const create = useCreateRole();

	React.useEffect(() => {
		if (nameEn && !slug) setSlug(slugify(nameEn));
	}, [nameEn, slug]);

	const loadFromSystem = React.useCallback(
		(roleSlug: string) => {
			if (!roleSlug) {
				setPermissions({});
				return;
			}
			const role = systemRoles.find((r) => r.slug === roleSlug);
			if (role?.statements) {
				const next: Record<string, string[]> = {};
				for (const [res, actions] of Object.entries(role.statements)) next[res] = [...actions];
				setPermissions(next);
			}
		},
		[systemRoles],
	);

	const toggle = React.useCallback((resource: string, action: string, on: boolean) => {
		setPermissions((curr) => {
			const next = { ...curr };
			const cur = next[resource] ?? [];
			next[resource] = on ? [...cur, action] : cur.filter((a) => a !== action);
			if (next[resource].length === 0) delete next[resource];
			return next;
		});
	}, []);

	const permCount = Object.values(permissions).reduce((s, a) => s + a.length, 0);

	const reset = React.useCallback(() => {
		setStep(1);
		setCopyFrom("");
		setNameEn("");
		setNameAm("");
		setSlug("");
		setDescription("");
		setPermissions({});
	}, []);

	const submit = React.useCallback(async () => {
		if (!slug || !nameEn || permCount === 0) {
			toast.error(t("settings.roles.validationError"));
			return;
		}
		try {
			await create.mutateAsync({
				slug,
				nameEn,
				nameAm: nameAm || undefined,
				description: description || undefined,
				inheritsFromSlug: copyFrom || undefined,
				permissionsJson: permissions,
			});
			setOpen(false);
			reset();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : t("settings.billingExt.failed"));
		}
	}, [slug, nameEn, nameAm, description, copyFrom, permissions, permCount, create, reset, t]);

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				setOpen(v);
				if (!v) reset();
			}}
		>
			<DialogTrigger asChild>
				<Button>{t("settings.roles.newCustomRole")}</Button>
			</DialogTrigger>
			<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t("settings.roles.createTitle", { step })}</DialogTitle>
				</DialogHeader>

				{step === 1 && (
					<div className="space-y-3">
						<div>
							<Label>{t("settings.roles.copyFrom")}</Label>
							<Select
								value={copyFrom}
								onValueChange={(v) => {
									setCopyFrom(v);
									loadFromSystem(v);
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder={t("settings.roles.blankNoInheritance")} />
								</SelectTrigger>
								<SelectContent>
									{systemRoles.map((r) => (
										<SelectItem key={r.slug} value={r.slug}>
											{t(`settings.roles.systemRoleNames.${r.slug}`, { defaultValue: r.slug })}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground mt-1">{t("settings.roles.copyFromDesc")}</p>
						</div>
						<div>
							<Label htmlFor="custom-role-name-en">{t("settings.roles.nameEn")}</Label>
							<Input
								id="custom-role-name-en"
								value={nameEn}
								onChange={(e) => setNameEn(e.target.value)}
								placeholder={t("settings.roles.step1NamePlaceholder")}
							/>
						</div>
						<div>
							<Label htmlFor="custom-role-name-am">{t("settings.roles.nameAm")}</Label>
							<Input
								id="custom-role-name-am"
								value={nameAm}
								onChange={(e) => setNameAm(e.target.value)}
								placeholder={t("settings.roles.step1NameAmPlaceholder")}
							/>
						</div>
						<div>
							<Label htmlFor="custom-role-slug">{t("settings.roles.slugInput")}</Label>
							<Input
								id="custom-role-slug"
								value={slug}
								onChange={(e) => setSlug(slugify(e.target.value))}
								placeholder={t("settings.roles.step1SlugPlaceholder")}
							/>
						</div>
						<div>
							<Label htmlFor="custom-role-description">{t("common.description")}</Label>
							<Input
								id="custom-role-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>
					</div>
				)}

				{step === 2 && (
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">{t("settings.roles.step2Desc", { count: permCount })}</p>
						<div className="border rounded max-h-[400px] overflow-y-auto">
							{Object.entries(matrix).map(([resource, actions]) => (
								<div key={resource} className="border-b p-3">
									<div className="font-semibold text-sm mb-2">{resource}</div>
									<div className="grid grid-cols-3 gap-2">
										{actions.map((action) => (
											<MatrixCell
												key={action}
												resource={resource}
												action={action}
												checked={permissions[resource]?.includes(action) ?? false}
												onChange={(v) => toggle(resource, action, v)}
											/>
										))}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{step === 3 && (
					<div className="space-y-3">
						<p className="text-sm font-semibold">{t("settings.roles.review")}</p>
						<div className="border rounded p-3 text-sm space-y-2">
							<div>
								<b>{t("common.name")}:</b> {nameEn}{" "}
								{nameAm && <span className="text-muted-foreground">({nameAm})</span>}
							</div>
							<div>
								<b>{t("settings.roles.slug")}:</b> <span className="font-mono">{slug}</span>
							</div>
							{description && (
								<div>
									<b>{t("common.description")}:</b> {description}
								</div>
							)}
							{copyFrom && (
								<div>
									<b>{t("settings.roles.basedOn")}</b>{" "}
									{t(`settings.roles.systemRoleNames.${copyFrom}`, { defaultValue: copyFrom })}
								</div>
							)}
							<div>
								<b>{t("settings.roles.permissionsN", { count: permCount })}</b>
							</div>
							<ul className="pl-4 list-disc text-xs">
								{Object.entries(permissions).map(([r, a]) => (
									<li key={r}>
										<span className="font-mono">{r}:</span> {a.join(", ")}
									</li>
								))}
							</ul>
						</div>
					</div>
				)}

				<DialogFooter>
					{step > 1 && (
						<Button variant="outline" onClick={() => setStep((step - 1) as 1 | 2)}>
							{t("common.back")}
						</Button>
					)}
					{step < 3 && (
						<Button onClick={() => setStep((step + 1) as 2 | 3)} disabled={step === 1 && !nameEn}>
							{t("common.next")}
						</Button>
					)}
					{step === 3 && (
						<Button onClick={submit} disabled={create.isPending}>
							{create.isPending ? t("settings.roles.creatingBtn") : t("settings.roles.createRole")}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
});
CreateRoleDialog.displayName = "CreateRoleDialog";

const RoleRow = React.memo(
	({ role, onDelete }: { readonly role: CustomRole; readonly onDelete: (id: string) => void }) => {
		const { t } = useTranslation();
		const permCount = Object.values(role.permissionsJson).reduce((s, a) => s + a.length, 0);
		return (
			<tr className="border-b">
				<td className="py-2 px-3 font-medium">
					{role.nameEn}
					{role.nameAm && <span className="text-muted-foreground ml-2">({role.nameAm})</span>}
				</td>
				<td className="py-2 px-3 font-mono text-xs">{role.slug}</td>
				<td className="py-2 px-3 text-xs">
					{role.inheritsFromSlug
						? t(`settings.roles.systemRoleNames.${role.inheritsFromSlug}`, { defaultValue: role.inheritsFromSlug })
						: "—"}
				</td>
				<td className="py-2 px-3">{permCount}</td>
				<td className="py-2 px-3">{role.memberCount}</td>
				<td className="py-2 px-3">
					<Badge variant={role.active ? "default" : "secondary"}>
						{role.active ? t("settings.roles.statusActive") : t("settings.roles.statusInactive")}
					</Badge>
				</td>
				<td className="py-2 px-3 text-right">
					<Button
						size="sm"
						variant="ghost"
						onClick={() => {
							if (confirm(t("settings.roles.deleteConfirm", { name: role.nameEn }))) onDelete(role.id);
						}}
						disabled={role.memberCount > 0}
					>
						{t("common.delete")}
					</Button>
				</td>
			</tr>
		);
	},
	(a, b) => a.role.id === b.role.id && a.role.updatedAt === b.role.updatedAt,
);
RoleRow.displayName = "RoleRow";

function Page() {
	const { t, i18n } = useTranslation();
	const { data: customRoles = [] } = useCustomRoles();
	const { data: systemRoles = [] } = useSystemRoles();
	const del = useDeleteRole();

	return (
		<div className="p-6 space-y-6 max-w-6xl">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h1 className="text-2xl font-bold">{t("settings.roles.title")}</h1>
					<p className="text-sm text-muted-foreground">{t("settings.roles.subtitle")}</p>
				</div>
				<CreateRoleDialog />
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">{t("settings.roles.systemRoles", { count: systemRoles.length })}</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left border-b">
								<th className="py-2 px-3">{t("settings.roles.nameCol")}</th>
								<th className="py-2 px-3">{t("settings.roles.slugCol")}</th>
								<th className="py-2 px-3">{t("settings.roles.permissionsCol")}</th>
							</tr>
						</thead>
						<tbody>
							{systemRoles.map((r) => {
								const permCount = Object.values(r.statements ?? {}).reduce((s, a) => s + (a as string[]).length, 0);
								const enLabel = t(`settings.roles.systemRoleNames.${r.slug}`, { defaultValue: r.slug });
								const amLabel = SYSTEM_ROLE_AM[r.slug];
								return (
									<tr key={r.slug} className="border-b">
										<td className="py-2 px-3 font-medium">
											{enLabel}
											{amLabel && i18n.language !== "am" && (
												<span className="text-muted-foreground ml-2">({amLabel})</span>
											)}
										</td>
										<td className="py-2 px-3 font-mono text-xs">{r.slug}</td>
										<td className="py-2 px-3 text-xs">{permCount}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-sm">{t("settings.roles.customRoles", { count: customRoles.length })}</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					{customRoles.length === 0 ? (
						<p className="p-4 text-sm text-muted-foreground">{t("settings.roles.noCustomRoles")}</p>
					) : (
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left border-b">
									<th className="py-2 px-3">{t("settings.roles.nameCol")}</th>
									<th className="py-2 px-3">{t("settings.roles.slugCol")}</th>
									<th className="py-2 px-3">{t("settings.roles.inherits")}</th>
									<th className="py-2 px-3">{t("settings.roles.permsCol")}</th>
									<th className="py-2 px-3">{t("settings.roles.membersCol")}</th>
									<th className="py-2 px-3">{t("settings.roles.statusCol")}</th>
									<th className="py-2 px-3"></th>
								</tr>
							</thead>
							<tbody>
								{customRoles.map((r) => (
									<RoleRow key={r.id} role={r} onDelete={(id) => del.mutate(id)} />
								))}
							</tbody>
						</table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
