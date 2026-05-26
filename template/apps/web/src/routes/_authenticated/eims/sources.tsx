import { createFileRoute } from "@tanstack/react-router";
import { EimsDirectoryPage } from "#features/eims/components/eims-tenant-pages";

export const Route = createFileRoute("/_authenticated/eims/sources")({
	component: () => <EimsDirectoryPage kind="sources" />,
});
