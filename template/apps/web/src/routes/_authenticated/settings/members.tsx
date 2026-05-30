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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
						<Table className="w-full text-sm">
							<TableHeader className="bg-muted/50 text-muted-foreground">
								<TableRow>
									<TableHead className="p-2 text-left">{t("common.name")}</TableHead>
									<TableHead className="p-2 text-left">{t("common.email")}</TableHead>
									<TableHead className="p-2 text-left">{t("common.role")}</TableHead>
									<TableHead className="p-2 text-left">{t("settings.membersPage.joined")}</TableHead>
									<TableHead className="p-2 text-right">{t("common.actions")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{members.map((member) => (
									<TableRow key={member.id} className="border-t">
										<TableCell className="p-2 font-medium">{member.user.name}</TableCell>
										<TableCell className="p-2">{member.user.email}</TableCell>
										<TableCell className="p-2">
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
										</TableCell>
										<TableCell className="p-2 text-xs">{new Date(member.createdAt).toLocaleDateString()}</TableCell>
										<TableCell className="p-2 text-right">
											<Button size="sm" variant="ghost" onClick={() => remove.mutate(member.id)}>
												{t("settings.membersPage.remove")}
											</Button>
										</TableCell>
									</TableRow>
								))}
								{members.length === 0 && (
									<TableRow>
										<TableCell colSpan={5} className="p-6 text-center text-muted-foreground">
											{t("settings.membersPage.noMembers")}
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("settings.membersPage.invitations")}</CardTitle>
				</CardHeader>
				<CardContent className="p-0 overflow-x-auto">
					<Table className="w-full text-sm">
						<TableHeader className="bg-muted/50 text-muted-foreground">
							<TableRow>
								<TableHead className="p-2 text-left">{t("common.email")}</TableHead>
								<TableHead className="p-2 text-left">{t("common.role")}</TableHead>
								<TableHead className="p-2 text-left">{t("common.status")}</TableHead>
								<TableHead className="p-2 text-left">{t("common.expires")}</TableHead>
								<TableHead className="p-2 text-right">{t("common.actions")}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{invitations.map((invitation) => (
								<TableRow key={invitation.id} className="border-t">
									<TableCell className="p-2 font-medium">{invitation.email}</TableCell>
									<TableCell className="p-2">
										{t(`settings.membersPage.roles.${invitation.role ?? "member"}`)}
									</TableCell>
									<TableCell className="p-2">
										<Badge variant={invitation.status === "pending" ? "secondary" : "outline"}>
											{invitation.status}
										</Badge>
									</TableCell>
									<TableCell className="p-2 text-xs">{new Date(invitation.expiresAt).toLocaleDateString()}</TableCell>
									<TableCell className="p-2 text-right space-x-1">
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
									</TableCell>
								</TableRow>
							))}
							{invitations.length === 0 && (
								<TableRow>
									<TableCell colSpan={5} className="p-6 text-center text-muted-foreground">
										{t("settings.membersPage.noInvitations")}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
