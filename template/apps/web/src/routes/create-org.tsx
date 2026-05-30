import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { AuthShell } from "#shared/components/AuthShell";
import { authClient } from "#shared/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/create-org")({
	component: CreateOrgPage,
});

const slugify = (text: string) =>
	text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_]+/g, "-")
		.replace(/^-+|-+$/g, "");

const CreateOrgForm = React.memo(
	() => {
		const { t } = useTranslation();
		const [name, setName] = React.useState("");
		const [slug, setSlug] = React.useState("");
		const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false);
		const [error, setError] = React.useState("");
		const [loading, setLoading] = React.useState(false);

		const handleNameChange = React.useCallback(
			(e: React.ChangeEvent<HTMLInputElement>) => {
				const newName = e.target.value;
				setName(newName);
				if (!slugManuallyEdited) {
					setSlug(slugify(newName));
				}
			},
			[slugManuallyEdited],
		);

		const handleSlugChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
			setSlugManuallyEdited(true);
			setSlug(slugify(e.target.value));
		}, []);

		const handleSubmit = React.useCallback(
			async (e: React.FormEvent) => {
				e.preventDefault();
				setError("");
				setLoading(true);

				const { data: org, error: createError } = await authClient.organization.create({
					name,
					slug,
				});

				if (createError) {
					setError(createError.message || t("createOrg.failed"));
					setLoading(false);
					return;
				}

				await authClient.organization.setActive({
					organizationId: org.id,
				});

				window.location.href = "/onboarding";
			},
			[name, slug, t],
		);

		return (
			<Card className="w-full border-border/70 shadow-sm">
				<CardHeader className="space-y-1">
					<CardTitle className="text-xl font-semibold">{t("createOrg.title")}</CardTitle>
					<CardDescription>{t("createOrg.subtitle")}</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
						<div className="space-y-2">
							<Label htmlFor="org-name">{t("createOrg.companyName")}</Label>
							<Input
								id="org-name"
								type="text"
								placeholder={t("createOrg.companyNamePlaceholder")}
								value={name}
								onChange={handleNameChange}
								required
								autoFocus
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="org-slug">{t("createOrg.urlSlug")}</Label>
							<Input
								id="org-slug"
								type="text"
								placeholder={t("createOrg.slugPlaceholder")}
								value={slug}
								onChange={handleSlugChange}
								required
								pattern="[a-z0-9\-]+"
							/>
							<p className="text-xs text-muted-foreground">{t("createOrg.slugHelp")}</p>
						</div>
					</CardContent>
					<CardFooter>
						<Button type="submit" className="w-full" disabled={loading || !name || !slug}>
							{loading ? t("createOrg.creating") : t("createOrg.createBtn")}
						</Button>
					</CardFooter>
				</form>
			</Card>
		);
	},
	() => true,
);
CreateOrgForm.displayName = "CreateOrgForm";

function CreateOrgPage() {
	return (
		<AuthShell
			eyebrow="Workspace foundation"
			title="Name the tenant workspace"
			description="This creates the organization scope used by permissions, billing, audit logs, onboarding, and starter-pack modules."
		>
			<CreateOrgForm />
		</AuthShell>
	);
}
