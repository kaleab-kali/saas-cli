import { createFileRoute } from "@tanstack/react-router";
import { EimsCompliancePage } from "#features/eims/components/eims-tenant-pages";

export const Route = createFileRoute("/_authenticated/eims/compliance")({
	component: EimsCompliancePage,
});
