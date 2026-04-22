import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { reportError } from "#shared/lib/error-reporter";

const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
	<div className="flex min-h-screen items-center justify-center p-8">
		<div className="max-w-md space-y-4 text-center">
			<h1 className="text-2xl font-semibold text-destructive">Something went wrong</h1>
			<p className="text-muted-foreground">{error.message}</p>
			<button
				type="button"
				onClick={resetErrorBoundary}
				className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
			>
				Try again
			</button>
		</div>
	</div>
);
ErrorFallback.displayName = "ErrorFallback";

const handleError = (error: Error, info: { componentStack?: string | null }) => {
	reportError(error, `componentStack: ${info.componentStack || "unknown"}`);
};

export const AppErrorBoundary = ({ children }: { children: React.ReactNode }) => (
	<ReactErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
		{children}
	</ReactErrorBoundary>
);
AppErrorBoundary.displayName = "AppErrorBoundary";
