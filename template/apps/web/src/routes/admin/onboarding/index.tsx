import { createFileRoute } from "@tanstack/react-router";
import { AdminOnboardingListPage } from "#features/onboarding/components/onboarding-pages";

export const Route = createFileRoute("/admin/onboarding/")({
	component: AdminOnboardingListPage,
});
