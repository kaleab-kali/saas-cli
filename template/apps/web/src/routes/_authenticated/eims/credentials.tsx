import { createFileRoute } from "@tanstack/react-router";
import { EimsCredentialsPage } from "#features/eims/components/eims-tenant-pages";

export const Route = createFileRoute("/_authenticated/eims/credentials")({
	component: EimsCredentialsPage,
});
