import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

function LoginPage() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="w-full max-w-sm space-y-4">
				<h1 className="text-2xl font-semibold text-center">Sign in to PropFlow</h1>
				{/* TODO: implement login form */}
			</div>
		</div>
	);
}
