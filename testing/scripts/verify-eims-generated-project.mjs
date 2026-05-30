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
	"apps/api/src/modules/eims/shared/canonicalization",
	"apps/api/src/modules/eims/shared/constants",
	"apps/api/src/modules/eims/shared/crypto",
	"apps/api/src/modules/eims/shared/errors",
	"apps/api/src/modules/eims/shared/lookups",
	"apps/api/src/modules/eims/shared/mock",
	"apps/api/src/modules/eims/shared/notifications",
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
	"apps/api/src/modules/eims/shared/client/mock-eims-external.client.ts",
	"apps/api/src/modules/eims/shared/constants/eims-lookup-values.ts",
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
	"apps/e2e/tests/eims-mock.spec.ts",
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
	assert(packageJson.scripts["test:eims:mock"]?.includes("test:eims:ui"), "generated package has full EIMS mock gate");
	assert(packageJson.scripts["test:eims:api"]?.includes("api-tests"), "generated package has EIMS API tests");
	const apiTestsPackageJson = JSON.parse(readProjectFile("apps/api-tests/package.json"));
	assert(
		apiTestsPackageJson.scripts?.["test:eims:mock"]?.includes("eims-http"),
		"EIMS API mock test script is installed",
	);
	const webPackageJson = JSON.parse(readProjectFile("apps/web/package.json"));
	assert(webPackageJson.scripts?.lint === "biome check .", "web workspace lint uses Biome");
	assert(webPackageJson.scripts?.format === "biome check --write .", "web workspace format uses Biome");
	const e2ePackageJson = JSON.parse(readProjectFile("apps/e2e/package.json"));
	assert(e2ePackageJson.scripts?.["test:eims"]?.includes("playwright.eims.config.ts"), "EIMS e2e test script is installed");

	const appSidebar = readProjectFile("apps/web/src/components/layout/AppSidebar.tsx");
	assert(appSidebar.includes('labelKey: "sidebar.eims"'), "tenant sidebar includes EIMS navigation group");
	assert(appSidebar.includes('labelKey: "sidebar.eimsStatus"'), "tenant sidebar exposes EIMS status child route");
	assert(appSidebar.includes('labelKey: "sidebar.eimsExports"'), "tenant sidebar exposes records export child route");
	const adminSidebar = readProjectFile("apps/web/src/components/layout/AdminSidebar.tsx");
	assert(adminSidebar.includes("const EIMS_ADMIN_NAV"), "admin sidebar includes EIMS operations group");
	assert(adminSidebar.includes('admin.nav.eimsOperations'), "admin sidebar exposes EIMS operations label");
	const englishLocale = readProjectFile("apps/web/src/shared/i18n/locales/en.ts");
	assert(englishLocale.includes('eims: "Tax tools"'), "tenant EIMS nav is business-facing");
	assert(englishLocale.includes('eimsCancellations: "Cancellations"'), "tenant EIMS nav labels include cancellations");
	assert(englishLocale.includes('eimsOperations: "EIMS operations"'), "admin EIMS nav labels are installed");
	const tenantPages = readProjectFile("apps/web/src/features/eims/components/eims-tenant-pages.tsx");
	assert(tenantPages.includes("Ethiopia tax workspace"), "tenant EIMS UI has a domain-specific workspace header");
	assert(tenantPages.includes("EIMS setup path"), "tenant EIMS UI has the guided six-step setup path");
	assert(tenantPages.includes("SharedDataTable"), "tenant EIMS pages use the shared DataTable surface");
	assert(!tenantPages.includes("@/components/ui/table"), "tenant EIMS pages do not use raw table primitives");
	const adminPages = readProjectFile("apps/web/src/features/eims/components/eims-admin-pages.tsx");
	assert(adminPages.includes("Platform EIMS command center"), "admin EIMS UI has an operations command header");
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
	for (const modelName of requiredPrismaModels) {
		assert(prismaSchema.includes(modelName), `Prisma contains ${modelName}`);
	}
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
