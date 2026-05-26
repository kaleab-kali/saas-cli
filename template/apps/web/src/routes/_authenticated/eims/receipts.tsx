import { createFileRoute } from "@tanstack/react-router";
import { EimsReceiptsPage } from "#features/eims/components/eims-tenant-pages";

export const Route = createFileRoute("/_authenticated/eims/receipts")({
	component: EimsReceiptsPage,
});
