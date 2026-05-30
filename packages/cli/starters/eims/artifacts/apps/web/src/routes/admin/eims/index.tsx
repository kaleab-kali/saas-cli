import { createFileRoute } from "@tanstack/react-router";
import { AdminEimsOverviewPage } from "#features/eims/components/eims-admin-pages";

export const Route = createFileRoute("/admin/eims/")({
	component: AdminEimsOverviewPage,
});
