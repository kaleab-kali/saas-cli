import { createFileRoute } from "@tanstack/react-router";
import { AdminOnboardingDetailPage } from "#features/onboarding/components/onboarding-pages";

export const Route = createFileRoute("/admin/onboarding/$taskId")({
	component: Page,
});

function Page() {
	const { taskId } = Route.useParams();
	return <AdminOnboardingDetailPage taskId={taskId} />;
}
