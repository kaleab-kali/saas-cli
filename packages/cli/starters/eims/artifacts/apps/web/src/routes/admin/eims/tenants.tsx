import { createFileRoute } from "@tanstack/react-router";
import { AdminEimsTenantsPage } from "#features/eims/components/eims-admin-pages";

export const Route = createFileRoute("/admin/eims/tenants")({
	component: AdminEimsTenantsPage,
});
