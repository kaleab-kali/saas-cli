import { createFileRoute } from "@tanstack/react-router";
import { TenantOnboardingPage } from "#features/onboarding/components/onboarding-pages";

export const Route = createFileRoute("/_authenticated/onboarding/")({
	component: TenantOnboardingPage,
});
