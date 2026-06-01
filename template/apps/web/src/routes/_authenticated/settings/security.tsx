import { createFileRoute } from "@tanstack/react-router";
import { SecuritySettingsPage } from "#features/platform/components/SecuritySettingsPage";

export const Route = createFileRoute("/_authenticated/settings/security")({ component: SecuritySettingsPage });
