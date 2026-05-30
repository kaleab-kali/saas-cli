import { createFileRoute } from "@tanstack/react-router";
import { AdminEimsCompliancePage } from "#features/eims/components/eims-admin-pages";

export const Route = createFileRoute("/admin/eims/compliance")({
	component: AdminEimsCompliancePage,
});
