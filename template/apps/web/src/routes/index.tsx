import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: DashboardPage,
});

function DashboardPage() {
	return (
		<div className="p-8">
			<h1 className="text-2xl font-semibold">Dashboard</h1>
			<p className="text-muted-foreground mt-2">Welcome to PropFlow</p>
		</div>
	);
}
