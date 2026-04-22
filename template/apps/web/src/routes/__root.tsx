import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppErrorBoundary } from "#shared/components/ErrorBoundary";

export const Route = createRootRoute({
	component: RootLayout,
});

function RootLayout() {
	return (
		<AppErrorBoundary>
			<div className="min-h-screen bg-background">
				<Outlet />
			</div>
		</AppErrorBoundary>
	);
}
