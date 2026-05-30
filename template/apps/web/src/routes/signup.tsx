import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { AuthShell } from "#shared/components/AuthShell";
import { authClient } from "#shared/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
	component: SignupPage,
});

const SignupForm = React.memo(
	() => {
		const { t } = useTranslation();
		const [name, setName] = React.useState("");
		const [email, setEmail] = React.useState("");
		const [password, setPassword] = React.useState("");
		const [error, setError] = React.useState("");
		const [loading, setLoading] = React.useState(false);

		const handleSubmit = React.useCallback(
			async (e: React.FormEvent) => {
				e.preventDefault();
				setError("");
				setLoading(true);

				await authClient.signUp.email(
					{ name, email, password },
					{
						onSuccess: () => {
							window.location.href = "/create-org";
						},
						onError: (ctx) => {
							setError(ctx.error.message || t("auth.signupFailed"));
						},
					},
				);

				setLoading(false);
			},
			[name, email, password, t],
		);

		const onChange = React.useCallback(
			(setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) =>
				setter(e.target.value),
			[],
		);

		return (
			<Card className="w-full border-border/70 shadow-sm">
				<CardHeader className="space-y-1">
					<CardTitle className="text-xl font-semibold">{t("auth.createAccount")}</CardTitle>
					<CardDescription>{t("auth.getStarted")}</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
						<div className="space-y-2">
							<Label htmlFor="name">{t("auth.fullName")}</Label>
							<Input
								id="name"
								type="text"
								value={name}
								onChange={onChange(setName)}
								required
								autoComplete="name"
								autoFocus
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">{t("auth.email")}</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@company.com"
								value={email}
								onChange={onChange(setEmail)}
								required
								autoComplete="email"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">{t("auth.password")}</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={onChange(setPassword)}
								required
								autoComplete="new-password"
								minLength={8}
							/>
							<p className="text-xs text-muted-foreground">{t("auth.minChars")}</p>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col gap-4">
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? t("auth.creatingAccount") : t("auth.createAccount")}
						</Button>
						<p className="text-sm text-muted-foreground text-center">
							{t("auth.haveAccount")}{" "}
							<Link to="/login" className="text-primary underline-offset-4 hover:underline">
								{t("auth.signIn")}
							</Link>
						</p>
					</CardFooter>
				</form>
			</Card>
		);
	},
	() => true,
);
SignupForm.displayName = "SignupForm";

function SignupPage() {
	return (
		<AuthShell
			eyebrow="Start a tenant-ready product"
			title="Create the owner account"
			description="The next screen creates the first organization and drops the tenant into the onboarding workflow."
		>
			<SignupForm />
		</AuthShell>
	);
}
