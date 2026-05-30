import { createFileRoute } from "@tanstack/react-router";
import { EimsSubmissionsPage } from "#features/eims/components/eims-tenant-pages";

export const Route = createFileRoute("/_authenticated/eims/submissions")({
	component: EimsSubmissionsPage,
});
