import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
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
	"apps/web/src/types/hugeicons-core-free-icons.d.ts",
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

function listProjectFiles(relPath) {
	const root = path.join(targetRoot, relPath);
	const entries = readdirSync(root, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const childRelPath = path.join(relPath, entry.name);
		if (entry.isDirectory()) {
			files.push(...listProjectFiles(childRelPath));
			continue;
		}
		files.push(childRelPath);
	}
	return files;
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
	assert(deployCheck.includes("test:smoke"), "deploy gate runs broad smoke suite");
	assert(deployCheck.includes("pnpm lint"), "deploy gate includes lint without duplicate Prisma generation");
	assert(deployCheck.includes("pnpm typecheck"), "deploy gate includes typecheck without duplicate Prisma generation");
	assert(!deployCheck.includes("lint:ci"), "deploy gate avoids nested lint:ci duplicate Prisma generation");
	assert(!deployCheck.includes("test:ci &&"), "deploy gate does not bypass browser smoke via narrow CI gate");
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
	assert(codeQuality.includes("playwright install --with-deps chromium"), "production gate installs browser dependency");
	assert(codeQuality.includes("openssl rand -hex 32"), "production gate generates throwaway CI secrets");
	assert(!/BETTER_AUTH_SECRET:\s*[a-f0-9]{64}/i.test(codeQuality), "production gate has no hardcoded auth secret");
	assert(!/MASTER_KEY:\s*[a-f0-9]{64}/i.test(codeQuality), "production gate has no hardcoded master key");
	assert(!codeQuality.includes("NODE_ENV: test"), "production gate does not force test-mode frontend builds");
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
	assert(dataTable.includes("useDataTableState"), "DataTable exposes URL-synced state hook");
	assert(dataTable.includes("useSearch({ strict: false })"), "DataTable state reads TanStack Router search params");
	assert(dataTable.includes("manualPagination"), "DataTable supports server-side pagination");
	assert(dataTable.includes("DataTableColumnFilter"), "DataTable renders per-column filters");
	assert(dataTable.includes("DropdownMenuCheckboxItem"), "DataTable has column visibility controls");
	assert(onboarding.includes("Concierge launch workflow"), "tenant onboarding uses visible launch workflow console");
	assert(onboarding.includes("Concierge onboarding"), "admin onboarding uses concierge operations copy");
	assert(onboarding.includes("<DataTable"), "admin onboarding list uses shared DataTable");
	assert(onboarding.includes("useDataTableState"), "admin onboarding table syncs table state to URL");
	assert(onboarding.includes("tableState.queryParams"), "admin onboarding table sends server-side table params");
	assert(onboarding.includes("Current action"), "onboarding pages expose active workflow step");
	assert(onboarding.includes("TemplatePreview"), "new onboarding page previews selected templates");
	assert(onboarding.includes("Concierge intake"), "new onboarding page uses concierge intake workflow");
	assert(onboarding.includes("preferredChannel"), "new onboarding page persists tenant contact channel metadata");
	assert(onboarding.includes("staleDays"), "admin onboarding table exposes stuck-task filtering");
	assert(e2eSmoke.includes("tenant onboarding smoke renders workflow and command palette"), "E2E smoke covers tenant onboarding");
	assert(e2eSmoke.includes("admin onboarding smoke renders filterable operations table"), "E2E smoke covers admin onboarding table");
	assert(
		e2eSmoke.includes("admin onboarding new tenant renders concierge intake workflow"),
		"E2E smoke covers new tenant concierge intake",
	);
	assert(e2eSmoke.includes("search=Demo"), "E2E smoke covers bookmarkable admin table search");
}

function assertOnboardingServerTableQuery() {
	const dto = readProjectFile("apps/api/src/modules/onboarding/presentation/dtos/onboarding.dto.ts");
	const service = readProjectFile("apps/api/src/modules/onboarding/application/onboarding.service.ts");
	const hooks = readProjectFile("apps/web/src/features/onboarding/api/onboarding.hooks.ts");
	assert(dto.includes("search?: string"), "onboarding list DTO accepts search");
	assert(dto.includes("sort?: string"), "onboarding list DTO accepts sort");
	assert(dto.includes("staleDays?: number"), "onboarding list DTO accepts stale-day filtering");
	assert(service.includes("query.search?.trim()"), "onboarding list applies server-side search");
	assert(service.includes("onboardingSort(query.sort)"), "onboarding list applies server-side sort");
	assert(service.includes("query.staleDays"), "onboarding list applies server-side stale filtering");
	assert(hooks.includes("search?: string"), "web onboarding hook sends search param");
	assert(hooks.includes("sort?: string"), "web onboarding hook sends sort param");
	assert(hooks.includes("staleDays?: number"), "web onboarding hook sends stale-day filter param");
}

function assertWebBundleImportPolicy() {
	const viteConfig = readProjectFile("apps/web/vite.config.ts");
	const webSourceFiles = listProjectFiles("apps/web/src").filter((relPath) => /\.[cm]?[tj]sx?$/.test(relPath));
	const barrelIconImports = [];
	let hasDeepIconImport = false;

	for (const relPath of webSourceFiles) {
		const text = readProjectFile(relPath);
		if (text.includes('from "@hugeicons/core-free-icons"')) barrelIconImports.push(relPath);
		if (text.includes('from "@hugeicons/core-free-icons/')) hasDeepIconImport = true;
	}

	const iconTypes = readProjectFile("apps/web/src/types/hugeicons-core-free-icons.d.ts");
	assert(barrelIconImports.length === 0, "web avoids Hugeicons barrel imports", barrelIconImports.join(", "));
	assert(hasDeepIconImport, "web uses per-icon Hugeicons imports");
	assert(
		iconTypes.includes('declare module "@hugeicons/core-free-icons/*"'),
		"web declares Hugeicons per-icon module types",
	);
	assert(
		viteConfig.includes("INVALID_ANNOTATION") && viteConfig.includes("@hugeicons/core-free-icons"),
		"web build suppresses known Hugeicons annotation noise",
	);
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
	assertOnboardingServerTableQuery();
	assertWebBundleImportPolicy();
	assertGeneratedSecrets();

	console.log(`Base generated-project verification passed: ${checks.length} checks`);
	for (const check of checks) console.log(`- ${check}`);
}

main().catch((error) => {
	console.error(`Base generated-project verification failed: ${error.message}`);
	process.exit(1);
});
