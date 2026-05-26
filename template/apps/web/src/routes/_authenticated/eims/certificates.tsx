import { createFileRoute } from "@tanstack/react-router";
import { EimsCertificatesPage } from "#features/eims/components/eims-tenant-pages";

export const Route = createFileRoute("/_authenticated/eims/certificates")({
	component: EimsCertificatesPage,
});
