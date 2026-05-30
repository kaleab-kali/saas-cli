import path from "node:path";
import fs from "fs-extra";

const EIMS_PATHS = [
	"apps/api/src/modules/eims",
	"apps/api/src/modules/invoicing",
	"apps/api/src/generated/prisma",
	"apps/api/scripts/phase0",
	"apps/api-tests/bruno/EIMS-Phase0",
	"apps/api-tests/scripts/eims-mock-api-server.mjs",
	"apps/api-tests/scripts/eims-static-web-server.mjs",
	"apps/api-tests/scripts/with-mock-api.mjs",
	"apps/api-tests/tests/eims-acceptance.spec.ts",
	"apps/api-tests/tests/eims-v3-mock.spec.ts",
	"apps/acceptance/features/eims.feature",
	"apps/e2e/playwright.eims.config.ts",
	"apps/e2e/tests/eims-mock.spec.ts",
	"apps/e2e/tests/eims-mock.reference.txt",
	"apps/performance/k6/eims-submit.js",
	"apps/security/scripts/eims-security-smoke.mjs",
	"apps/web/src/features/eims",
	"apps/web/src/features/invoicing",
	"apps/web/src/routes/_authenticated/eims",
	"apps/web/src/routes/admin/eims",
	"apps/api/prisma/seed-eims-entitlements.ts",
	"docs/EIMS_SETUP_GUIDE.md",
	"docs/EIMS_PHASE0_RUNBOOK.md",
	"docs/EIMS_VAULT_RUNBOOK.md",
	"docs/EIMS_COMPLIANCE_EVIDENCE.md",
	"docs/EIMS_TENANT_ONBOARDING.md",
	"docs/EIMS_DR_RUNBOOK.md",
];

const readText = async (file) => {
	if (!(await fs.pathExists(file))) return null;
	return fs.readFile(file, "utf8");
};

const writeIfChanged = async (file, original, next) => {
	if (original === null || original === next) return false;
	await fs.writeFile(file, next, "utf8");
	return true;
};

const removeLineMatches = (text, predicate) =>
	text
		.split(/\r?\n/)
		.filter((line) => !predicate(line))
		.join("\n");

const patchJsonFile = async (file, patcher) => {
	if (!(await fs.pathExists(file))) return false;
	const json = await fs.readJson(file);
	const before = JSON.stringify(json);
	const next = patcher(json) ?? json;
	if (JSON.stringify(next) === before) return false;
	await fs.writeFile(file, `${JSON.stringify(next, null, "\t")}\n`, "utf8");
	return true;
};

const removeScripts = (json, predicate) => {
	if (!json.scripts) return json;
	for (const key of Object.keys(json.scripts)) {
		const value = String(json.scripts[key]);
		if (predicate(key, value)) delete json.scripts[key];
	}
	return json;
};

const stripPrismaEimsBlock = async (root) => {
	const file = path.join(root, "apps/api/prisma/schema.prisma");
	const text = await readText(file);
	if (text === null) return false;
	const marker = "// EIMS / EIRMS ETHIOPIAN E-INVOICING";
	const markerIndex = text.indexOf(marker);
	if (markerIndex === -1) return false;
	const blockStart = text.lastIndexOf("// ============================================================", markerIndex);
	const start = blockStart === -1 ? markerIndex : blockStart;
	const next = `${text.slice(0, start).trimEnd()}\n`;
	return writeIfChanged(file, text, next);
};

const stripAppModule = async (root) => {
	const file = path.join(root, "apps/api/src/app.module.ts");
	const text = await readText(file);
	if (text === null) return false;
	let next = removeLineMatches(
		text,
		(line) =>
			line.includes("#modules/eims/") ||
			line.includes("#modules/invoicing/") ||
			/^\s*(EimsModule|InvoicingModule),\s*$/.test(line),
	);
	next = next.replace(/\n{3,}/g, "\n\n");
	return writeIfChanged(file, text, next);
};

const stripPermissions = async (root) => {
	const file = path.join(root, "apps/api/src/modules/auth/permissions.ts");
	const text = await readText(file);
	if (text === null) return false;
	const next = removeLineMatches(text, (line) => line.includes('"eims-'));
	return writeIfChanged(file, text, next);
};

const stripFeatureEntitlements = async (root) => {
	let changed = false;
	const keysFile = path.join(root, "apps/api/src/modules/billing/domain/value-objects/feature-keys.vo.ts");
	const keysText = await readText(keysFile);
	if (keysText !== null) {
		const next = removeLineMatches(keysText, (line) => line.includes('"eims.') || line.includes("EIMS "));
		changed = (await writeIfChanged(keysFile, keysText, next)) || changed;
	}

	const registryFile = path.join(root, "apps/api/src/modules/billing/domain/value-objects/feature-registry.ts");
	const registryText = await readText(registryFile);
	if (registryText !== null) {
		let next = registryText.replace(' | "eims"', "");
		next = next.replace(/\n\t"eims\.[^"]+": \{[\s\S]*?\n\t\},/g, "");
		next = next.replace(/\n{3,}/g, "\n\n");
		changed = (await writeIfChanged(registryFile, registryText, next)) || changed;
	}
	return changed;
};

const stripSidebar = async (root) => {
	const file = path.join(root, "apps/web/src/components/layout/AppSidebar.tsx");
	const text = await readText(file);
	if (text === null) return false;
	let next = text
		.replace(/\n\tFileValidationIcon,/, "")
		.replace(
			/\n\t\{\n\t\tlabelKey: "sidebar\.eims",\n\t\tto: "\/eims",\n\t\ticon: DashboardSquare01Icon,\n\t\},/g,
			"",
		)
		.replace(
			/\n\t\{\n\t\tlabelKey: "sidebar\.eims",[\s\S]*?\n\t\},(?=\r?\n\] as const;)/,
			"",
		)
		.replace(
			/const forceOpen = item\.labelKey === "sidebar\.eims";\r?\n\t\t/,
			"const forceOpen = false;\n\t\t",
		);
	next = next.replace(/\n{3,}/g, "\n\n");
	return writeIfChanged(file, text, next);
};

const stripAdminSidebar = async (root) => {
	const file = path.join(root, "apps/web/src/components/layout/AdminSidebar.tsx");
	const text = await readText(file);
	if (text === null) return false;
	let next = text
		.replace(/\nconst ADMIN_EIMS_NAV = \[[\s\S]*?\] as const;/, "")
		.replace(
			/\n\t\t\t\t\t<SidebarGroup>\n\t\t\t\t\t\t<SidebarGroupLabel>\{t\("admin\.nav\.eimsOperations"\)\}<\/SidebarGroupLabel>[\s\S]*?\n\t\t\t\t\t<\/SidebarGroup>/,
			"",
		);
	next = next.replace(/\n{3,}/g, "\n\n");
	return writeIfChanged(file, text, next);
};

const stripRouteTree = async (root) => {
	const file = path.join(root, "apps/web/src/routeTree.gen.ts");
	const text = await readText(file);
	if (text === null) return false;
	let next = text.replace(/^import .+Eims.+\r?\n/gm, "");
	next = next.replace(
		/\nconst (?:Admin|Authenticated)Eims[A-Za-z]+Route\s*=\s*(?:\r?\n\s*)?(?:Admin|Authenticated)Eims[A-Za-z]+RouteImport\.update\(\{[\s\S]*?\} as any\)\r?\n/g,
		"\n",
	);
	next = next.replace(
		/\n    '\/(?:_authenticated\/)?eims[^']*': \{[\s\S]*?\n    \}/g,
		"",
	);
	next = next.replace(/\n    '\/admin\/eims[^']*': \{[\s\S]*?\n    \}/g, "");
	next = removeLineMatches(
		next,
		(line) =>
			line.includes("Eims") ||
			line.includes("'/eims") ||
			line.includes("'/admin/eims") ||
			line.includes("'/_authenticated/eims"),
	);
	next = next.replace(/\n{3,}/g, "\n\n");
	return writeIfChanged(file, text, next);
};

const stripLocales = async (root) => {
	let changed = false;
	for (const locale of ["en", "am"]) {
		const file = path.join(root, `apps/web/src/shared/i18n/locales/${locale}.ts`);
		const text = await readText(file);
		if (text === null) continue;
		const next = removeLineMatches(text, (line) => /\beims[A-Z]?\w*\s*:/.test(line));
		changed = (await writeIfChanged(file, text, next)) || changed;
	}
	return changed;
};

const stripPackageScripts = async (root) => {
	const hasEimsScript = (key, value) =>
		key.includes("eims") || value.includes("eims") || key.includes("phase0") || value.includes("phase0");

	const files = [
		"package.json",
		"apps/api/package.json",
		"apps/api-tests/package.json",
		"apps/e2e/package.json",
	].map((file) => path.join(root, file));

	let changed = false;
	for (const file of files) {
		changed = (await patchJsonFile(file, (json) => removeScripts(json, hasEimsScript))) || changed;
	}
	return changed;
};

const rewriteApiTestMocks = async (root) => {
	const withMockFile = path.join(root, "apps/api-tests/scripts/with-mock-api.mjs");
	const withMockText = await readText(withMockFile);
	let changed = false;
	if (withMockText !== null && withMockText.includes("createEimsMockApiServer")) {
		const next = `import http from "node:http";
import { spawn } from "node:child_process";

const mode = process.argv[2] ?? "http";
const requestedPort = Number(process.env.API_TEST_MOCK_PORT ?? 0);

const json = (res, status, body) => {
\tres.writeHead(status, { "content-type": "application/json" });
\tres.end(JSON.stringify(body));
};

const readBody = (req) =>
\tnew Promise((resolve) => {
\t\tlet body = "";
\t\treq.on("data", (chunk) => {
\t\t\tbody += chunk;
\t\t});
\t\treq.on("end", () => {
\t\t\ttry {
\t\t\t\tresolve(body ? JSON.parse(body) : {});
\t\t\t} catch {
\t\t\t\tresolve({});
\t\t\t}
\t\t});
\t});

const members = [
\t{ id: "member_owner", role: "owner", user: { email: "owner@example.com", name: "Owner" } },
\t{ id: "member_admin", role: "admin", user: { email: "manager@example.com", name: "Manager" } },
];
const invitations = [];
let orgSettings = { legalName: "Acme Inc", timezone: "Africa/Addis_Ababa", currencyCode: "ETB" };
let securitySettings = { require2fa: false, sessionTimeoutMinutes: 30 };
let billingVatRate = "15";

const server = http.createServer(async (req, res) => {
\tconst url = new URL(req.url ?? "/", "http://127.0.0.1");
\tconst method = req.method ?? "GET";

\tif (url.pathname.includes("__missing_api_test_route__")) return json(res, 404, { error: "not found" });
\tif (url.pathname.endsWith("/health")) return json(res, 200, { status: "ok" });
\tif (url.pathname.includes("/sign-in/email")) return json(res, 200, { data: { user: { id: "user_1" }, session: { id: "sess_1" } } });
\tif (url.pathname === "/api/auth/organization/set-active") return json(res, 200, { data: { ok: true } });

\tif (url.pathname === "/api/v1/team/members" && method === "GET") return json(res, 200, { data: members });
\tif (url.pathname === "/api/v1/team/invitations" && method === "POST") {
\t\tconst invite = { id: "inv_1", email: "new@example.com", acceptUrl: "/settings/members?invitationId=inv_1" };
\t\tinvitations.push(invite);
\t\treturn json(res, 200, { data: invite });
\t}
\tif (url.pathname === "/api/v1/team/invitations" && method === "GET") return json(res, 200, { data: invitations });
\tif (url.pathname.startsWith("/api/v1/team/invitations/") && method === "DELETE") return json(res, 200, { data: { ok: true } });
\tif (url.pathname.startsWith("/api/v1/team/members/") && ["PATCH", "DELETE"].includes(method)) return json(res, 403, { error: "owner protected" });

\tif (url.pathname === "/api/v1/organization-settings" && method === "GET") return json(res, 200, { data: orgSettings });
\tif (url.pathname === "/api/v1/organization-settings" && method === "PATCH") {
\t\torgSettings = { ...orgSettings, ...(await readBody(req)) };
\t\treturn json(res, 200, { data: orgSettings });
\t}
\tif (url.pathname === "/api/v1/security-settings" && method === "PATCH") {
\t\tsecuritySettings = { ...securitySettings, ...(await readBody(req)) };
\t\treturn json(res, 200, { data: securitySettings });
\t}

\tif (url.pathname === "/api/v1/admin/users" && method === "GET") {
\t\treturn json(res, 200, { data: [{ id: "admin_user_2", email: "manager@example.com", name: "Manager" }] });
\t}
\tif (url.pathname.endsWith("/force-password-reset") && method === "POST") return json(res, 200, { data: { ok: true } });
\tif (url.pathname === "/api/v1/admin/settings" && method === "GET") {
\t\treturn json(res, 200, { data: [{ key: "billing.vatRate", value: billingVatRate }, { key: "platform.supportEmail", value: "support@example.com" }] });
\t}
\tif (url.pathname === "/api/v1/admin/settings/billing.vatRate" && method === "PUT") {
\t\tbillingVatRate = (await readBody(req)).value ?? "16";
\t\treturn json(res, 200, { data: { key: "billing.vatRate", value: billingVatRate } });
\t}
\tif (url.pathname === "/api/v1/admin/settings/feature-flags") {
\t\treturn json(res, 200, { data: [{ name: "platform.webhooks", enabledGlobal: true }] });
\t}
\tif (url.pathname === "/api/v1/admin/organizations" && method === "GET") {
\t\treturn json(res, 200, { data: [{ id: "org_1", name: "Acme Inc", suspendedAt: null }] });
\t}
\tif (url.pathname === "/api/v1/admin/organizations/org_1/suspend" && method === "POST") {
\t\treturn json(res, 200, { data: { id: "org_1", suspendedAt: new Date().toISOString() } });
\t}
\tif (url.pathname === "/api/v1/admin/organizations/org_1/unsuspend" && method === "POST") {
\t\treturn json(res, 200, { data: { id: "org_1", suspendedAt: null } });
\t}
\tif (url.pathname === "/api/v1/admin/organizations/org_1" && method === "GET") {
\t\treturn json(res, 200, { data: { id: "org_1", name: "Acme Inc", suspendedAt: null } });
\t}

\tif (url.pathname === "/api/v1/billing/plans") return json(res, 200, { data: [] });
\tif (url.pathname === "/api/v1/billing/subscription") return json(res, 200, { data: { status: "active" } });
\tif (url.pathname === "/api/v1/billing/entitlements") return json(res, 200, { data: {} });
\tif (url.pathname === "/api/v1/billing/capabilities") return json(res, 200, { data: { "core.access": { enabled: true } } });
\tif (url.pathname.startsWith("/api/v1/billing/subscription/") && method === "POST") return json(res, 200, { data: { status: "active" } });

\treturn json(res, 200, { data: [] });
});

const run = (command, args, baseUrl) =>
\tnew Promise((resolve) => {
\t\tconst child = spawn(command, args, {
\t\t\tstdio: "inherit",
\t\t\tshell: process.platform === "win32",
\t\t\tenv: {
\t\t\t\t...process.env,
\t\t\t\tAPI_BASE_URL: baseUrl,
\t\t\t\tAPI_TEST_USES_MOCK_SERVER: "1",
\t\t\t\tBRUNO_BASE_URL: baseUrl,
\t\t\t\tOPENAPI_SPEC: "openapi/openapi-smoke.yaml",
\t\t\t},
\t\t});
\t\tchild.on("exit", (code) => resolve(code ?? 1));
\t\tchild.on("error", () => resolve(1));
\t});

server.listen(requestedPort, "127.0.0.1", async () => {
\tconst address = server.address();
\tconst port = typeof address === "object" && address ? address.port : requestedPort;
\tconst baseUrl = \`http://127.0.0.1:\${port}\`;
\tconst code = mode === "bruno"
\t\t? await run("node", ["scripts/run-bruno.mjs"], baseUrl)
\t\t: await run("playwright", ["test", "-c", "playwright.config.ts"], baseUrl);
\tserver.close(() => process.exit(code));
});
`;
		await fs.writeFile(withMockFile, next, "utf8");
		changed = true;
	}

	const brunoFile = path.join(root, "apps/api-tests/scripts/run-bruno.mjs");
	const brunoText = await readText(brunoFile);
	if (brunoText !== null && brunoText.includes("EIMS-Phase0")) {
		const next = brunoText.replace(
			/\r?\nconst eimsCode = await runCollection\("EIMS-Phase0"\);\r?\nprocess\.exit\(eimsCode\);/,
			"\nprocess.exit(0);",
		);
		changed = (await writeIfChanged(brunoFile, brunoText, next)) || changed;
	}

	const scaffoldMockSpec = path.join(root, "apps/api-tests/tests/scaffold-management-mock.spec.ts");
	const specText = await readText(scaffoldMockSpec);
	if (specText !== null && specText.includes("eims.enabled")) {
		const next = specText.replace("eims.enabled", "platform.webhooks");
		changed = (await writeIfChanged(scaffoldMockSpec, specText, next)) || changed;
	}

	return changed;
};

const stripEnvExamples = async (root) => {
	const files = [".env.example", ".env.production.example", "apps/api/.env.example", "apps/api/.env"].map((file) =>
		path.join(root, file),
	);
	let changed = false;
	for (const file of files) {
		const text = await readText(file);
		if (text === null) continue;
		const next = removeLineMatches(text, (line) => line.startsWith("EIMS_") || line.includes("EIMS /"));
		changed = (await writeIfChanged(file, text, next)) || changed;
	}
	return changed;
};

export const stripDomainStarterCode = async (root) => {
	let changed = 0;

	for (const rel of EIMS_PATHS) {
		const target = path.join(root, rel);
		if (await fs.pathExists(target)) {
			await fs.remove(target);
			changed += 1;
		}
	}

	for (const patcher of [
		stripPrismaEimsBlock,
		stripAppModule,
		stripPermissions,
		stripFeatureEntitlements,
		stripSidebar,
		stripAdminSidebar,
		stripRouteTree,
		stripLocales,
		stripPackageScripts,
		rewriteApiTestMocks,
		stripEnvExamples,
	]) {
		if (await patcher(root)) changed += 1;
	}

	return changed;
};
