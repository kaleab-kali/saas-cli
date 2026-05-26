import { createFileRoute } from "@tanstack/react-router";
import { AdminEimsResourcesPage } from "#features/eims/components/eims-admin-pages";

export const Route = createFileRoute("/admin/eims/resources")({
	component: AdminEimsResourcesPage,
});
