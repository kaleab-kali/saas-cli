import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useDeleteTemplate, useTemplates, useUpsertTemplate } from "#features/notifications/api/notification.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/notifications/templates")({ component: Page });

const TemplateDialog = React.memo(
	() => {
		const { t } = useTranslation();
		const [open, setOpen] = React.useState(false);
		const [eventKey, setEventKey] = React.useState("");
		const [subject, setSubject] = React.useState("");
		const [bodyHtml, setBodyHtml] = React.useState("");
		const [bodyText, setBodyText] = React.useState("");
		const upsert = useUpsertTemplate();

		const onSubmit = React.useCallback(async () => {
			if (!eventKey.trim() || !subject.trim() || !bodyHtml.trim()) return;
			await upsert.mutateAsync({
				eventKey: eventKey.trim(),
				subject: subject.trim(),
				bodyHtml,
				bodyText: bodyText.trim() || undefined,
			});
			setOpen(false);
			setEventKey("");
			setSubject("");
			setBodyHtml("");
			setBodyText("");
		}, [eventKey, subject, bodyHtml, bodyText, upsert]);

		return (
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button>{t("notifications.templateDialog.trigger")}</Button>
				</DialogTrigger>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{t("notifications.templateDialog.title")}</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>{t("notifications.templateDialog.eventKey")}</Label>
							<Input
								value={eventKey}
								onChange={(e) => setEventKey(e.target.value)}
								placeholder={t("notifications.templateDialog.eventKeyPlaceholder")}
							/>
						</div>
						<div>
							<Label>{t("notifications.templateDialog.subject")}</Label>
							<Input
								value={subject}
								onChange={(e) => setSubject(e.target.value)}
								placeholder={t("notifications.templateDialog.subjectPlaceholder")}
							/>
						</div>
						<div>
							<Label>{t("notifications.templateDialog.bodyHtml")}</Label>
							<textarea
								className="w-full border rounded-md p-2 text-sm bg-background font-mono"
								rows={8}
								value={bodyHtml}
								onChange={(e) => setBodyHtml(e.target.value)}
							/>
						</div>
						<div>
							<Label>{t("notifications.templateDialog.bodyText")}</Label>
							<textarea
								className="w-full border rounded-md p-2 text-sm bg-background"
								rows={3}
								value={bodyText}
								onChange={(e) => setBodyText(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							{t("notifications.templateDialog.cancel")}
						</Button>
						<Button
							onClick={onSubmit}
							disabled={upsert.isPending || !eventKey.trim() || !subject.trim() || !bodyHtml.trim()}
						>
							{t("notifications.templateDialog.save")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	},
	() => true,
);
TemplateDialog.displayName = "TemplateDialog";

function Page() {
	const { t } = useTranslation();
	const { data: templates = [] } = useTemplates();
	const del = useDeleteTemplate();

	return (
		<div className="p-6 space-y-4 max-w-5xl">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<h1 className="text-2xl font-bold">{t("notifications.templatesTitle")}</h1>
					<p className="text-sm text-muted-foreground">{t("notifications.templatesPage.subtitle")}</p>
				</div>
				<TemplateDialog />
			</div>
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">
						{t("notifications.templatesPage.cardTitle", { count: templates.length })}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{templates.length === 0 ? (
						<p className="text-sm text-muted-foreground">{t("notifications.templatesPage.noTemplates")}</p>
					) : (
						<Table className="w-full text-sm">
							<TableHeader>
								<TableRow className="text-left border-b">
									<TableHead className="py-2">{t("notifications.templatesPage.columns.eventKey")}</TableHead>
									<TableHead className="py-2">{t("notifications.templatesPage.columns.subject")}</TableHead>
									<TableHead className="py-2">{t("notifications.templatesPage.columns.status")}</TableHead>
									<TableHead className="py-2"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{templates.map((tpl) => (
									<TableRow key={tpl.id} className="border-b">
										<TableCell className="py-2 font-mono text-xs">{tpl.eventKey}</TableCell>
										<TableCell className="py-2">{tpl.subject}</TableCell>
										<TableCell className="py-2">
											<Badge variant={tpl.active ? "default" : "secondary"}>
												{tpl.active
													? t("notifications.templatesPage.active")
													: t("notifications.templatesPage.inactive")}
											</Badge>
										</TableCell>
										<TableCell className="py-2 text-right">
											<Button size="sm" variant="ghost" onClick={() => del.mutate(tpl.id)}>
												{t("notifications.templatesPage.deleteBtn")}
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
