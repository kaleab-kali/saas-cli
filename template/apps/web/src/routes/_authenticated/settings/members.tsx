import { createFileRoute } from "@tanstack/react-router";
import { MembersPage } from "#features/team/components/MembersPage";

export const Route = createFileRoute("/_authenticated/settings/members")({ component: MembersPage });
