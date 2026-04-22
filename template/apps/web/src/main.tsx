import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { reportError, setupGlobalErrorHandlers } from "#shared/lib/error-reporter";
import { routeTree } from "./routeTree.gen";
import "./index.css";

// Set up global error handlers (window.onerror, unhandledrejection)
setupGlobalErrorHandlers();

const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			reportError(error, `query: ${JSON.stringify(query.queryKey)}`);
		},
	}),
	mutationCache: new MutationCache({
		onError: (error, _variables, _context, mutation) => {
			reportError(
				error,
				`mutation: ${mutation.options.mutationKey ? JSON.stringify(mutation.options.mutationKey) : "unknown"}`,
			);
		},
	}),
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			retry: 1,
			refetchOnWindowFocus: false,
		},
	},
});

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
);
