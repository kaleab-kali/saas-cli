import { createFileRoute } from "@tanstack/react-router";
import { AdminOnboardingNewPage } from "#features/onboarding/components/onboarding-pages";

export const Route = createFileRoute("/admin/onboarding/new")({
	component: AdminOnboardingNewPage,
});
