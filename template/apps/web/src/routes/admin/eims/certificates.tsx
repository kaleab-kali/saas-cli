import { createFileRoute } from "@tanstack/react-router";
import { AdminEimsCertificatesPage } from "#features/eims/components/eims-admin-pages";

export const Route = createFileRoute("/admin/eims/certificates")({
	component: AdminEimsCertificatesPage,
});
