import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import {
	type SystemEmailTemplate,
	useSystemTemplates,
	useUpdateSystemTemplate,
} from "#features/admin/api/admin-system-templates.hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const TemplateCard = React.memo(
	({ tpl }: { readonly tpl: SystemEmailTemplate }) => {
		const update = useUpdateSystemTemplate();
		const [subject, setSubject] = React.useState(tpl.subject);
		const [bodyHtml, setBodyHtml] = React.useState(tpl.bodyHtml);
		const [subjectAm, setSubjectAm] = React.useState(tpl.subjectAm ?? "");
		const [bodyHtmlAm, setBodyHtmlAm] = React.useState(tpl.bodyHtmlAm ?? "");
		React.useEffect(() => {
			setSubject(tpl.subject);
			setBodyHtml(tpl.bodyHtml);
			setSubjectAm(tpl.subjectAm ?? "");
			setBodyHtmlAm(tpl.bodyHtmlAm ?? "");
		}, [tpl]);
		const dirty =
			subject !== tpl.subject ||
			bodyHtml !== tpl.bodyHtml ||
			subjectAm !== (tpl.subjectAm ?? "") ||
			bodyHtmlAm !== (tpl.bodyHtmlAm ?? "");
		const save = React.useCallback(() => {
			update.mutate({
				key: tpl.key,
				subject,
				bodyHtml,
				subjectAm: subjectAm || undefined,
				bodyHtmlAm: bodyHtmlAm || undefined,
			});
		}, [update, tpl.key, subject, bodyHtml, subjectAm, bodyHtmlAm]);
		return (
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<div>
						<CardTitle className="text-base font-mono">{tpl.key}</CardTitle>
						{tpl.variables && (
							<p className="text-xs text-muted-foreground mt-1">
								Available variables:{" "}
								{tpl.variables.split(",").map((v) => (
									<code key={v} className="mx-0.5 px-1 rounded bg-muted text-[10px]">
										{`{{${v}}}`}
									</code>
								))}
							</p>
						)}
					</div>
					<Button size="sm" disabled={!dirty || update.isPending} onClick={save}>
						{update.isPending ? "Saving..." : dirty ? "Save" : "Saved"}
					</Button>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label>Subject (English)</Label>
							<Input value={subject} onChange={(e) => setSubject(e.target.value)} />
						</div>
						<div className="space-y-1">
							<Label>Subject (Amharic, optional)</Label>
							<Input value={subjectAm} onChange={(e) => setSubjectAm(e.target.value)} />
						</div>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label>Body HTML (English)</Label>
							<textarea
								value={bodyHtml}
								onChange={(e) => setBodyHtml(e.target.value)}
								rows={8}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
							/>
						</div>
						<div className="space-y-1">
							<Label>Body HTML (Amharic, optional)</Label>
							<textarea
								value={bodyHtmlAm}
								onChange={(e) => setBodyHtmlAm(e.target.value)}
								rows={8}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	},
	(prev, next) => prev.tpl === next.tpl,
);
TemplateCard.displayName = "TemplateCard";

const SystemTemplatesPage = React.memo(
	() => {
		const { data = [], isLoading } = useSystemTemplates();
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">System Email Templates</h1>
					<p className="text-sm text-muted-foreground">
						Dunning + system email bodies. Variables like <code>{"{{orgName}}"}</code> are replaced at send time.
					</p>
				</div>
				{isLoading ? (
					<Skeleton className="h-96 w-full" />
				) : (
					<div className="space-y-4">
						{data.map((t) => (
							<TemplateCard key={t.id} tpl={t} />
						))}
					</div>
				)}
			</div>
		);
	},
	() => true,
);
SystemTemplatesPage.displayName = "SystemTemplatesPage";

export const Route = createFileRoute("/admin/system-templates/")({
	component: SystemTemplatesPage,
});
