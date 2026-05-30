import { existsSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scaffold } from "../../packages/cli/src/scaffold.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const templateDir = path.join(repoRoot, "template");
const targetRoot = process.env.BASE_GENERATED_PROJECT_ROOT ?? path.join(os.tmpdir(), "vyllion-base-scaffold-proof");

const mustNotExist = [
	"apps/api/src/modules/eims",
	"apps/api/src/modules/invoicing",
	"apps/api-tests/bruno/EIMS-Phase0",
	"apps/api-tests/scripts/eims-mock-api-server.mjs",
	"apps/api-tests/scripts/eims-static-web-server.mjs",
	"apps/api-tests/tests/eims-acceptance.spec.ts",
	"apps/api-tests/tests/eims-v3-mock.spec.ts",
	"apps/e2e/playwright.eims.config.ts",
	"apps/e2e/tests/eims-mock.spec.ts",
	"apps/web/src/features/eims",
	"apps/web/src/routes/_authenticated/eims",
	"apps/web/src/routes/admin/eims",
	"docs/EIMS_SETUP_GUIDE.md",
	"docs/EIMS_PHASE0_RUNBOOK.md",
];

const mustExist = [
	"apps/api/src/modules/onboarding/onboarding.module.ts",
	"apps/api-tests/scripts/with-mock-api.mjs",
	"apps/web/src/features/onboarding/components/onboarding-pages.tsx",
	"apps/web/src/routes/_authenticated/onboarding/index.tsx",
	"apps/web/src/routes/admin/onboarding/index.tsx",
	"apps/web/src/routes/admin/onboarding/new.tsx",
	"apps/web/src/shared/components/AuthShell.tsx",
	"apps/web/src/shared/components/CommandPalette.tsx",
	"apps/web/src/shared/components/PageShell.tsx",
	"apps/e2e/tests/smoke.spec.ts",
	"apps/security/scripts/source-security-check.mjs",
	"scripts/backup-postgres.mjs",
	"scripts/restore-postgres.mjs",
];

const textFilesWithoutEims = [
	"package.json",
	"apps/api/src/app.module.ts",
	"apps/api/src/modules/auth/permissions.ts",
	"apps/api-tests/scripts/with-mock-api.mjs",
	"apps/web/src/components/layout/AppSidebar.tsx",
	"apps/web/src/components/layout/AdminSidebar.tsx",
	"apps/web/src/routeTree.gen.ts",
	"apps/web/src/shared/i18n/locales/en.ts",
	"apps/web/src/shared/i18n/locales/am.ts",
];

const checks = [];

function pass(name) {
	checks.push(name);
}

function assert(condition, name, detail = "assertion failed") {
	if (!condition) throw new Error(`${name}: ${detail}`);
	pass(name);
}

function readProjectFile(relPath) {
	return readFileSync(path.join(targetRoot, relPath), "utf8");
}

function pathExists(relPath) {
	return existsSync(path.join(targetRoot, relPath));
}

function assertNoEimsScripts() {
	const packageJson = JSON.parse(readProjectFile("package.json"));
	const eimsScripts = Object.keys(packageJson.scripts ?? {}).filter((scriptName) => scriptName.includes("eims"));
	assert(eimsScripts.length === 0, "base package has no EIMS scripts", eimsScripts.join(", "));
}

function assertDeployGateBuilds() {
	const packageJson = JSON.parse(readProjectFile("package.json"));
	const deployCheck = packageJson.scripts?.["deploy:check"] ?? "";
	const testCi = packageJson.scripts?.["test:ci"] ?? "";
	const testSmoke = packageJson.scripts?.["test:smoke"] ?? "";
	assert(deployCheck.includes("build:api"), "deploy gate includes API production build");
	assert(deployCheck.includes("build:web"), "deploy gate includes web production build");
	assert(testCi.includes("test:api:http:mock"), "CI test gate includes mock HTTP API tests");
	assert(testCi.includes("test:api:bruno:mock"), "CI test gate includes mock Bruno API tests");
	assert(testCi.includes("test:security:source"), "CI test gate includes deterministic source security checks");
	assert(testCi.includes("test:security:api"), "CI test gate includes deterministic API security checks");
	assert(testSmoke.includes("test:e2e:smoke"), "smoke test gate includes browser E2E smoke");
	assert(testSmoke.includes("test:security:source"), "smoke test gate includes deterministic source security checks");
	assert(packageJson.scripts?.["db:backup"]?.includes("backup-postgres.mjs"), "base package has Postgres backup script");
	assert(packageJson.scripts?.["db:restore"]?.includes("restore-postgres.mjs"), "base package has Postgres restore script");
}

function assertCiWorkflows() {
	const codeQuality = readProjectFile(".github/workflows/code-quality.yml");
	const playwright = readProjectFile(".github/workflows/playwright.yml");
	assert(codeQuality.includes("pull_request:"), "code quality workflow runs on pull requests");
	assert(codeQuality.includes("push:"), "code quality workflow runs on pushes");
	assert(codeQuality.includes("production-gate:"), "code quality workflow includes production gate job");
	assert(codeQuality.includes("pnpm deploy:check"), "code quality workflow runs deploy readiness gate");
	assert(playwright.includes("pull_request:"), "Playwright workflow runs on pull requests");
	assert(playwright.includes("push:"), "Playwright workflow runs on pushes");
	assert(playwright.includes("pnpm test:e2e"), "Playwright workflow runs browser E2E tests");
}

function assertWorkspaceScripts() {
	const webPackageJson = JSON.parse(readProjectFile("apps/web/package.json"));
	const securityPackageJson = JSON.parse(readProjectFile("apps/security/package.json"));
	assert(webPackageJson.scripts?.lint === "biome check .", "web workspace lint uses Biome");
	assert(webPackageJson.scripts?.format === "biome check --write .", "web workspace format uses Biome");
	assert(securityPackageJson.scripts?.["test:source"]?.includes("source-security-check.mjs"), "security workspace has source hardening check");
}

function assertPerformanceMockGateRuns() {
	const performanceMock = readProjectFile("apps/performance/scripts/mock-k6.mjs");
	assert(
		performanceMock.includes("Running built-in mock HTTP load smoke instead."),
		"performance mock gate has built-in fallback",
	);
	assert(!performanceMock.includes("Skipping k6 mock performance run"), "performance mock gate does not silently skip");
}

function assertOnboardingFirstEntry() {
	const rootIndex = readProjectFile("apps/web/src/routes/index.tsx");
	const loginPage = readProjectFile("apps/web/src/routes/login.tsx");
	assert(rootIndex.includes('<Navigate to="/onboarding" />'), "tenant root opens onboarding first");
	assert(loginPage.includes('window.location.href = "/onboarding";'), "tenant login opens onboarding first");
}

function assertFrontendImprovementSurface() {
	const topBar = readProjectFile("apps/web/src/components/layout/TopBar.tsx");
	const dataTable = readProjectFile("apps/web/src/shared/components/DataTable.tsx");
	const onboarding = readProjectFile("apps/web/src/features/onboarding/components/onboarding-pages.tsx");
	const authShell = readProjectFile("apps/web/src/shared/components/AuthShell.tsx");
	const e2eSmoke = readProjectFile("apps/e2e/tests/smoke.spec.ts");
	assert(topBar.includes("<CommandPalette />"), "top bar exposes command palette");
	assert(topBar.includes("Workspace command center"), "top bar exposes visible command-center shell");
	assert(authShell.includes("SaaS launch console"), "auth screens use visible product console shell");
	assert(dataTable.includes("useDebouncedValue"), "DataTable has debounced global search");
	assert(dataTable.includes("DataTableColumnFilter"), "DataTable renders per-column filters");
	assert(dataTable.includes("DropdownMenuCheckboxItem"), "DataTable has column visibility controls");
	assert(onboarding.includes("Concierge launch workflow"), "tenant onboarding uses visible launch workflow console");
	assert(onboarding.includes("Concierge onboarding"), "admin onboarding uses concierge operations copy");
	assert(onboarding.includes("<DataTable"), "admin onboarding list uses shared DataTable");
	assert(onboarding.includes("Current action"), "onboarding pages expose active workflow step");
	assert(onboarding.includes("TemplatePreview"), "new onboarding page previews selected templates");
	assert(e2eSmoke.includes("tenant onboarding smoke renders workflow and command palette"), "E2E smoke covers tenant onboarding");
	assert(e2eSmoke.includes("admin onboarding smoke renders filterable operations table"), "E2E smoke covers admin onboarding table");
}

function readEnv(relPath) {
	const out = {};
	for (const line of readProjectFile(relPath).split(/\r?\n/)) {
		if (!line || line.trimStart().startsWith("#") || !line.includes("=")) continue;
		const [key, ...rest] = line.split("=");
		out[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
	}
	return out;
}

function assertGeneratedSecrets() {
	const apiEnv = readEnv("apps/api/.env");
	assert(/^[a-f0-9]{64}$/i.test(apiEnv.BETTER_AUTH_SECRET ?? ""), "generated BETTER_AUTH_SECRET is 32-byte hex");
	assert(/^[a-f0-9]{64}$/i.test(apiEnv.MASTER_KEY ?? ""), "generated MASTER_KEY is 32-byte hex");
}

async function main() {
	rmSync(targetRoot, { recursive: true, force: true });
	await scaffold({
		templateDir,
		targetDir: targetRoot,
		tokens: {
			projectName: "Base Scaffold Proof",
			projectSlug: "base-scaffold-proof",
			dbName: "base_scaffold_proof",
			superAdminEmail: "admin@example.test",
			superAdminPassword: "SuperAdmin123456!",
			superAdminName: "Platform Admin",
			ownerEmail: "owner@example.test",
			ownerPassword: "Owner123456!",
			authSecret: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
			masterKey: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
			caddyDomain: "example.test",
		},
		actions: {},
	});

	for (const relPath of mustNotExist) {
		assert(!pathExists(relPath), `base omits ${relPath}`);
	}

	for (const relPath of mustExist) {
		assert(pathExists(relPath), `base keeps ${relPath}`);
	}

	for (const relPath of textFilesWithoutEims) {
		const text = readProjectFile(relPath);
		assert(!/\beims\b/i.test(text), `${relPath} has no EIMS references`);
	}

	assertNoEimsScripts();
	assertDeployGateBuilds();
	assertCiWorkflows();
	assertWorkspaceScripts();
	assertPerformanceMockGateRuns();
	assertOnboardingFirstEntry();
	assertFrontendImprovementSurface();
	assertGeneratedSecrets();

	console.log(`Base generated-project verification passed: ${checks.length} checks`);
	for (const check of checks) console.log(`- ${check}`);
}

main().catch((error) => {
	console.error(`Base generated-project verification failed: ${error.message}`);
	process.exit(1);
});
