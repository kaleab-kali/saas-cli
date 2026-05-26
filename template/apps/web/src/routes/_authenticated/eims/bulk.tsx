import { createFileRoute } from "@tanstack/react-router";
import { EimsBulkPage } from "#features/eims/components/eims-tenant-pages";

export const Route = createFileRoute("/_authenticated/eims/bulk")({
	component: EimsBulkPage,
});
