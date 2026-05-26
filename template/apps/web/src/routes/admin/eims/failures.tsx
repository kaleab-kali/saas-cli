import { createFileRoute } from "@tanstack/react-router";
import { AdminEimsFailuresPage } from "#features/eims/components/eims-admin-pages";

export const Route = createFileRoute("/admin/eims/failures")({
	component: AdminEimsFailuresPage,
});
