import { createFileRoute } from "@tanstack/react-router";
import { EimsOverviewPage } from "#features/eims/components/eims-tenant-pages";

export const Route = createFileRoute("/_authenticated/eims/")({
	component: EimsOverviewPage,
});
