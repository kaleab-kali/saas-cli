import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { adminAuthApi } from "#features/admin/api/admin-auth";
import { i18nAdmin } from "#shared/i18n/config-admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin-login")({
	component: () => (
		<I18nextProvider i18n={i18nAdmin}>
			<AdminLoginPage />
		</I18nextProvider>
	),
});

const AdminLoginForm = React.memo(
	() => {
		const { t } = useTranslation();
		const [email, setEmail] = React.useState("");
		const [password, setPassword] = React.useState("");
		const [error, setError] = React.useState("");
		const [loading, setLoading] = React.useState(false);

		const handleSubmit = React.useCallback(
			async (e: React.FormEvent) => {
				e.preventDefault();
				setError("");
				setLoading(true);

				try {
					await adminAuthApi.login(email, password);
					window.location.href = "/admin";
				} catch (err) {
					setError(err instanceof Error ? err.message : t("admin.invalidCreds"));
					setLoading(false);
				}
			},
			[email, password, t],
		);

		const handleEmailChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
			setEmail(e.target.value);
		}, []);

		const handlePasswordChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
			setPassword(e.target.value);
		}, []);

		return (
			<Card className="w-full max-w-sm border-destructive/20">
				<CardHeader className="space-y-1">
					<div className="flex items-center justify-center mb-2">
						<div className="rounded-lg bg-destructive/10 p-2">
							<div className="text-destructive text-sm font-bold">{t("admin.adminBadge")}</div>
						</div>
					</div>
					<CardTitle className="text-2xl font-bold text-center">{t("admin.platformAdmin")}</CardTitle>
					<CardDescription className="text-center">{t("admin.authorizedOnly")}</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
						<div className="space-y-2">
							<Label htmlFor="admin-email">{t("admin.adminEmailLabel")}</Label>
							<Input
								id="admin-email"
								type="email"
								placeholder={t("admin.adminEmailPlaceholder")}
								value={email}
								onChange={handleEmailChange}
								required
								autoComplete="email"
								autoFocus
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="admin-password">{t("admin.adminPasswordLabel")}</Label>
							<Input
								id="admin-password"
								type="password"
								placeholder="Password"
								value={password}
								onChange={handlePasswordChange}
								required
								autoComplete="current-password"
							/>
						</div>
					</CardContent>
					<CardFooter>
						<Button type="submit" className="w-full" variant="destructive" disabled={loading}>
							{loading ? t("admin.authenticating") : t("admin.signInToAdmin")}
						</Button>
					</CardFooter>
				</form>
			</Card>
		);
	},
	() => true,
);
AdminLoginForm.displayName = "AdminLoginForm";

function AdminLoginPage() {
	return (
		<div className="flex min-h-screen items-center justify-center p-4 bg-background">
			<AdminLoginForm />
		</div>
	);
}
