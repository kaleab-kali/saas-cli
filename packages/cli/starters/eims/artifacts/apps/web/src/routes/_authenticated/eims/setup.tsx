import { createFileRoute } from "@tanstack/react-router";
import { EimsSetupPage } from "#features/eims/components/eims-tenant-pages";

export const Route = createFileRoute("/_authenticated/eims/setup")({
	component: EimsSetupPage,
});
