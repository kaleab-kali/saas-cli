import { existsSync, readFileSync, rmSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { addStarterPack } from "../../packages/cli/src/module-generator.js";
import { scaffold } from "../../packages/cli/src/scaffold.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const generatedRoot =
	process.env.EIMS_GENERATED_PROJECT_ROOT ?? path.join(os.tmpdir(), "vyllion-eims-scaffold-proof");
const shouldGenerateProject = !process.env.EIMS_GENERATED_PROJECT_ROOT;
const mockPort = Number(process.env.EIMS_SCAFFOLD_MOCK_PORT ?? 0);
let baseUrl = "";

const requiredDirs = [
	"apps/api/src/modules/eims/admin/application",
	"apps/api/src/modules/eims/admin/domain",
	"apps/api/src/modules/eims/admin/infrastructure",
	"apps/api/src/modules/eims/admin/presentation",
	"apps/api/src/modules/eims/compliance/application",
	"apps/api/src/modules/eims/compliance/domain",
	"apps/api/src/modules/eims/compliance/infrastructure",
	"apps/api/src/modules/eims/compliance/presentation",
	"apps/api/src/modules/eims/receipts/application",
	"apps/api/src/modules/eims/receipts/domain",
	"apps/api/src/modules/eims/receipts/infrastructure",
	"apps/api/src/modules/eims/receipts/presentation",
	"apps/api/src/modules/eims/setup/application/commands",
	"apps/api/src/modules/eims/setup/application/dto",
	"apps/api/src/modules/eims/setup/application/queries",
	"apps/api/src/modules/eims/setup/domain",
	"apps/api/src/modules/eims/setup/infrastructure/repositories",
	"apps/api/src/modules/eims/setup/presentation",
	"apps/api/src/modules/eims/shared/client",
	"apps/api/src/modules/eims/shared/callbacks",
	"apps/api/src/modules/eims/shared/canonicalization",
	"apps/api/src/modules/eims/shared/constants",
	"apps/api/src/modules/eims/shared/crypto",
	"apps/api/src/modules/eims/shared/errors",
	"apps/api/src/modules/eims/shared/lookups",
	"apps/api/src/modules/eims/shared/mock",
	"apps/api/src/modules/eims/shared/notifications",
	"apps/api/src/modules/eims/shared/offline",
	"apps/api/src/modules/eims/shared/presentation",
	"apps/api/src/modules/eims/shared/printing",
	"apps/api/src/modules/eims/shared/queues",
	"apps/api/src/modules/eims/shared/schemas",
	"apps/api/src/modules/eims/shared/signing",
	"apps/api/src/modules/eims/submission/application",
	"apps/api/src/modules/eims/submission/domain",
	"apps/api/src/modules/eims/submission/infrastructure",
	"apps/api/src/modules/eims/submission/presentation",
	"apps/api/src/modules/invoicing/domain",
	"apps/web/src/features/eims/api",
	"apps/web/src/features/eims/components",
	"apps/web/src/routes/_authenticated/eims",
	"apps/web/src/routes/admin/eims",
	"apps/api-tests/bruno/EIMS-Phase0",
	"apps/api-tests/tests",
	"apps/e2e/tests",
];

const requiredFiles = [
	"apps/api/src/modules/eims/eims.module.ts",
	"apps/api/src/modules/eims/shared/client/eims-external-client.ts",
	"apps/api/src/modules/eims/shared/client/eims-sdk-client.provider.ts",
	"apps/api/src/modules/eims/shared/client/eims-sdk-client.provider.spec.ts",
	"apps/api/src/modules/eims/shared/client/eims-sdk-external.client.ts",
	"apps/api/src/modules/eims/shared/client/eims-sdk-external.client.spec.ts",
	"apps/api/src/modules/eims/shared/client/mock-eims-external.client.ts",
	"apps/api/src/modules/eims/shared/callbacks/eims-bulk-callback.controller.ts",
	"apps/api/src/modules/eims/shared/callbacks/eims-bulk-callback.service.ts",
	"apps/api/src/modules/eims/shared/callbacks/eims-bulk-callback.service.spec.ts",
	"apps/api/src/modules/eims/shared/constants/eims-lookup-values.ts",
	"apps/api/src/modules/eims/shared/crypto/eims-credential-persistence.service.ts",
	"apps/api/src/modules/eims/shared/crypto/eims-credential-persistence.service.spec.ts",
	"apps/api/src/modules/eims/shared/crypto/eims-credential-secret.service.ts",
	"apps/api/src/modules/eims/shared/crypto/eims-credential-secret.service.spec.ts",
	"apps/api/src/modules/eims/shared/lookups/eims-lookup.service.spec.ts",
	"apps/api/src/modules/eims/shared/offline/eims-offline-pending-sync-cache.service.ts",
	"apps/api/src/modules/eims/shared/offline/eims-offline-pending-sync-cache.service.spec.ts",
	"apps/api/src/modules/eims/shared/printing/eims-print-proof.service.ts",
	"apps/api/src/modules/eims/shared/printing/eims-print-proof.service.spec.ts",
	"apps/api/src/modules/eims/shared/queues/eims-submission-queue.service.ts",
	"apps/api/src/modules/eims/shared/queues/eims-submission-queue.service.spec.ts",
	"apps/api/src/modules/eims/setup/presentation/eims-setup.controller.ts",
	"apps/api/src/modules/eims/submission/presentation/eims-submission.controller.ts",
	"apps/api/src/modules/eims/receipts/presentation/eims-receipts.controller.ts",
	"apps/api/src/modules/eims/compliance/presentation/eims-compliance.controller.ts",
	"apps/api/src/modules/eims/admin/presentation/eims-admin.controller.ts",
	"apps/api/src/modules/eims/shared/presentation/eims-supporting-resources.controller.ts",
	"apps/api/src/modules/invoicing/domain/canonical-invoice.ts",
	"apps/api-tests/bruno/EIMS-Phase0/01-overview.bru",
	"apps/api-tests/bruno/EIMS-Phase0/02-lookups.bru",
	"apps/api-tests/bruno/EIMS-Phase0/03-submit-invoice.bru",
	"apps/api-tests/bruno/EIMS-Phase0/04-receipts.bru",
	"apps/api-tests/bruno/EIMS-Phase0/05-compliance.bru",
	"apps/api-tests/bruno/EIMS-Phase0/06-admin-overview.bru",
	"apps/api-tests/bruno/EIMS-Phase0/collection.bru",
	"apps/api-tests/scripts/eims-mock-api-server.mjs",
	"apps/api-tests/tests/eims-v3-mock.spec.ts",
	"apps/acceptance/features/eims.feature",
	"apps/acceptance/steps/eims.steps.mjs",
	"apps/e2e/tests/eims-mock.spec.ts",
	"apps/performance/k6/eims-submit.js",
	"apps/performance/scripts/eims-mock-load.mjs",
	"apps/security/scripts/eims-security-smoke.mjs",
	"apps/api/prisma/seed-eims-onboarding-template.ts",
	"apps/api/prisma/eims-rls-policies.sql",
	"apps/api/prisma/eims-audit-hash-chain.sql",
];

const requiredPrismaModels = [
	"model EimsEnterprise",
	"model EimsEstablishment",
	"model EimsSourceSystem",
	"model EimsCredential",
	"model EimsCertificate",
	"model EimsSourceSystemCounter",
	"model EimsCounterReservation",
	"model UserEstablishmentAssignment",
	"model UserSourceSystemAssignment",
	"model TenantBuyer",
	"model TaxInvoice",
	"model TaxInvoiceLine",
	"model EimsSubmission",
	"model EimsReceipt",
	"model EimsCancellation",
	"model EimsAuditEvent",
	"model EimsNotificationLog",
];

const expectedLookups = {
	"document-types": ["INV", "CRE", "DEB", "INT", "RTN", "FIN", "MIX", "INC", "PRF", "OVD"],
	"transaction-types": ["B2B", "B2C", "B2G", "G2B", "G2C"],
	"source-system-types": ["POS", "ERP", "CRM", "SYS", "MAN", "EFD"],
	"cancellation-reasons": ["1", "2", "3", "4", "6"],
	"tax-codes": ["VAT15", "VAT0", "VATEX", "TOT2", "TOT10", "EXC5", "EXC10"],
	"payment-modes": ["CASH", "CHEQUE", "CPO", "Local Bank Transfer", "SWIFT", "Wire Transfer"],
	units: ["PCS", "KG", "L", "SVC", "NT"],
	"nature-of-supply": ["Goods", "Service"],
	regions: ["14", "15", "4"],
};

const checks = [];

function pass(name) {
	checks.push({ name, ok: true });
}

function fail(name, detail) {
	throw new Error(`${name}: ${detail}`);
}

function assert(condition, name, detail = "assertion failed") {
	if (!condition) fail(name, detail);
	pass(name);
}

function readProjectFile(relPath) {
	return readFileSync(path.join(generatedRoot, relPath), "utf8");
}

function assertPathExists(relPath) {
	assert(existsSync(path.join(generatedRoot, relPath)), `path exists: ${relPath}`);
}

async function ensureGeneratedProject() {
	if (!shouldGenerateProject) return;

	rmSync(generatedRoot, { force: true, recursive: true });
	await scaffold({
		templateDir: path.join(repoRoot, "template"),
		targetDir: generatedRoot,
		tokens: {
			projectName: "Vyllion EIMS Scaffold Proof",
			projectSlug: "vyllion-eims-scaffold-proof",
			dbName: "vyllion_eims_scaffold_proof_dev",
			superAdminEmail: "admin@example.com",
			superAdminPassword: "Admin!234567890",
			ownerEmail: "owner@example.com",
			ownerPassword: "Owner!234567890",
			authSecret: "a".repeat(64),
			masterKey: "b".repeat(64),
			caddyDomain: "localhost",
		},
		actions: {
			afterTemplate: async (createdDir) => {
				await addStarterPack({ cwd: createdDir, starterName: "eims" });
			},
		},
	});
}

async function getJson(route) {
	const response = await fetch(`${baseUrl}${route}`);
	const body = await response.json();
	return { response, body };
}

async function postJson(route, data) {
	const response = await fetch(`${baseUrl}${route}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(data),
	});
	const body = await response.json();
	return { response, body };
}

function waitForServer() {
	return new Promise((resolve, reject) => {
		const startedAt = Date.now();
		const check = () => {
			const req = http.get(`${baseUrl}/health`, (res) => {
				res.resume();
				if (res.statusCode === 200) resolve();
				else retry();
			});
			req.on("error", retry);
			function retry() {
				if (Date.now() - startedAt > 15_000) reject(new Error("mock API server did not become ready"));
				else setTimeout(check, 250);
			}
		};
		check();
	});
}

async function startMockApi() {
	const serverModule = await import(
		pathToFileURL(path.join(generatedRoot, "apps/api-tests/scripts/eims-mock-api-server.mjs")).href
	);
	const server = serverModule.createEimsMockApiServer();
	await new Promise((resolve) => {
		server.listen(mockPort, "127.0.0.1", resolve);
	});
	const address = server.address();
	const actualPort = typeof address === "object" && address ? address.port : mockPort;
	baseUrl = `http://127.0.0.1:${actualPort}`;
	return server;
}

function assertGeneratedStructure() {
	assert(existsSync(generatedRoot), "generated project exists", generatedRoot);
	for (const dir of requiredDirs) assertPathExists(dir);
	for (const file of requiredFiles) assertPathExists(file);

	const appModule = readProjectFile("apps/api/src/app.module.ts");
	assert(appModule.includes("import { EimsModule }"), "API app imports EimsModule");
	assert(appModule.includes("import { InvoicingModule }"), "API app imports InvoicingModule");
	assert(appModule.includes("EimsModule,"), "API app registers EimsModule");
	assert(appModule.includes("InvoicingModule,"), "API app registers InvoicingModule");

	const packageJson = JSON.parse(readProjectFile("package.json"));
	const productionEnvExample = readProjectFile(".env.production.example");
	assert(packageJson.scripts["test:eims:mock"]?.includes("test:eims:ui"), "generated package has full EIMS mock gate");
	assert(
		packageJson.scripts["test:eims:local"]?.includes("eims-credential-secret.service.spec.ts"),
		"generated EIMS local test gate includes credential encryption tests",
	);
	assert(
		packageJson.scripts["test:eims:local"]?.includes("eims-credential-persistence.service.spec.ts"),
		"generated EIMS local test gate includes credential persistence tests",
	);
	assert(
		packageJson.scripts["test:eims:local"]?.includes("eims-sdk-external.client.spec.ts"),
		"generated EIMS local test gate includes SDK adapter tests",
	);
	assert(
		packageJson.scripts["test:eims:local"]?.includes("eims-sdk-client.provider.spec.ts"),
		"generated EIMS local test gate includes SDK package provider tests",
	);
	assert(
		packageJson.scripts["test:eims:local"]?.includes("eims-bulk-callback.service.spec.ts"),
		"generated EIMS local test gate includes bulk callback security tests",
	);
	assert(
		packageJson.scripts["test:eims:local"]?.includes("eims-offline-pending-sync-cache.service.spec.ts"),
		"generated EIMS local test gate includes offline cache tests",
	);
	assert(
		packageJson.scripts["test:eims:local"]?.includes("eims-lookup.service.spec.ts"),
		"generated EIMS local test gate includes lookup cache tests",
	);
	assert(
		packageJson.scripts["test:eims:local"]?.includes("eims-print-proof.service.spec.ts"),
		"generated EIMS local test gate includes print proof tests",
	);
	assert(
		packageJson.scripts["test:eims:local"]?.includes("eims-submission-queue.service.spec.ts"),
		"generated EIMS local test gate includes queue coordinator tests",
	);
	assert(packageJson.scripts["test:eims:api"]?.includes("api-tests"), "generated package has EIMS API tests");
	assert(
		packageJson.scripts["test:eims:security"] === "pnpm --filter security test:eims",
		"generated package has EIMS security smoke command",
	);
	assert(
		packageJson.scripts["test:eims:performance"] === "pnpm --filter performance test:eims",
		"generated package has EIMS performance smoke command",
	);
	assert(
		packageJson.scripts["test:eims:acceptance"] === "pnpm --filter acceptance test:eims",
		"generated package has EIMS acceptance command",
	);
	assert(
		packageJson.scripts["test:eims:mock"]?.includes("test:eims:security"),
		"generated EIMS mock gate includes security smoke",
	);
	assert(
		packageJson.scripts["test:eims:mock"]?.includes("test:eims:performance"),
		"generated EIMS mock gate includes performance smoke",
	);
	assert(
		packageJson.scripts["test:eims:mock"]?.includes("test:eims:acceptance"),
		"generated EIMS mock gate includes acceptance coverage",
	);
	const scaffoldState = JSON.parse(readProjectFile(".scaffold-state.json"));
	const eimsStarter = scaffoldState.starters?.find((starter) => starter.name === "eims");
	assert(eimsStarter, "scaffold state records EIMS starter installation");
	assert(eimsStarter.envVars?.includes("EIMS_ENV"), "scaffold state records EIMS env metadata");
	assert(eimsStarter.envVars?.includes("EIMS_SDK_PACKAGE_NAME"), "scaffold state records EIMS SDK package env metadata");
	assert(eimsStarter.envVars?.includes("EIMS_TIMEOUT_MS"), "scaffold state records EIMS SDK timeout env metadata");
	assert(eimsStarter.envVars?.includes("EIMS_MAX_RETRIES"), "scaffold state records EIMS SDK retry env metadata");
	assert(eimsStarter.envVars?.includes("EIMS_PHASE0_STRICT"), "scaffold state records EIMS strict-mode env metadata");
	assert(eimsStarter.envVars?.includes("EIMS_CALLBACK_HMAC_SECRET"), "scaffold state records EIMS callback HMAC env metadata");
	assert(eimsStarter.envVars?.includes("EIMS_LOOKUP_CACHE_TTL_SECONDS"), "scaffold state records EIMS lookup cache env metadata");
	assert(eimsStarter.routes?.includes("/eims/setup"), "scaffold state records EIMS route metadata");
	assert(eimsStarter.models?.includes("EimsCredential"), "scaffold state records EIMS model metadata");
	assert(eimsStarter.permissions?.includes("eims-submission:*"), "scaffold state records EIMS permission metadata");
	assert(eimsStarter.seedData?.includes("eims-entitlements"), "scaffold state records EIMS seed metadata");
	assert(eimsStarter.queues?.includes("eims-submission-retry"), "scaffold state records EIMS queue metadata");
	assert(eimsStarter.crons?.includes("certificate-expiry-daily"), "scaffold state records EIMS cron metadata");
	assert(eimsStarter.dependencies?.["@yourcompany/eims-sdk"], "scaffold state records EIMS SDK dependency metadata");
	const apiPackageJson = JSON.parse(readProjectFile("apps/api/package.json"));
	assert(
		apiPackageJson.scripts?.["db:seed"]?.includes("seed-eims-onboarding-template.ts"),
		"EIMS db seed installs onboarding task template",
	);
	const apiTestsPackageJson = JSON.parse(readProjectFile("apps/api-tests/package.json"));
	assert(
		apiTestsPackageJson.scripts?.["test:eims:mock"]?.includes("eims-http"),
		"EIMS API mock test script is installed",
	);
	assert(productionEnvExample.includes("EIMS_ENV=production"), "EIMS production env example defaults to production");
	assert(
		productionEnvExample.includes("EIMS_SDK_PACKAGE_NAME=@yourcompany/eims-sdk"),
		"EIMS production env example names the SDK package",
	);
	assert(productionEnvExample.includes("EIMS_TIMEOUT_MS=30000"), "EIMS production env example configures SDK timeout");
	assert(productionEnvExample.includes("EIMS_MAX_RETRIES=3"), "EIMS production env example configures SDK retries");
	assert(productionEnvExample.includes("EIMS_MOCK_MODE=false"), "EIMS production env example disables mock mode");
	assert(productionEnvExample.includes("EIMS_SIGNING_PROVIDER=vault"), "EIMS production env example uses non-local signing");
	assert(productionEnvExample.includes("EIMS_PHASE0_STRICT=true"), "EIMS production env example enables Phase 0 strict mode");
	assert(productionEnvExample.includes("EIMS_CALLBACK_HMAC_SECRET="), "EIMS production env example documents callback HMAC secret");
	const webPackageJson = JSON.parse(readProjectFile("apps/web/package.json"));
	assert(webPackageJson.scripts?.lint === "biome check .", "web workspace lint uses Biome");
	assert(webPackageJson.scripts?.format === "biome check --write .", "web workspace format uses Biome");
	const acceptancePackageJson = JSON.parse(readProjectFile("apps/acceptance/package.json"));
	assert(
		acceptancePackageJson.scripts?.["test:eims"]?.includes("features/eims.feature"),
		"EIMS acceptance feature script is installed",
	);
	const eimsAcceptanceSteps = readProjectFile("apps/acceptance/steps/eims.steps.mjs");
	assert(eimsAcceptanceSteps.includes("source system counter"), "EIMS acceptance steps verify source counter chain");
	const performancePackageJson = JSON.parse(readProjectFile("apps/performance/package.json"));
	assert(
		performancePackageJson.scripts?.["test:eims"] === "node scripts/eims-mock-load.mjs",
		"EIMS performance smoke script is installed",
	);
	assert(
		performancePackageJson.scripts?.["test:eims:k6"]?.includes("k6/eims-submit.js"),
		"EIMS k6 scenario script is installed",
	);
	const eimsPerformanceSmoke = readProjectFile("apps/performance/scripts/eims-mock-load.mjs");
	assert(
		eimsPerformanceSmoke.includes("EIMS performance smoke:"),
		"EIMS performance smoke reports request/error/latency metrics",
	);
	assert(
		eimsPerformanceSmoke.includes("/api/v1/eims/submissions"),
		"EIMS performance smoke exercises invoice submission endpoints",
	);
	assert(
		eimsPerformanceSmoke.includes("/api/v1/eims/bulk/reconcile"),
		"EIMS performance smoke exercises bulk reconciliation",
	);
	const eimsK6 = readProjectFile("apps/performance/k6/eims-submit.js");
	assert(eimsK6.includes("http_req_failed"), "EIMS k6 scenario enforces error-rate threshold");
	assert(eimsK6.includes("http_req_duration"), "EIMS k6 scenario enforces latency threshold");
	const e2ePackageJson = JSON.parse(readProjectFile("apps/e2e/package.json"));
	assert(e2ePackageJson.scripts?.["test:eims"]?.includes("playwright.eims.config.ts"), "EIMS e2e test script is installed");
	const securityPackageJson = JSON.parse(readProjectFile("apps/security/package.json"));
	assert(
		securityPackageJson.scripts?.["test:eims"] === "node scripts/eims-security-smoke.mjs",
		"EIMS security smoke script is installed",
	);
	const eimsSecuritySmoke = readProjectFile("apps/security/scripts/eims-security-smoke.mjs");
	assert(!eimsSecuritySmoke.includes("add secret redaction"), "EIMS security smoke is not a placeholder");
	assert(
		eimsSecuritySmoke.includes("EIMS credential APIs must explicitly report secrets as redacted"),
		"EIMS security smoke enforces credential redaction",
	);
	assert(
		eimsSecuritySmoke.includes("EIMS credential rotation must require rotate permission"),
		"EIMS security smoke enforces credential rotation permission",
	);
	assert(
		eimsSecuritySmoke.includes("EIMS credential persistence must create durable rows"),
		"EIMS security smoke enforces durable credential persistence",
	);
	assert(
		eimsSecuritySmoke.includes("EIMS SDK adapter must submit invoices through the SDK"),
		"EIMS security smoke enforces SDK adapter integration boundary",
	);
	assert(
		eimsSecuritySmoke.includes("EIMS bulk reconcile must require retry permission"),
		"EIMS security smoke enforces bulk reconcile permission",
	);
	assert(
		eimsSecuritySmoke.includes("EIMS bulk callbacks must require an HMAC secret"),
		"EIMS security smoke enforces bulk callback HMAC verification",
	);
	assert(
		eimsSecuritySmoke.includes("EIMS acceptance cases must stay admin-only"),
		"EIMS security smoke enforces admin-only acceptance cases",
	);
	assert(eimsSecuritySmoke.includes("must enable RLS"), "EIMS security smoke enforces RLS policy coverage");
	assert(eimsSecuritySmoke.includes("must block deletes"), "EIMS security smoke enforces audit immutability");
	const eimsPhase0Runbook = readProjectFile("docs/EIMS_PHASE0_RUNBOOK.md");
	assert(eimsPhase0Runbook.includes("pnpm doctor:production"), "EIMS runbook documents production doctor gate");
	assert(eimsPhase0Runbook.includes("Phase 0 strict mode"), "EIMS runbook documents strict production readiness");
	const eimsTenantOnboardingGuide = readProjectFile("docs/EIMS_TENANT_ONBOARDING.md");
	assert(eimsTenantOnboardingGuide.includes("concierge launch console"), "EIMS tenant guide names onboarding as primary launch UI");

	const appSidebar = readProjectFile("apps/web/src/components/layout/AppSidebar.tsx");
	assert(appSidebar.includes('labelKey: "sidebar.eims"'), "tenant sidebar includes EIMS navigation group");
	assert(appSidebar.includes('labelKey: "sidebar.eimsStatus"'), "tenant sidebar exposes EIMS status child route");
	assert(appSidebar.includes('labelKey: "sidebar.eimsExports"'), "tenant sidebar exposes records export child route");
	assert(appSidebar.includes("FileValidationIcon"), "tenant sidebar uses a tax/compliance icon for EIMS");
	assert(appSidebar.includes("EIMS tax workspace"), "tenant shell is visibly EIMS-specific after installing the starter");
	assert(appSidebar.includes("Tax launch status"), "tenant shell launch panel changes for EIMS installs");
	assert(appSidebar.includes("EIMS setup active"), "tenant shell status panel names the EIMS setup");
	assert(appSidebar.includes("Start in onboarding"), "tenant shell keeps onboarding as the primary EIMS launch surface");
	const adminSidebar = readProjectFile("apps/web/src/components/layout/AdminSidebar.tsx");
	assert(adminSidebar.includes("const EIMS_ADMIN_NAV"), "admin sidebar includes EIMS operations group");
	assert(adminSidebar.includes('admin.nav.eimsOperations'), "admin sidebar exposes EIMS operations label");
	assert(adminSidebar.includes("EIMS operations focus"), "admin shell is visibly EIMS-specific after installing the starter");
	assert(adminSidebar.includes("EIMS tenant launch queue"), "admin shell status panel names the EIMS queue");
	const rootRoute = readProjectFile("apps/web/src/routes/index.tsx");
	assert(rootRoute.includes('return <Navigate to="/onboarding" />;'), "EIMS starter keeps concierge onboarding as the authenticated landing page");
	const eimsBrowserSpec = readProjectFile("apps/e2e/tests/eims-mock.spec.ts");
	assert(
		eimsBrowserSpec.includes("authenticated landing page opens the concierge onboarding console"),
		"EIMS browser smoke verifies the authenticated landing page opens onboarding",
	);
	const eimsMockServer = readProjectFile("apps/api-tests/scripts/eims-mock-api-server.mjs");
	assert(eimsMockServer.includes("/api/v1/onboarding"), "EIMS mock server supports onboarding landing data");
	assert(eimsMockServer.includes("/api/v1/notifications/stream"), "EIMS mock server supports notification SSE stream");
	const englishLocale = readProjectFile("apps/web/src/shared/i18n/locales/en.ts");
	assert(englishLocale.includes('eims: "Tax tools"'), "tenant EIMS nav is business-facing");
	assert(englishLocale.includes('eimsCancellations: "Cancellations"'), "tenant EIMS nav labels include cancellations");
	assert(englishLocale.includes('eimsOperations: "EIMS operations"'), "admin EIMS nav labels are installed");
	const tenantPages = readProjectFile("apps/web/src/features/eims/components/eims-tenant-pages.tsx");
	assert(tenantPages.includes("Ethiopia tax workspace"), "tenant EIMS UI has a domain-specific workspace header");
	assert(tenantPages.includes("EIMS compliance dashboard"), "tenant EIMS status page is the compliance dashboard");
	assert(tenantPages.includes("Compliance command center"), "tenant EIMS dashboard has the compliance command center");
	assert(tenantPages.includes("Submissions this month"), "tenant EIMS dashboard tracks monthly submission volume");
	assert(tenantPages.includes("Failed submissions"), "tenant EIMS dashboard surfaces failed submissions");
	assert(tenantPages.includes("Certificate expiry"), "tenant EIMS dashboard surfaces certificate expiry risk");
	assert(tenantPages.includes("Cancellation rate"), "tenant EIMS dashboard tracks cancellation rate");
	assert(tenantPages.includes("Buyer registry coverage"), "tenant EIMS dashboard tracks buyer registry coverage");
	assert(tenantPages.includes("EIMS setup path"), "tenant EIMS UI has the guided six-step setup path");
	assert(tenantPages.includes("EIMS six-step launch wizard"), "tenant EIMS setup page has explicit launch wizard UI");
	assert(tenantPages.includes("MoR/INSA launch wizard"), "tenant EIMS setup page is visibly authority-specific");
	assert(tenantPages.includes("Authority handoff packet"), "tenant EIMS setup page tracks authority handoff artifacts");
	assert(
		tenantPages.includes("Test invoice IRN and first live invoice"),
		"tenant EIMS setup page gates go-live on controlled test proof",
	);
	assert(tenantPages.includes("Concierge onboarding cockpit"), "tenant EIMS UI exposes concierge onboarding cockpit");
	assert(tenantPages.includes("MoR and INSA launch control"), "tenant EIMS UI names the MoR/INSA launch flow");
	assert(tenantPages.includes("Launch gate timeline"), "tenant EIMS UI shows launch gates from intake to live invoices");
	assert(tenantPages.includes("Operational launch board"), "tenant EIMS status page has a launch-focused workflow panel");
	assert(tenantPages.includes("Open launch console"), "tenant EIMS UI links back to the concierge onboarding console");
	assert(
		tenantPages.includes("15-step MoR/INSA launch timeline"),
		"tenant EIMS UI shows the full MoR/INSA launch timeline",
	);
	assert(tenantPages.includes("First live invoice"), "tenant EIMS timeline includes the production launch checkpoint");
	assert(tenantPages.includes("Current staff handoff"), "tenant EIMS setup page has a concierge handoff panel");
	assert(tenantPages.includes("Tenant handoff dossier"), "tenant EIMS setup page keeps tenant blockers visible");
	assert(tenantPages.includes("SharedDataTable"), "tenant EIMS pages use the shared DataTable surface");
	assert(!tenantPages.includes("@/components/ui/table"), "tenant EIMS pages do not use raw table primitives");
	const adminPages = readProjectFile("apps/web/src/features/eims/components/eims-admin-pages.tsx");
	assert(adminPages.includes("Platform EIMS command center"), "admin EIMS UI has an operations command header");
	assert(adminPages.includes("Concierge launch operations"), "admin EIMS UI exposes concierge launch operations");
	assert(adminPages.includes("MoR/INSA queue"), "admin EIMS UI separates MoR and INSA launch queues");
	assert(adminPages.includes("MoR/INSA authority desk"), "admin EIMS UI exposes authority blocker operations");
	assert(adminPages.includes("Cross-tenant launch blockers"), "admin EIMS UI highlights cross-tenant blockers");
	assert(adminPages.includes("15-step EIMS launch queue"), "admin EIMS UI shows the full launch queue timeline");
	assert(adminPages.includes("Start EIMS onboarding"), "admin EIMS UI can start the onboarding workflow");
	assert(adminPages.includes("Open onboarding queue"), "admin EIMS UI links to the base onboarding queue");
	assert(adminPages.includes("MoR and INSA operator timeline"), "admin EIMS UI names the authority operator timeline");
	assert(adminPages.includes("Controlled invoice proof lane"), "admin EIMS UI names the controlled invoice proof lane");
	assert(adminPages.includes("MoR test environment"), "admin EIMS UI labels MoR test connectivity without sandbox jargon");
	assert(!adminPages.includes("sandbox proof"), "admin EIMS UI avoids old sandbox proof wording");
	assert(adminPages.includes("SharedDataTable"), "admin EIMS pages use the shared DataTable surface");
	assert(!adminPages.includes("@/components/ui/table"), "admin EIMS pages do not use raw table primitives");
	const permissions = readProjectFile("apps/api/src/modules/auth/permissions.ts");
	assert((permissions.match(/^\tinvoice:/gm) ?? []).length === 5, "EIMS permissions do not duplicate invoice keys");
	assert(
		(permissions.match(/invoice: \["create", "read", "update-draft", "submit", "verify", "cancel", "export"\]/g) ?? [])
			.length === 3,
		"EIMS owner/admin/statement invoice permissions include draft updates",
	);

	const prismaSchema = readProjectFile("apps/api/prisma/schema.prisma");
	const eimsRlsPolicies = readProjectFile("apps/api/prisma/eims-rls-policies.sql");
	const eimsAuditHashChain = readProjectFile("apps/api/prisma/eims-audit-hash-chain.sql");
	for (const modelName of requiredPrismaModels) {
		assert(prismaSchema.includes(modelName), `Prisma contains ${modelName}`);
	}
	assert(prismaSchema.includes("rotationRevision"), "Prisma EimsCredential stores rotation revisions");
	assert(prismaSchema.includes("rotationEvidenceSha256"), "Prisma EimsCredential stores rotation evidence hashes");
	assert(
		prismaSchema.includes("@@unique([organizationId, sourceSystemId, environment])"),
		"Prisma EimsCredential enforces one credential per source environment",
	);
	for (const tableName of [
		"eims_enterprise",
		"eims_establishment",
		"eims_source_system",
		"eims_credential",
		"eims_certificate",
		"eims_source_system_counter",
		"eims_counter_reservation",
		"user_establishment_assignment",
		"user_source_system_assignment",
		"tenant_buyer",
		"tax_invoice",
		"tax_invoice_line",
		"eims_submission",
		"eims_receipt",
		"eims_cancellation",
		"eims_audit_event",
		"eims_notification_log",
	]) {
		assert(
			eimsRlsPolicies.includes(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`),
			`EIMS RLS enables ${tableName}`,
		);
		assert(eimsRlsPolicies.includes(`ALTER TABLE ${tableName} FORCE ROW LEVEL SECURITY`), `EIMS RLS forces ${tableName}`);
	}
	assert(eimsRlsPolicies.includes("app.current_organization_id"), "EIMS RLS policies bind to app tenant context");
	assert(eimsRlsPolicies.includes("WITH CHECK"), "EIMS RLS policies protect tenant-scoped writes");
	assert(eimsAuditHashChain.includes("CREATE EXTENSION IF NOT EXISTS pgcrypto"), "EIMS audit hash chain enables pgcrypto");
	assert(eimsAuditHashChain.includes("trg_eims_audit_hash_chain"), "EIMS audit hash chain installs insert trigger");
	assert(eimsAuditHashChain.includes("FOR UPDATE"), "EIMS audit hash chain locks prior event hash");
	assert(eimsAuditHashChain.includes("BEFORE UPDATE ON eims_audit_event"), "EIMS audit hash chain blocks updates");
	assert(eimsAuditHashChain.includes("BEFORE DELETE ON eims_audit_event"), "EIMS audit hash chain blocks deletes");
	const queueService = readProjectFile("apps/api/src/modules/eims/shared/queues/eims-submission-queue.service.ts");
	const queueSpec = readProjectFile("apps/api/src/modules/eims/shared/queues/eims-submission-queue.service.spec.ts");
	const submissionService = readProjectFile("apps/api/src/modules/eims/submission/application/eims-submission.service.ts");
	const externalClient = readProjectFile("apps/api/src/modules/eims/shared/client/eims-external-client.ts");
	const sdkClientProvider = readProjectFile("apps/api/src/modules/eims/shared/client/eims-sdk-client.provider.ts");
	const sdkClientProviderSpec = readProjectFile("apps/api/src/modules/eims/shared/client/eims-sdk-client.provider.spec.ts");
	const sdkExternalClient = readProjectFile("apps/api/src/modules/eims/shared/client/eims-sdk-external.client.ts");
	const sdkExternalClientSpec = readProjectFile("apps/api/src/modules/eims/shared/client/eims-sdk-external.client.spec.ts");
	const eimsSharedModule = readProjectFile("apps/api/src/modules/eims/shared/eims-shared.module.ts");
	const lookupService = readProjectFile("apps/api/src/modules/eims/shared/lookups/eims-lookup.service.ts");
	const lookupController = readProjectFile("apps/api/src/modules/eims/shared/lookups/eims-lookup.controller.ts");
	const lookupServiceSpec = readProjectFile("apps/api/src/modules/eims/shared/lookups/eims-lookup.service.spec.ts");
	const bulkCallbackService = readProjectFile("apps/api/src/modules/eims/shared/callbacks/eims-bulk-callback.service.ts");
	const bulkCallbackController = readProjectFile("apps/api/src/modules/eims/shared/callbacks/eims-bulk-callback.controller.ts");
	const bulkCallbackSpec = readProjectFile("apps/api/src/modules/eims/shared/callbacks/eims-bulk-callback.service.spec.ts");
	const credentialPersistence = readProjectFile(
		"apps/api/src/modules/eims/shared/crypto/eims-credential-persistence.service.ts",
	);
	const credentialPersistenceSpec = readProjectFile(
		"apps/api/src/modules/eims/shared/crypto/eims-credential-persistence.service.spec.ts",
	);
	const credentialSecrets = readProjectFile("apps/api/src/modules/eims/shared/crypto/eims-credential-secret.service.ts");
	const credentialSecretsSpec = readProjectFile(
		"apps/api/src/modules/eims/shared/crypto/eims-credential-secret.service.spec.ts",
	);
	const offlineCache = readProjectFile("apps/api/src/modules/eims/shared/offline/eims-offline-pending-sync-cache.service.ts");
	const offlineCacheSpec = readProjectFile(
		"apps/api/src/modules/eims/shared/offline/eims-offline-pending-sync-cache.service.spec.ts",
	);
	const printProof = readProjectFile("apps/api/src/modules/eims/shared/printing/eims-print-proof.service.ts");
	const printProofSpec = readProjectFile("apps/api/src/modules/eims/shared/printing/eims-print-proof.service.spec.ts");
	const supportingResourcesController = readProjectFile(
		"apps/api/src/modules/eims/shared/presentation/eims-supporting-resources.controller.ts",
	);
	assert(queueService.includes("enqueueInvoice"), "EIMS queue service exposes invoice enqueue boundary");
	assert(queueService.includes("previousIrn"), "EIMS queue service carries previous IRN chain metadata");
	assert(queueService.includes("lastAcceptedCounter"), "EIMS queue service tracks accepted counter state");
	assert(queueService.includes("reservationStatus"), "EIMS queue service records counter reservation status");
	assert(queueService.includes("failed_retryable"), "EIMS queue service classifies retryable failures");
	assert(queueSpec.includes("serializes submissions per source"), "EIMS queue tests cover per-source serialization");
	assert(
		queueSpec.includes("keeps retryable and unknown outcomes out of the accepted counter chain"),
		"EIMS queue tests cover retryable counter handling",
	);
	assert(
		submissionService.includes("EimsSubmissionQueueService"),
		"EIMS submission service uses queue/counter coordinator",
	);
	assert(externalClient.includes("counter?: number"), "EIMS external client contract includes reserved counter");
	assert(externalClient.includes("previousIrn?: string | null"), "EIMS external client contract includes previous IRN");
	assert(externalClient.includes("EIMS_SDK_CLIENT"), "EIMS external client contract exposes SDK injection token");
	assert(sdkClientProvider.includes("EIMS_SDK_PACKAGE_NAME"), "EIMS SDK provider reads configured SDK package name");
	assert(sdkClientProvider.includes("DEFAULT_EIMS_SDK_PACKAGE_NAME"), "EIMS SDK provider defaults to the starter SDK package");
	assert(sdkClientProvider.includes("createEimsSdkClientFromModule"), "EIMS SDK provider validates loaded SDK module shape");
	assert(sdkClientProvider.includes("registerInvoice-capable"), "EIMS SDK provider fails closed for incompatible SDK modules");
	assert(sdkClientProviderSpec.includes("createEimsClient factory"), "EIMS SDK provider tests cover SDK factory wiring");
	assert(sdkClientProviderSpec.includes("fails closed"), "EIMS SDK provider tests cover incompatible SDK packages");
	assert(sdkExternalClient.includes("EIMS_SDK_CLIENT"), "EIMS SDK adapter uses SDK injection token");
	assert(sdkExternalClient.includes("registerInvoice"), "EIMS SDK adapter delegates invoice registration");
	assert(sdkExternalClient.includes("registerReceipt"), "EIMS SDK adapter delegates receipt registration");
	assert(sdkExternalClient.includes("ServiceUnavailableException"), "EIMS SDK adapter fails closed without SDK provider");
	assert(sdkExternalClientSpec.includes("delegates invoice registration"), "EIMS SDK adapter tests cover invoice delegation");
	assert(sdkExternalClientSpec.includes("fails closed"), "EIMS SDK adapter tests cover missing SDK wiring");
	assert(eimsSharedModule.includes("EimsSdkClientProvider"), "EIMS shared module registers SDK package provider");
	assert(eimsSharedModule.includes("EimsSdkExternalClient"), "EIMS shared module provides SDK adapter");
	assert(eimsSharedModule.includes('process.env.EIMS_MOCK_MODE === "false"'), "EIMS shared module switches to SDK outside mock mode");
	assert(eimsSharedModule.includes("EimsSubmissionQueueService"), "EIMS shared module exports queue coordinator");
	assert(lookupService.includes("createHash"), "EIMS lookup service generates deterministic ETags");
	assert(lookupService.includes("EIMS_LOOKUP_CACHE_TTL_SECONDS"), "EIMS lookup service honors lookup cache TTL env");
	assert(lookupService.includes("cacheControl"), "EIMS lookup service returns cache-control metadata");
	assert(lookupService.includes("matchesEtag"), "EIMS lookup service supports conditional requests");
	assert(lookupController.includes('Headers("if-none-match")'), "EIMS lookup controller reads If-None-Match");
	assert(lookupController.includes("response.status(304)"), "EIMS lookup controller returns 304 for fresh lookup caches");
	assert(lookupServiceSpec.includes("deterministic ETag"), "EIMS lookup tests cover deterministic ETags");
	assert(lookupServiceSpec.includes("If-None-Match"), "EIMS lookup tests cover conditional cache requests");
	assert(bulkCallbackService.includes("timingSafeEqual"), "EIMS bulk callback verification uses constant-time signature compare");
	assert(bulkCallbackService.includes("EIMS_CALLBACK_HMAC_SECRET"), "EIMS bulk callback service requires callback HMAC secret");
	assert(bulkCallbackService.includes("knownConversationIds"), "EIMS bulk callback service validates known conversations");
	assert(bulkCallbackService.includes("idempotencyKey"), "EIMS bulk callback service deduplicates callback retries");
	assert(bulkCallbackService.includes("reconciliationStatus"), "EIMS bulk callback service emits reconciliation status");
	assert(bulkCallbackController.includes('Controller("eims/callbacks")'), "EIMS API exposes signed callback route namespace");
	assert(bulkCallbackController.includes('Headers("x-eims-signature")'), "EIMS callback route reads signature header");
	assert(bulkCallbackSpec.includes("rejects stale callback timestamps"), "EIMS callback tests cover timestamp replay window");
	assert(bulkCallbackSpec.includes("deduplicates callback retries"), "EIMS callback tests cover idempotent retries");
	assert(eimsSharedModule.includes("EimsBulkCallbackService"), "EIMS shared module exports bulk callback verifier");
	assert(offlineCache.includes("CipherService"), "EIMS offline cache encrypts pending payloads");
	assert(offlineCache.includes("payloadSha256"), "EIMS offline cache stores payload integrity hashes");
	assert(offlineCache.includes("payloadReturned: false"), "EIMS offline cache redacts pending payloads from list responses");
	assert(offlineCache.includes("syncStatus = \"poisoned\""), "EIMS offline cache poisons tampered payloads");
	assert(offlineCacheSpec.includes("encrypts pending offline payloads"), "EIMS offline cache tests cover encrypted storage");
	assert(offlineCacheSpec.includes("poisons tampered offline cache entries"), "EIMS offline cache tests cover integrity failure");
	assert(eimsSharedModule.includes("EimsOfflinePendingSyncCacheService"), "EIMS shared module exports offline cache service");
	assert(credentialPersistence.includes("PrismaService"), "EIMS credential persistence uses Prisma");
	assert(credentialPersistence.includes("eimsCredential.create"), "EIMS credential persistence creates durable rows");
	assert(credentialPersistence.includes("eimsCredential.update"), "EIMS credential persistence updates durable rows");
	assert(credentialPersistence.includes("Buffer.from(encrypted"), "EIMS credential persistence stores encrypted bytes");
	assert(credentialPersistence.includes("secretsReturned: false"), "EIMS credential persistence redacts stored secrets");
	assert(
		credentialPersistenceSpec.includes("stores encrypted credential columns durably"),
		"EIMS credential persistence tests cover durable encrypted storage",
	);
	assert(
		credentialPersistenceSpec.includes("records credential test proof"),
		"EIMS credential persistence tests cover durable test proof",
	);
	assert(credentialSecrets.includes("CipherService"), "EIMS credential secrets use platform CipherService");
	assert(credentialSecrets.includes("delete persistablePayload[field]"), "EIMS credential secrets strip raw values");
	assert(credentialSecrets.includes("encryptedSecrets"), "EIMS credential secrets persist encrypted payload fields");
	assert(credentialSecrets.includes("secretsReturned: false"), "EIMS credential secret boundary keeps responses redacted");
	assert(credentialSecrets.includes("sealRotationPayload"), "EIMS credential secrets expose rotation sealing boundary");
	assert(credentialSecrets.includes("rotationEvidenceSha256"), "EIMS credential rotations produce evidence hashes");
	assert(credentialSecrets.includes("rotation_pending_test"), "EIMS credential rotations require post-rotation testing");
	assert(credentialSecretsSpec.includes("removes raw values"), "EIMS credential secret tests cover raw-value removal");
	assert(credentialSecretsSpec.includes("without exposing ciphertext"), "EIMS credential secret tests cover response redaction");
	assert(credentialSecretsSpec.includes("seals credential rotations"), "EIMS credential secret tests cover rotation sealing");
	assert(credentialSecretsSpec.includes("without new secret material"), "EIMS credential secret tests reject empty rotations");
	assert(supportingResourcesController.includes("sealPayload(body)"), "EIMS credential API seals payloads before repository save");
	assert(
		supportingResourcesController.includes("withRedactionMetadata"),
		"EIMS credential API returns redaction metadata",
	);
	assert(supportingResourcesController.includes('Post("credentials/rotate")'), "EIMS credential API exposes rotation endpoint");
	assert(
		supportingResourcesController.includes('@RequirePermissions("eims-credential:rotate")'),
		"EIMS credential rotation endpoint requires rotate permission",
	);
	assert(
		supportingResourcesController.includes("EimsCredentialPersistenceService"),
		"EIMS credential API uses durable credential persistence",
	);
	assert(eimsSharedModule.includes("EimsCredentialPersistenceService"), "EIMS shared module exports credential persistence");
	assert(eimsSharedModule.includes("EimsCredentialSecretService"), "EIMS shared module exports credential secret service");
	assert(printProof.includes("PDFDocument"), "EIMS print proof service renders PDF output");
	assert(printProof.includes("createHash"), "EIMS print proof service fingerprints generated PDFs");
	assert(printProof.includes("Official print proof requires an accepted EIMS response"), "EIMS print proof requires acceptance");
	assert(printProof.includes("signedQr?.includes(input.irn)"), "EIMS print proof validates QR source against IRN");
	assert(printProof.includes("pdfBase64"), "EIMS print proof returns deterministic PDF evidence");
	assert(printProofSpec.includes('toBe("%PDF")'), "EIMS print proof tests verify PDF bytes");
	assert(printProofSpec.includes("pending_offline"), "EIMS print proof tests block pre-acceptance printing");
	assert(printProofSpec.includes("signed QR payload to match"), "EIMS print proof tests validate QR/IRN matching");
	assert(supportingResourcesController.includes('Post("print-layouts/proof")'), "EIMS API exposes print proof endpoint");
	assert(eimsSharedModule.includes("EimsPrintProofService"), "EIMS shared module exports print proof service");
	const eimsOnboardingSeed = readProjectFile("apps/api/prisma/seed-eims-onboarding-template.ts");
	assert(eimsOnboardingSeed.includes('"eims-restaurant"'), "EIMS onboarding template uses eims-restaurant key");
	assert(eimsOnboardingSeed.includes('"mor-portal-signup"'), "EIMS onboarding template includes MoR signup step");
	assert(eimsOnboardingSeed.includes('"certificate-upload"'), "EIMS onboarding template includes certificate upload step");
	assert(eimsOnboardingSeed.includes('"production-ready"'), "EIMS onboarding template includes production-ready step");
}

async function assertBackendMockData() {
	const overview = await getJson("/api/v1/eims/overview");
	assert(overview.response.status === 200, "overview status is 200");
	assert(overview.body.data.mode === "setup_in_progress", "overview mode is setup in progress");
	assert(/^\d{10}$/.test(overview.body.data.enterprises[0].tin), "enterprise TIN is 10 digits");
	assert(overview.body.data.establishments[0].subTin === "0074136947-01", "establishment sub-TIN matches V3 format");
	assert(overview.body.data.sourceSystems[0].approvalStatus === "approved", "source approval guard has approved source");
	assert(overview.body.data.sourceSystems[1].approvalStatus === "pending_mor_approval", "source approval exposes pending source");
	assert(overview.body.data.sourceSystems[0].lastAcceptedCounter === 128, "counter state is exposed");
	assert(
		overview.body.data.blockers.includes("EIMS certificate and API credentials still need to be added"),
		"sandbox blocker is explicit",
	);

	for (const [lookup, expectedCodes] of Object.entries(expectedLookups)) {
		const result = await getJson(`/api/v1/eims/lookups/${lookup}`);
		assert(result.response.status === 200, `${lookup} lookup status is 200`);
		assert(result.body.version === "eims-lookup-seed-v3", `${lookup} lookup version is V3`);
		const actualCodes = result.body.data.map((row) => row.code);
		for (const code of expectedCodes) {
			assert(actualCodes.includes(code), `${lookup} contains ${code}`);
		}
	}

	const docTypes = await getJson("/api/v1/eims/lookups/document-types");
	assert(
		docTypes.body.data.find((row) => row.code === "CRE")?.requiresRelatedDocument === true,
		"CRE requires related document",
	);
	const txTypes = await getJson("/api/v1/eims/lookups/transaction-types");
	assert(txTypes.body.data.find((row) => row.code === "B2C")?.buyerTinRequired === false, "B2C buyer TIN is optional");
	const sourceTypes = await getJson("/api/v1/eims/lookups/source-system-types");
	assert(sourceTypes.body.data.find((row) => row.code === "MAN")?.itemCodeRequired === false, "MAN source skips item code");
	const reasons = await getJson("/api/v1/eims/lookups/cancellation-reasons");
	assert(reasons.body.data.find((row) => row.code === "4")?.requiresRemark === true, "reason 4 requires remark");
	assert(
		reasons.body.data.find((row) => row.code === "6")?.mockObservedUnconfirmed === true,
		"reason 6 is marked unconfirmed",
	);

	const submissions = await getJson("/api/v1/eims/submissions");
	const statuses = submissions.body.data.map((row) => row.status);
	for (const status of ["accepted", "pending_offline", "failed_retryable", "unknown_submission"]) {
		assert(statuses.includes(status), `submissions include ${status}`);
	}
	const accepted = submissions.body.data.find((row) => row.status === "accepted");
	assert(accepted.irn.startsWith("TEST-IRN-"), "accepted submission has backend IRN");
	assert(Number(accepted.totalValue) > Number(accepted.taxValue), "accepted submission totals are numeric and sane");
	const offline = submissions.body.data.find((row) => row.status === "pending_offline");
	assert(offline.irn === null, "offline submission has no official IRN");
	assert(offline.ackDate === null, "offline submission has no ack date");

	const submitted = await postJson("/api/v1/eims/submissions/mock-submit", {
		documentNumber: "INV-SCAFFOLD-VERIFY-001",
	});
	assert(submitted.response.status === 201, "mock submit returns 201");
	assert(submitted.body.data.documentNumber === "INV-SCAFFOLD-VERIFY-001", "mock submit preserves document number");
	assert(submitted.body.data.status === "accepted", "mock submit returns accepted state");
	assert(submitted.body.data.irn === "TEST-IRN-NEW", "mock submit returns backend mock IRN");

	const receipts = await getJson("/api/v1/eims/receipts");
	assert(receipts.body.data.some((row) => row.receiptType === "sales" && row.rrn === "TEST-RRN-00044"), "sales receipt has RRN");
	assert(receipts.body.data.some((row) => row.receiptType === "withholding" && row.rrn === null), "withholding draft has no RRN");

	const compliance = await getJson("/api/v1/eims/compliance/evidence");
	assert(compliance.body.data.items.some((item) => item.key === "invoices"), "compliance includes invoice evidence");
	assert(compliance.body.data.items.some((item) => item.key === "print"), "compliance includes printable receipt evidence");

	const credentials = await getJson("/api/v1/eims/credentials");
	assert(credentials.body.data[0].status === "tested", "credentials expose tested lifecycle");
	assert(credentials.body.data[0].apiKeyConfigured === true, "credentials expose api key configured flag");
	assert(credentials.body.data[0].secretsReturned === false, "credentials do not return secrets");
	assert(!("apiKey" in credentials.body.data[0]), "credentials response does not include raw apiKey");
	assert(!("password" in credentials.body.data[0]), "credentials response does not include raw password");
	assert(!("clientSecret" in credentials.body.data[0]), "credentials response does not include raw clientSecret");
	assert(!("refreshToken" in credentials.body.data[0]), "credentials response does not include raw refreshToken");

	const certificates = await getJson("/api/v1/eims/certificates");
	assert(certificates.body.data[0].provider === "Vault Transit", "certificates expose Vault Transit provider");
	assert(certificates.body.data[0].csrStrategy === "vault-generated", "certificates expose CSR strategy");
	assert(certificates.body.data[0].status === "expires_soon", "certificates expose expiry status");

	const branchHealth = await getJson("/api/v1/eims/branch-health");
	assert(branchHealth.body.data[0].establishmentName === "Bole Branch", "branch health exposes Bole Branch");
	assert(branchHealth.body.data[0].alerts.includes("Bar POS awaiting MoR approval"), "branch health exposes MoR approval alert");

	const buyers = await getJson("/api/v1/eims/buyers");
	assert(buyers.body.data.some((buyer) => buyer.isGovernment === true), "buyer directory includes government buyer");
	assert(buyers.body.data.some((buyer) => /^\d{10}$/.test(buyer.buyerTin)), "buyer directory validates 10-digit buyer TIN");

	const bulk = await getJson("/api/v1/eims/bulk");
	const bulkRow = bulk.body.data[0];
	assert(bulkRow.endpoint === "/api/v1/bulkInvoice", "bulk endpoint uses V3 spec endpoint candidate");
	assert(bulkRow.submitted === bulkRow.accepted + bulkRow.failed + bulkRow.pending, "bulk item counts reconcile");
	assert(bulkRow.reconciliationAfterMinutes === 15, "bulk reconciliation threshold is 15 minutes");

	const cancellations = await getJson("/api/v1/eims/cancellations");
	assert(cancellations.body.data[0].reasonCode === "4", "cancellation exposes reason code 4");
	assert(cancellations.body.data[0].remark.length > 0, "cancellation reason 4 includes remark");
	assert(cancellations.body.data[0].countToday < cancellations.body.data[0].knownLimitToday, "cancellation limit state is sane");

	const printLayouts = await getJson("/api/v1/eims/print-layouts");
	assert(printLayouts.body.data.some((layout) => layout.layout === "compact"), "print layouts include compact thermal");
	assert(printLayouts.body.data.some((layout) => layout.layout === "a4"), "print layouts include A4");
	assert(
		printLayouts.body.data.every((layout) => layout.qrSource.includes("EIMS accepted")),
		"print layouts never use pre-acceptance official QR",
	);

	const notifications = await getJson("/api/v1/eims/notifications");
	assert(notifications.body.data.some((row) => row.provider === "Africa's Talking"), "notifications include SMS provider");
	assert(notifications.body.data.some((row) => row.provider === "AWS SES"), "notifications include email provider");

	const adminOverview = await getJson("/api/v1/admin/eims/overview");
	assert(adminOverview.body.data.latestFailures[0].errorCode === "7015", "admin failure exposes counter rule 7015");
	assert(adminOverview.body.data.latestFailures[0].category === "rule_error", "admin failure classifies rule error");
	const resources = await getJson("/api/v1/admin/eims/resources");
	assert(resources.body.data.queues.some((queue) => queue.status === "paused_pending_approval"), "admin resources expose paused queue");
	assert(resources.body.data.vault.provider === "local", "admin resources expose signing provider state");
}

async function main() {
	await ensureGeneratedProject();
	assertGeneratedStructure();

	const server = await startMockApi();
	try {
		await waitForServer();
		await assertBackendMockData();
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}

	console.log(`\nEIMS generated-project verification passed: ${checks.length} checks`);
	for (const check of checks) {
		console.log(`- ${check.name}`);
	}
}

main().catch((error) => {
	console.error(`\nEIMS generated-project verification failed: ${error.message}`);
	process.exit(1);
});
