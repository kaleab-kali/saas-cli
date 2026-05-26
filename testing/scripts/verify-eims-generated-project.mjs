import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const novekRoot = path.resolve(repoRoot, "..", "..", "..");
const generatedRoot =
	process.env.EIMS_GENERATED_PROJECT_ROOT ??
	path.join(novekRoot, "testing", "vyllion-eims-v3-generated-final");
const mockPort = Number(process.env.EIMS_SCAFFOLD_MOCK_PORT ?? 0);
let baseUrl = "";

const requiredDirs = [
	"apps/api/src/modules/eims/admin/application",
	"apps/api/src/modules/eims/admin/presentation",
	"apps/api/src/modules/eims/compliance/application",
	"apps/api/src/modules/eims/compliance/presentation",
	"apps/api/src/modules/eims/receipts/application",
	"apps/api/src/modules/eims/receipts/presentation",
	"apps/api/src/modules/eims/setup/application/commands",
	"apps/api/src/modules/eims/setup/application/dto",
	"apps/api/src/modules/eims/setup/application/queries",
	"apps/api/src/modules/eims/setup/domain",
	"apps/api/src/modules/eims/setup/infrastructure/repositories",
	"apps/api/src/modules/eims/setup/presentation",
	"apps/api/src/modules/eims/shared/client",
	"apps/api/src/modules/eims/shared/constants",
	"apps/api/src/modules/eims/shared/lookups",
	"apps/api/src/modules/eims/shared/mock",
	"apps/api/src/modules/eims/submission/application",
	"apps/api/src/modules/eims/submission/domain",
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
	"apps/api/src/modules/invoicing/domain/canonical-invoice.ts",
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

	const prismaSchema = readProjectFile("apps/api/prisma/schema.prisma");
	for (const modelName of requiredPrismaModels) {
		assert(prismaSchema.includes(modelName), `Prisma contains ${modelName}`);
	}
}

async function assertBackendMockData() {
	const overview = await getJson("/api/v1/eims/overview");
	assert(overview.response.status === 200, "overview status is 200");
	assert(overview.body.data.mode === "mock", "overview mode is backend mock");
	assert(/^\d{10}$/.test(overview.body.data.enterprises[0].tin), "enterprise TIN is 10 digits");
	assert(overview.body.data.establishments[0].subTin === "0074136947-01", "establishment sub-TIN matches V3 format");
	assert(overview.body.data.sourceSystems[0].approvalStatus === "approved", "source approval guard has approved source");
	assert(overview.body.data.sourceSystems[1].approvalStatus === "pending_mor_approval", "source approval exposes pending source");
	assert(overview.body.data.sourceSystems[0].lastAcceptedCounter === 128, "counter state is exposed");
	assert(overview.body.data.blockers.includes("INSA sandbox credentials not yet received"), "sandbox blocker is explicit");

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
	assert(accepted.irn.startsWith("MOCK-IRN-"), "accepted submission has backend IRN");
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
	assert(submitted.body.data.irn === "MOCK-IRN-NEW", "mock submit returns backend mock IRN");

	const receipts = await getJson("/api/v1/eims/receipts");
	assert(receipts.body.data.some((row) => row.receiptType === "sales" && row.rrn === "MOCK-RRN-00044"), "sales receipt has RRN");
	assert(receipts.body.data.some((row) => row.receiptType === "withholding" && row.rrn === null), "withholding draft has no RRN");

	const compliance = await getJson("/api/v1/eims/compliance/evidence");
	assert(compliance.body.data.items.some((item) => item.key === "phase0-layer-a"), "compliance includes Phase 0 Layer A");
	assert(compliance.body.data.items.some((item) => item.key === "rls"), "compliance includes targeted RLS item");

	const adminOverview = await getJson("/api/v1/admin/eims/overview");
	assert(adminOverview.body.data.latestFailures[0].errorCode === "7015", "admin failure exposes counter rule 7015");
	assert(adminOverview.body.data.latestFailures[0].category === "rule_error", "admin failure classifies rule error");
	const resources = await getJson("/api/v1/admin/eims/resources");
	assert(resources.body.data.queues.some((queue) => queue.status === "paused_pending_approval"), "admin resources expose paused queue");
	assert(resources.body.data.vault.provider === "local", "admin resources expose signing provider state");
}

async function main() {
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
