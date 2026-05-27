import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAdminUserList } from "#features/admin/api/admin.queries";
import { impersonateUrl, useForcePasswordReset } from "#features/admin/api/admin-user-actions.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/admin/users/")({
	component: UsersPage,
});

const UserActions = React.memo(
	({ userId, email }: { readonly userId: string; readonly email: string }) => {
		const { t } = useTranslation();
		const forceReset = useForcePasswordReset();

		const handleReset = React.useCallback(async () => {
			if (!window.confirm(t("admin.usersPage.resetConfirm", { email }))) return;
			await forceReset.mutateAsync(userId);
			window.alert(t("admin.usersPage.resetDone"));
		}, [forceReset, userId, email, t]);

		const handleImpersonate = React.useCallback(() => {
			if (!window.confirm(t("admin.usersPage.impersonateConfirm", { email }))) return;
			window.location.href = impersonateUrl(userId);
		}, [userId, email, t]);

		return (
			<div className="flex gap-1 justify-end">
				<Button
					size="sm"
					variant="outline"
					onClick={handleImpersonate}
					title={t("admin.usersPage.impersonateTitle")}
				>
					{t("admin.usersPage.impersonate")}
				</Button>
				<Button
					size="sm"
					variant="ghost"
					className="text-destructive"
					onClick={handleReset}
					disabled={forceReset.isPending}
				>
					{t("admin.usersPage.resetPasswordShort")}
				</Button>
			</div>
		);
	},
	(prev, next) => prev.userId === next.userId,
);
UserActions.displayName = "UserActions";

function UsersPage() {
	const { t } = useTranslation();
	const [search, setSearch] = React.useState("");
	const { data, isLoading } = useAdminUserList({ search });

	const handleSearch = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setSearch(e.target.value);
	}, []);

	const users = data?.data || [];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">{t("admin.allUsers")}</h1>
				<p className="text-muted-foreground mt-1">{t("admin.allUsersDesc")}</p>
			</div>

			<Input
				placeholder={t("admin.searchUsersPlaceholder")}
				value={search}
				onChange={handleSearch}
				className="max-w-sm"
			/>

			{isLoading ? (
				<div className="space-y-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={`user-${i}`} className="h-12 w-full" />
					))}
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("admin.nameCol")}</TableHead>
							<TableHead>{t("admin.emailCol")}</TableHead>
							<TableHead>{t("admin.verifiedCol")}</TableHead>
							<TableHead>{t("admin.orgsCol")}</TableHead>
							<TableHead>{t("admin.joinedCol")}</TableHead>
							<TableHead className="text-right">{t("admin.usersPage.actions")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{users.length === 0 && (
							<TableRow>
								<TableCell colSpan={6} className="text-center text-muted-foreground py-8">
									{t("admin.noUsersFound")}
								</TableCell>
							</TableRow>
						)}
						{users.map((user) => (
							<TableRow key={user.id}>
								<TableCell className="font-medium">{user.name}</TableCell>
								<TableCell>{user.email}</TableCell>
								<TableCell>
									{user.emailVerified ? (
										<Badge variant="default">{t("admin.verified")}</Badge>
									) : (
										<Badge variant="secondary">{t("admin.unverified")}</Badge>
									)}
								</TableCell>
								<TableCell>
									{user.organizations.length === 0 ? (
										<span className="text-muted-foreground text-sm">{t("admin.noneLabel")}</span>
									) : (
										<div className="flex flex-wrap gap-1">
											{user.organizations.map((org) => (
												<Badge key={org.id} variant="outline" className="text-xs">
													{org.name} ({org.role})
												</Badge>
											))}
										</div>
									)}
								</TableCell>
								<TableCell className="text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
								<TableCell>
									<UserActions userId={user.id} email={user.email} />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	);
}
