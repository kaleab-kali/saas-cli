import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	type TeamRole,
	useAcceptInvitation,
	useCancelInvitation,
	useInviteMember,
	useRemoveMember,
	useTeamInvitations,
	useTeamMembers,
	useUpdateMemberRole,
} from "#features/team/api/team.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/settings/members")({ component: MembersPage });

const ROLES: TeamRole[] = ["owner", "admin", "member", "viewer"];

function MembersPage() {
	const { t } = useTranslation();
	const { data: members = [], isLoading } = useTeamMembers();
	const { data: invitations = [] } = useTeamInvitations();
	const invite = useInviteMember();
	const updateRole = useUpdateMemberRole();
	const remove = useRemoveMember();
	const cancelInvitation = useCancelInvitation();
	const acceptInvitation = useAcceptInvitation();
	const handledInvitationRef = React.useRef<string | null>(null);
	const [email, setEmail] = React.useState("");
	const [role, setRole] = React.useState<TeamRole>("member");

	React.useEffect(() => {
		const invitationId = new URLSearchParams(window.location.search).get("invitationId");
		if (invitationId && handledInvitationRef.current !== invitationId) {
			handledInvitationRef.current = invitationId;
			acceptInvitation.mutate(invitationId);
		}
	}, [acceptInvitation]);

	const submitInvite = React.useCallback(async () => {
		if (!email.trim()) {
			toast.error(t("settings.membersPage.emailRequired"));
			return;
		}
		const result = await invite.mutateAsync({ email, role });
		setEmail("");
		if (result.data.acceptUrl) {
			try {
				await navigator.clipboard.writeText(result.data.acceptUrl);
				toast.success(t("settings.membersPage.invitationCreatedCopied"));
			} catch {
				toast.success(t("settings.membersPage.invitationCreated"));
			}
		} else {
			toast.success(t("settings.membersPage.invitationCreated"));
		}
	}, [email, role, invite, t]);

	return (
		<div className="p-6 space-y-6 max-w-6xl">
			<div>
				<h1 className="text-2xl font-semibold">{t("settings.membersPage.title")}</h1>
				<p className="text-sm text-muted-foreground">{t("settings.membersPage.subtitle")}</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("settings.membersPage.inviteTitle")}</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
					<div>
						<Label>{t("common.email")}</Label>
						<Input
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder={t("settings.membersPage.emailPlaceholder")}
						/>
					</div>
					<div>
						<Label>{t("common.role")}</Label>
						<Select value={role} onValueChange={(value) => setRole(value as TeamRole)}>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{ROLES.map((r) => (
									<SelectItem key={r} value={r}>
										{t(`settings.membersPage.roles.${r}`)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<Button onClick={submitInvite} disabled={invite.isPending}>
						{invite.isPending ? t("settings.membersPage.invitingButton") : t("settings.membersPage.inviteButton")}
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("settings.membersPage.activeMembers")}</CardTitle>
				</CardHeader>
				<CardContent className="p-0 overflow-x-auto">
					{isLoading ? (
						<div className="p-4">
							<Skeleton className="h-40 w-full" />
						</div>
					) : (
						<table className="w-full text-sm">
							<thead className="bg-muted/50 text-muted-foreground">
								<tr>
									<th className="p-2 text-left">{t("common.name")}</th>
									<th className="p-2 text-left">{t("common.email")}</th>
									<th className="p-2 text-left">{t("common.role")}</th>
									<th className="p-2 text-left">{t("settings.membersPage.joined")}</th>
									<th className="p-2 text-right">{t("common.actions")}</th>
								</tr>
							</thead>
							<tbody>
								{members.map((member) => (
									<tr key={member.id} className="border-t">
										<td className="p-2 font-medium">{member.user.name}</td>
										<td className="p-2">{member.user.email}</td>
										<td className="p-2">
											<Select
												value={member.role}
												onValueChange={(value) => updateRole.mutate({ id: member.id, role: value as TeamRole })}
											>
												<SelectTrigger size="sm">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{ROLES.map((r) => (
														<SelectItem key={r} value={r}>
															{t(`settings.membersPage.roles.${r}`)}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</td>
										<td className="p-2 text-xs">{new Date(member.createdAt).toLocaleDateString()}</td>
										<td className="p-2 text-right">
											<Button size="sm" variant="ghost" onClick={() => remove.mutate(member.id)}>
												{t("settings.membersPage.remove")}
											</Button>
										</td>
									</tr>
								))}
								{members.length === 0 && (
									<tr>
										<td colSpan={5} className="p-6 text-center text-muted-foreground">
											{t("settings.membersPage.noMembers")}
										</td>
									</tr>
								)}
							</tbody>
						</table>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("settings.membersPage.invitations")}</CardTitle>
				</CardHeader>
				<CardContent className="p-0 overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-muted/50 text-muted-foreground">
							<tr>
								<th className="p-2 text-left">{t("common.email")}</th>
								<th className="p-2 text-left">{t("common.role")}</th>
								<th className="p-2 text-left">{t("common.status")}</th>
								<th className="p-2 text-left">{t("common.expires")}</th>
								<th className="p-2 text-right">{t("common.actions")}</th>
							</tr>
						</thead>
						<tbody>
							{invitations.map((invitation) => (
								<tr key={invitation.id} className="border-t">
									<td className="p-2 font-medium">{invitation.email}</td>
									<td className="p-2">{t(`settings.membersPage.roles.${invitation.role ?? "member"}`)}</td>
									<td className="p-2">
										<Badge variant={invitation.status === "pending" ? "secondary" : "outline"}>
											{invitation.status}
										</Badge>
									</td>
									<td className="p-2 text-xs">{new Date(invitation.expiresAt).toLocaleDateString()}</td>
									<td className="p-2 text-right space-x-1">
										<Button
											size="sm"
											variant="outline"
											onClick={() =>
												navigator.clipboard
													.writeText(
														invitation.acceptUrl ??
															`${window.location.origin}/settings/members?invitationId=${invitation.id}`,
													)
													.then(() => toast.success(t("settings.membersPage.linkCopied")))
													.catch(() => toast.error(t("settings.membersPage.copyFailed")))
											}
										>
											{t("settings.membersPage.copyLink")}
										</Button>
										{invitation.status === "pending" && (
											<Button size="sm" variant="ghost" onClick={() => cancelInvitation.mutate(invitation.id)}>
												{t("common.cancel")}
											</Button>
										)}
									</td>
								</tr>
							))}
							{invitations.length === 0 && (
									<tr>
										<td colSpan={5} className="p-6 text-center text-muted-foreground">
											{t("settings.membersPage.noInvitations")}
										</td>
									</tr>
							)}
						</tbody>
					</table>
				</CardContent>
			</Card>
		</div>
	);
}
