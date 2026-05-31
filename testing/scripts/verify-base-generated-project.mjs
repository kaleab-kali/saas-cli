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
	"apps/acceptance/features/eims.feature",
	"apps/acceptance/steps/eims.steps.mjs",
	"apps/e2e/playwright.eims.config.ts",
	"apps/e2e/tests/eims-mock.spec.ts",
	"apps/performance/k6/eims-submit.js",
	"apps/performance/scripts/eims-mock-load.mjs",
	"apps/security/scripts/eims-security-smoke.mjs",
	"apps/web/src/features/eims",
	"apps/web/src/routes/_authenticated/eims",
	"apps/web/src/routes/admin/eims",
	"apps/api/prisma/seed-eims-entitlements.ts",
	"apps/api/prisma/seed-eims-onboarding-template.ts",
	"docs/EIMS_SETUP_GUIDE.md",
	"docs/EIMS_PHASE0_RUNBOOK.md",
	"docs/EIMS_VAULT_RUNBOOK.md",
	"docs/EIMS_COMPLIANCE_EVIDENCE.md",
	"docs/EIMS_TENANT_ONBOARDING.md",
	"docs/EIMS_DR_RUNBOOK.md",
];

const mustExist = [
	"apps/api/src/modules/onboarding/onboarding.module.ts",
	"apps/api/src/modules/onboarding/application/onboarding.service.spec.ts",
	"apps/api/src/modules/onboarding/infrastructure/crons/stale-onboarding.cron.spec.ts",
	"apps/api/src/modules/auth/guards/permissions.guard.spec.ts",
	"apps/api/src/modules/health/detailed-health.controller.ts",
	"apps/api/src/modules/health/health-diagnostics.service.ts",
	"apps/api/src/shared/filters/global-exception.filter.spec.ts",
	"apps/api/src/shared/interceptors/audit.interceptor.spec.ts",
	"apps/api/src/shared/i18n/money.util.ts",
	"apps/api/src/shared/i18n/time-zone.util.ts",
	"apps/api/src/shared/i18n/money.util.property.spec.ts",
	"apps/api/src/shared/i18n/phone.util.ts",
	"apps/api/src/shared/i18n/phone.util.property.spec.ts",
	"apps/api/src/shared/rate-limit/rate-limit.config.ts",
	"apps/api/src/shared/rate-limit/tenant-throttler.guard.ts",
	"apps/api/src/shared/rate-limit/tenant-throttler.guard.spec.ts",
	"apps/api/src/shared/types/address.ts",
	"apps/api-tests/scripts/with-mock-api.mjs",
	"apps/api-tests/scripts/run-http.mjs",
	"apps/api-tests/tests/tenant-isolation.spec.ts",
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
	const apiPackageJson = JSON.parse(readProjectFile("apps/api/package.json"));
	const apiTestsPackageJson = JSON.parse(readProjectFile("apps/api-tests/package.json"));
	const apiE2eSpec = readProjectFile("apps/api/test/app.e2e-spec.ts");
	const moneyUtil = readProjectFile("apps/api/src/shared/i18n/money.util.ts");
	const timeZoneUtil = readProjectFile("apps/api/src/shared/i18n/time-zone.util.ts");
	const moneyPropertySpec = readProjectFile("apps/api/src/shared/i18n/money.util.property.spec.ts");
	const phoneUtil = readProjectFile("apps/api/src/shared/i18n/phone.util.ts");
	const phonePropertySpec = readProjectFile("apps/api/src/shared/i18n/phone.util.property.spec.ts");
	const addressType = readProjectFile("apps/api/src/shared/types/address.ts");
	const apiHttpRunner = readProjectFile("apps/api-tests/scripts/run-http.mjs");
	const brunoRunner = readProjectFile("apps/api-tests/scripts/run-bruno.mjs");
	const securityPackageJson = JSON.parse(readProjectFile("apps/security/package.json"));
	const performancePackageJson = JSON.parse(readProjectFile("apps/performance/package.json"));
	const securityTooling = readProjectFile("apps/security/scripts/tooling-smoke.mjs");
	const performanceRunK6 = readProjectFile("apps/performance/scripts/run-k6.mjs");
	const performanceMockK6 = readProjectFile("apps/performance/scripts/mock-k6.mjs");
	const strykerConfig = readProjectFile("apps/api/stryker.conf.mjs");
	const testingGuide = readProjectFile("docs/TESTING_GUIDE.md");
	const deployCheck = packageJson.scripts?.["deploy:check"] ?? "";
	const testCi = packageJson.scripts?.["test:ci"] ?? "";
	const testSmoke = packageJson.scripts?.["test:smoke"] ?? "";
	const testIntegration = packageJson.scripts?.["test:integration"] ?? "";
	const testAll = packageJson.scripts?.["test:all"] ?? "";
	assert(deployCheck.includes("build:api"), "deploy gate includes API production build");
	assert(deployCheck.includes("build:web"), "deploy gate includes web production build");
	assert(deployCheck.includes("test:smoke"), "deploy gate runs broad smoke suite");
	assert(deployCheck.includes("test:security:tooling:strict"), "deploy gate fails when required security scanners are missing");
	assert(deployCheck.includes("test:performance:tooling:strict"), "deploy gate fails when k6 is missing");
	assert(deployCheck.includes("pnpm lint"), "deploy gate includes lint without duplicate Prisma generation");
	assert(deployCheck.includes("pnpm typecheck"), "deploy gate includes typecheck without duplicate Prisma generation");
	assert(!deployCheck.includes("lint:ci"), "deploy gate avoids nested lint:ci duplicate Prisma generation");
	assert(!deployCheck.includes("test:ci &&"), "deploy gate does not bypass browser smoke via narrow CI gate");
	assert(testCi.includes("test:api:http:mock"), "CI test gate includes mock HTTP API tests");
	assert(testCi.includes("test:api:bruno:mock"), "CI test gate includes mock Bruno API tests");
	assert(apiTestsPackageJson.scripts?.["test:http"] === "node scripts/run-http.mjs", "HTTP API command uses runner");
	assert(apiHttpRunner.includes("local deterministic mock API"), "HTTP API command has deterministic mock fallback");
	assert(apiHttpRunner.includes("scripts/with-mock-api.mjs"), "HTTP API command runs the mock API fallback");
	assert(apiTestsPackageJson.scripts?.["test:bruno"] === "node scripts/run-bruno.mjs", "Bruno API command uses runner");
	assert(brunoRunner.includes("local deterministic mock API"), "Bruno API command has deterministic mock fallback");
	assert(brunoRunner.includes("scripts/with-mock-api.mjs"), "Bruno API command runs the mock API fallback");
	assert(!brunoRunner.includes("Skipping Bruno API collection"), "Bruno API command does not silently skip");
	assert(testCi.includes("test:security:source"), "CI test gate includes deterministic source security checks");
	assert(testCi.includes("test:security:api"), "CI test gate includes deterministic API security checks");
	assert(testSmoke.includes("test:e2e:smoke"), "smoke test gate includes browser E2E smoke");
	assert(testSmoke.includes("test:security:source"), "smoke test gate includes deterministic source security checks");
	assert(testSmoke.includes("test:security:tooling"), "smoke test gate includes security tooling visibility");
	assert(securityPackageJson.scripts?.["test:tooling"] === "node scripts/tooling-smoke.mjs", "security workspace exposes tooling smoke command");
	assert(
		securityPackageJson.scripts?.["test:tooling:strict"] === "node scripts/tooling-smoke.mjs --strict",
		"security workspace exposes strict tooling smoke command",
	);
	assert(
		packageJson.scripts?.["test:security:tooling:strict"] === "pnpm --filter security test:tooling:strict",
		"base package exposes strict security tooling command",
	);
	assert(securityTooling.includes("missingTools"), "security tooling smoke tracks missing scanner tools");
	assert(securityTooling.includes("unusableTools"), "security tooling smoke tracks unusable scanner tools");
	assert(securityTooling.includes("versionArgs"), "security tooling smoke executes scanner version checks");
	assert(securityTooling.includes("SECURITY_TOOLING_TIMEOUT_MS"), "security tooling smoke bounds scanner version checks");
	assert(securityTooling.includes('process.argv.includes("--strict")'), "security tooling smoke supports strict CLI mode");
	assert(securityTooling.includes("SECURITY_STRICT_TOOLS"), "security tooling smoke supports strict production mode");
	assert(securityTooling.includes("process.exit(1)"), "security tooling smoke fails when strict tools are missing");
	assert(
		packageJson.scripts?.["test:performance:tooling:strict"] === "pnpm --filter performance test:k6:strict",
		"base package exposes strict performance tooling command",
	);
	assert(
		performancePackageJson.scripts?.["test:k6:strict"] === "node scripts/mock-k6.mjs --strict",
		"performance workspace exposes strict k6 command",
	);
	assert(performanceRunK6.includes('process.argv.includes("--strict")'), "k6 runner supports strict CLI mode");
	assert(performanceMockK6.includes('process.argv.includes("--strict")'), "k6 mock runner supports strict CLI mode");
	assert(performanceMockK6.includes("PERFORMANCE_STRICT_TOOLS"), "k6 mock runner supports strict env mode");
	assert(packageJson.scripts?.["test:unit"] === "pnpm test:api", "base package exposes fast unit test category");
	assert(testIntegration.includes("test:api:e2e"), "integration test category includes API e2e harness");
	assert(testIntegration.includes("test:api:http:mock"), "integration test category includes mock HTTP API tests");
	assert(testIntegration.includes("test:api:contract:smoke"), "integration test category includes OpenAPI smoke contract");
	assert(moneyUtil.includes("minorToDecimalString"), "API shared i18n has minor-unit money formatter");
	assert(moneyUtil.includes("decimalStringToMinor"), "API shared i18n has decimal-to-minor parser");
	assert(timeZoneUtil.includes("formatDateInTimeZone"), "API shared i18n has tenant timezone date formatting");
	assert(moneyPropertySpec.includes("round-trips safe minor-unit amounts"), "money utilities have property coverage");
	assert(phoneUtil.includes("normalizePhoneNumber"), "API shared i18n has phone normalization");
	assert(phoneUtil.includes("E164_PATTERN"), "phone utility validates E.164 output");
	assert(phonePropertySpec.includes("Ethiopian local mobile numbers"), "phone utilities have property coverage");
	assert(addressType.includes("subCity") && addressType.includes("woreda"), "API shared types include reusable address value object");
	assert(apiPackageJson.scripts?.["test:property"]?.includes("money.util.property.spec.ts"), "property test gate includes money utilities");
	assert(apiPackageJson.scripts?.["test:property"]?.includes("phone.util.property.spec.ts"), "property test gate includes phone utilities");
	assert(packageJson.scripts?.["test:coverage"] === "pnpm --filter api test:coverage", "base package exposes API coverage command");
	assert(testAll.includes("test:mutation"), "full local gate includes mutation testing");
	assert(testAll.includes("test:performance"), "full local gate includes performance testing");
	assert(testAll.includes("test:security"), "full local gate includes security testing");
	assert(packageJson.scripts?.["test:full"] === "pnpm test:all", "base package exposes full test category alias");
	assert(apiPackageJson.scripts?.["test:unit"] === "jest --runInBand", "API workspace exposes unit test command");
	assert(apiPackageJson.scripts?.["test:integration"]?.includes("jest-e2e.json"), "API workspace exposes integration test command");
	assert(apiE2eSpec.includes("local-api-e2e-harness"), "API e2e has deterministic local fallback harness");
	assert(!apiE2eSpec.includes("describe.skip"), "API e2e does not silently skip when no base URL is set");
	assert(!apiE2eSpec.includes("Skipping API e2e"), "API e2e fallback executes instead of logging a skip");
	assert(apiPackageJson.scripts?.["test:coverage"]?.includes("--coverage"), "API workspace exposes coverage test command");
	assert(apiPackageJson.jest?.collectCoverageFrom?.includes("!generated/**"), "coverage excludes generated Prisma output");
	assert(apiPackageJson.jest?.collectCoverageFrom?.includes("!**/*.module.ts"), "coverage excludes Nest module wiring");
	assert(apiPackageJson.jest?.coverageThreshold?.global?.statements >= 5, "coverage has a global scaffold baseline");
	assert(apiPackageJson.jest?.coverageThreshold?.global?.branches >= 4, "coverage has a branch baseline");
	assert(
		apiPackageJson.jest?.coverageThreshold?.["src/modules/billing/application/services/policy.service.ts"]?.statements ===
			100,
		"coverage enforces strict billing policy threshold",
	);
	assert(
		apiPackageJson.jest?.coverageThreshold?.["src/modules/onboarding/application/onboarding.service.ts"]?.lines >= 75,
		"coverage enforces onboarding workflow service threshold",
	);
	assert(
		apiPackageJson.jest?.coverageThreshold?.["src/modules/auth/guards/permissions.guard.ts"]?.lines >= 95,
		"coverage enforces permission guard threshold",
	);
	assert(
		apiPackageJson.jest?.coverageThreshold?.["src/shared/interceptors/audit.interceptor.ts"]?.lines >= 95,
		"coverage enforces audit interceptor threshold",
	);
	assert(
		apiPackageJson.jest?.coverageThreshold?.["src/shared/filters/global-exception.filter.ts"]?.lines >= 95,
		"coverage enforces exception filter threshold",
	);
	assert(
		apiPackageJson.jest?.coverageThreshold?.["src/shared/crypto/cipher.service.ts"]?.branches >= 80,
		"coverage enforces critical crypto threshold",
	);
	assert(
		apiPackageJson.jest?.coverageThreshold?.["src/shared/rate-limit/tenant-throttler.guard.ts"]?.lines >= 85,
		"coverage enforces tenant rate-limit threshold",
	);
	assert(strykerConfig.includes("testRunnerNodeArgs"), "mutation test config sets explicit test-runner Node args");
	assert(strykerConfig.includes("--max-old-space-size=4096"), "mutation test runner has heap headroom");
	assert(testingGuide.includes("excludes generated Prisma code"), "testing docs explain actionable coverage scope");
	assert(
		testingGuide.includes("concierge onboarding workflow state"),
		"testing docs explain onboarding coverage threshold",
	);
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
	assert(codeQuality.includes("actions/setup-go@v5"), "production gate installs Go for security scanners");
	assert(codeQuality.includes("python -m pipx install semgrep"), "production gate installs Semgrep scanner");
	assert(codeQuality.includes("github.com/gitleaks/gitleaks"), "production gate installs gitleaks scanner");
	assert(codeQuality.includes("github.com/google/osv-scanner"), "production gate installs osv-scanner");
	assert(codeQuality.includes("github.com/projectdiscovery/nuclei"), "production gate installs nuclei scanner");
	assert(codeQuality.includes("go.k6.io/k6"), "production gate installs k6 load-test runner");
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

function assertTenantIsolationTestSurface() {
	const tenantIsolationTest = readProjectFile("apps/api-tests/tests/tenant-isolation.spec.ts");
	const mockApi = readProjectFile("apps/api-tests/scripts/with-mock-api.mjs");
	const testingDocs = readProjectFile("docs/TESTING_GUIDE.md");
	assert(tenantIsolationTest.includes("tenant isolation API smoke"), "API tests include tenant isolation smoke");
	assert(tenantIsolationTest.includes('organizationId: "org_2"'), "tenant isolation test attempts cross-org writes");
	assert(tenantIsolationTest.includes("crossTenantSettingsWrite.status()).toBe(403)"), "tenant isolation test denies settings takeover");
	assert(tenantIsolationTest.includes("crossTenantInvite.status()).toBe(403)"), "tenant isolation test denies cross-org invites");
	assert(mockApi.includes("membersByOrg"), "mock API models per-tenant members");
	assert(mockApi.includes("orgSettingsByOrg"), "mock API models per-tenant settings");
	assert(mockApi.includes("cross-tenant organization access denied"), "mock API rejects cross-tenant organization IDs");
	assert(testingDocs.includes("tenant-isolation smoke test"), "testing docs describe tenant isolation smoke coverage");
}

function assertHealthObservabilitySurface() {
	const healthModule = readProjectFile("apps/api/src/modules/health/health.module.ts");
	const healthController = readProjectFile("apps/api/src/modules/health/health.controller.ts");
	const detailedHealth = readProjectFile("apps/api/src/modules/health/detailed-health.controller.ts");
	const diagnostics = readProjectFile("apps/api/src/modules/health/health-diagnostics.service.ts");
	const main = readProjectFile("apps/api/src/main.ts");
	const healthApiTest = readProjectFile("apps/api-tests/tests/health.spec.ts");
	const openApiSmoke = readProjectFile("apps/api-tests/openapi/openapi-smoke.yaml");
	const observabilityDocs = readProjectFile("docs/OBSERVABILITY.md");
	assert(healthModule.includes("DetailedHealthController"), "health module registers detailed health controller");
	assert(healthModule.includes("HealthDiagnosticsService"), "health module registers diagnostics service");
	assert(main.includes('path: "health/live"'), "liveness endpoint is excluded from global API prefix");
	assert(main.includes('path: "health/ready"'), "readiness endpoint is excluded from global API prefix");
	assert(healthController.includes("this.diagnostics.readiness()"), "public readiness uses shared diagnostics service");
	assert(detailedHealth.includes('@Controller("health")'), "detailed health keeps health route namespace");
	assert(detailedHealth.includes("@UseGuards(SuperAdminGuard)"), "detailed health requires super-admin guard");
	assert(detailedHealth.includes('@Get("detailed")'), "detailed health exposes /api/v1/health/detailed");
	assert(diagnostics.includes("checkDisk"), "detailed health checks disk space");
	assert(diagnostics.includes("checkMemory"), "detailed health checks memory pressure");
	assert(diagnostics.includes("checkEimsReachability"), "detailed health checks optional EIMS reachability");
	assert(diagnostics.includes("failedLast5m"), "detailed health reports recent job failures");
	assert(healthApiTest.includes("/api/v1/health/detailed"), "HTTP API tests cover detailed health access control");
	assert(openApiSmoke.includes("/api/v1/health/detailed"), "OpenAPI smoke contract includes detailed health endpoint");
	assert(observabilityDocs.includes("/api/v1/health/detailed"), "observability docs document detailed health endpoint");
}

function assertUploadHardeningSurface() {
	const main = readProjectFile("apps/api/src/main.ts");
	const uploadService = readProjectFile("apps/api/src/modules/upload/application/upload.service.ts");
	const uploadSpec = readProjectFile("apps/api/src/modules/upload/application/upload.service.spec.ts");
	const localDriver = readProjectFile("apps/api/src/shared/storage/local-storage.driver.ts");
	const sourceSecurity = readProjectFile("apps/security/scripts/source-security-check.mjs");
	const securityDocs = readProjectFile("docs/SECURITY.md");
	assert(main.includes("X-Content-Type-Options"), "served upload assets set nosniff headers");
	assert(main.includes("Content-Security-Policy"), "served upload assets set restrictive CSP");
	assert(uploadService.includes("UPLOAD_TYPE_POLICIES"), "upload service has explicit MIME policies");
	assert(uploadService.includes("UPLOAD_ALLOWED_MIME_TYPES"), "upload service supports configurable MIME allowlist");
	assert(uploadService.includes("file content does not match declared type"), "upload service checks file signatures");
	assert(uploadService.includes("text upload contains unsafe content"), "upload service rejects unsafe text uploads");
	assert(uploadSpec.includes("rejects extension and content mismatches"), "upload tests cover spoofed file rejection");
	assert(uploadSpec.includes("rejects SVG and HTML-style text uploads"), "upload tests cover active-content rejection");
	assert(localDriver.includes("safeUploadsPath"), "local storage protects against path traversal");
	assert(sourceSecurity.includes("uploads must validate binary signatures"), "source security gate enforces upload hardening");
	assert(securityDocs.includes("UPLOAD_ALLOWED_MIME_TYPES"), "security docs document upload MIME allowlist configuration");
}

function assertTenantAwareRateLimitSurface() {
	const appModule = readProjectFile("apps/api/src/app.module.ts");
	const tenantThrottler = readProjectFile("apps/api/src/shared/rate-limit/tenant-throttler.guard.ts");
	const rateLimitConfig = readProjectFile("apps/api/src/shared/rate-limit/rate-limit.config.ts");
	const rateLimitSpec = readProjectFile("apps/api/src/shared/rate-limit/tenant-throttler.guard.spec.ts");
	const apiConventions = readProjectFile("docs/API_CONVENTIONS.md");
	const securityDocs = readProjectFile("docs/SECURITY.md");
	const sourceSecurity = readProjectFile("apps/security/scripts/source-security-check.mjs");
	const envExample = readProjectFile(".env.example");
	const envProduction = readProjectFile(".env.production.example");
	assert(appModule.includes("TenantThrottlerGuard"), "global throttler uses tenant-aware guard");
	assert(!appModule.includes("useClass: ThrottlerGuard"), "global throttler no longer uses raw IP-only guard");
	assert(appModule.includes("apiRateLimitPerTenant()"), "global throttler uses configurable tenant limit");
	assert(tenantThrottler.includes("tenant:"), "tenant throttler isolates organization buckets");
	assert(tenantThrottler.includes("admin:"), "tenant throttler isolates admin buckets");
	assert(tenantThrottler.includes("api-key:"), "tenant throttler supports API-key buckets when present");
	assert(tenantThrottler.includes("auth.api.getSession"), "tenant throttler resolves tenant sessions before IP fallback");
	assert(tenantThrottler.includes("adminAuth.api.getSession"), "tenant throttler resolves admin sessions before IP fallback");
	assert(rateLimitConfig.includes("API_RATE_LIMIT_PER_TENANT"), "rate limit config exposes tenant limit env var");
	assert(rateLimitSpec.includes("tenant:org_2"), "rate limit tests cover tenant session tracking");
	assert(rateLimitSpec.includes("admin:admin_1"), "rate limit tests cover admin session tracking");
	assert(rateLimitSpec.includes("ip:203.0.113.10"), "rate limit tests cover anonymous IP fallback");
	assert(apiConventions.includes("TenantThrottlerGuard"), "API conventions document tenant-aware rate limiting");
	assert(securityDocs.includes("API_RATE_LIMIT_PER_TENANT"), "security docs document rate limit env vars");
	assert(sourceSecurity.includes("rate limiting must isolate tenant request buckets"), "source security gate enforces tenant rate limits");
	assert(envExample.includes("API_RATE_LIMIT_PER_TENANT=60"), "env example includes rate limit tenant default");
	assert(envProduction.includes("API_RATE_LIMIT_PER_TENANT=60"), "production env example includes rate limit tenant default");
}

function assertAuditAndErrorSecuritySurface() {
	const permissionsSpec = readProjectFile("apps/api/src/modules/auth/guards/permissions.guard.spec.ts");
	const auditSpec = readProjectFile("apps/api/src/shared/interceptors/audit.interceptor.spec.ts");
	const exceptionSpec = readProjectFile("apps/api/src/shared/filters/global-exception.filter.spec.ts");
	const loggerConstants = readProjectFile("apps/api/src/shared/logger/logger.constants.ts");
	const sourceSecurity = readProjectFile("apps/security/scripts/source-security-check.mjs");
	assert(permissionsSpec.includes("rejects as soon as one required permission is missing"), "permission guard tests denial path");
	assert(auditSpec.includes("persists a redacted success audit record"), "audit interceptor tests redacted success records");
	assert(auditSpec.includes("persists failure audit records"), "audit interceptor tests failure records");
	assert(exceptionSpec.includes("sanitizes Nest 404 route messages"), "exception filter tests route sanitization");
	assert(exceptionSpec.includes("returns a generic 500 response"), "exception filter tests generic server errors");
	assert(loggerConstants.includes('"apiKey"'), "sensitive-field list redacts API keys");
	assert(loggerConstants.includes('"privateKey"'), "sensitive-field list redacts private keys");
	assert(sourceSecurity.includes("log redaction must cover API key fields"), "source security gate enforces API key redaction");
	assert(sourceSecurity.includes("audit logging must redact request bodies"), "source security gate enforces audit body redaction");
}

function assertOnboardingFirstEntry() {
	const rootIndex = readProjectFile("apps/web/src/routes/index.tsx");
	const loginPage = readProjectFile("apps/web/src/routes/login.tsx");
	assert(rootIndex.includes('<Navigate to="/onboarding" />'), "tenant root opens onboarding first");
	assert(loginPage.includes('window.location.href = "/onboarding";'), "tenant login opens onboarding first");
}

function assertFrontendImprovementSurface() {
	const topBar = readProjectFile("apps/web/src/components/layout/TopBar.tsx");
	const adminRoute = readProjectFile("apps/web/src/routes/admin.tsx");
	const commandPalette = readProjectFile("apps/web/src/shared/components/CommandPalette.tsx");
	const dataTable = readProjectFile("apps/web/src/shared/components/DataTable.tsx");
	const onboarding = readProjectFile("apps/web/src/features/onboarding/components/onboarding-pages.tsx");
	const adminOrganizations = readProjectFile("apps/web/src/features/admin/components/OrgTable.tsx");
	const adminOrganizationsRoute = readProjectFile("apps/web/src/routes/admin/organizations/index.tsx");
	const adminOrganizationDetail = readProjectFile("apps/web/src/routes/admin/organizations/$orgId.tsx");
	const adminOrgEntitlementOverrides = readProjectFile(
		"apps/web/src/features/admin/components/OrgEntitlementOverridesPanel.tsx",
	);
	const adminOrganizationsHandler = readProjectFile("apps/api/src/modules/admin/application/queries/list-organizations.handler.ts");
	const featureFlags = readProjectFile("apps/web/src/routes/admin/feature-flags/index.tsx");
	const adminUsers = readProjectFile("apps/web/src/routes/admin/users/index.tsx");
	const adminUsersHandler = readProjectFile("apps/api/src/modules/admin/application/queries/list-users.handler.ts");
	const adminAuditLogs = readProjectFile("apps/web/src/routes/admin/audit-logs/index.tsx");
	const adminAuditHandler = readProjectFile("apps/api/src/modules/admin/application/queries/list-platform-audit-logs.handler.ts");
	const adminBilling = readProjectFile("apps/web/src/routes/admin/billing/index.tsx");
	const adminBillingDashboard = readProjectFile("apps/web/src/routes/admin/billing/dashboard.tsx");
	const adminPlanDetail = readProjectFile("apps/web/src/routes/admin/plans/$planId.tsx");
	const authShell = readProjectFile("apps/web/src/shared/components/AuthShell.tsx");
	const opsGuide = readProjectFile("docs/ADMIN_OPERATIONS_GUIDE.md");
	const e2eSmoke = readProjectFile("apps/e2e/tests/smoke.spec.ts");
	assert(topBar.includes("<CommandPalette />"), "top bar exposes command palette");
	assert(topBar.includes("Workspace command center"), "top bar exposes visible command-center shell");
	assert(commandPalette.includes("WORKSPACE_COMMANDS"), "command palette exposes workspace command registry");
	assert(commandPalette.includes("ADMIN_COMMANDS"), "command palette exposes admin command registry");
	assert(commandPalette.includes("buttonLabel"), "command palette can be reused across shells");
	assert(adminRoute.includes("ADMIN_COMMANDS"), "admin shell uses admin command palette registry");
	assert(adminRoute.includes('buttonLabel="Admin command"'), "admin top banner exposes visible admin command palette");
	assert(opsGuide.includes("separate admin command registry"), "admin operations guide documents admin command palette");
	assert(authShell.includes("SaaS launch console"), "auth screens use visible product console shell");
	assert(dataTable.includes("useDebouncedValue"), "DataTable has debounced global search");
	assert(dataTable.includes("useDataTableState"), "DataTable exposes URL-synced state hook");
	assert(dataTable.includes("useSearch({ strict: false })"), "DataTable state reads TanStack Router search params");
	assert(dataTable.includes("manualPagination"), "DataTable supports server-side pagination");
	assert(dataTable.includes("DataTableColumnFilter"), "DataTable renders per-column filters");
	assert(dataTable.includes("DropdownMenuCheckboxItem"), "DataTable has column visibility controls");
	assert(dataTable.includes("enableCsvExport"), "DataTable exposes opt-in CSV exports");
	assert(dataTable.includes("downloadCsv"), "DataTable implements reusable CSV download");
	assert(dataTable.includes("useVirtualizer"), "DataTable uses TanStack Virtual for large row sets");
	assert(dataTable.includes("virtualizeRows"), "DataTable exposes opt-in row virtualization");
	assert(dataTable.includes("DataTableSavedViews"), "DataTable integrates saved views");
	assert(dataTable.includes("useSavedViews"), "DataTable uses saved-view hooks");
	assert(dataTable.includes("DataTableBulkActions"), "DataTable exposes bulk actions for selected rows");
	assert(dataTable.includes("RowSelectionState"), "DataTable supports row selection state");
	assert(onboarding.includes("Concierge launch workflow"), "tenant onboarding uses visible launch workflow console");
	assert(onboarding.includes("AssistedLaunchDesk"), "tenant onboarding shows assisted launch desk");
	assert(onboarding.includes("Concierge onboarding"), "admin onboarding uses concierge operations copy");
	assert(onboarding.includes("AdminConciergeQueueBoard"), "admin onboarding shows concierge launch queue board");
	assert(onboarding.includes("<DataTable"), "admin onboarding list uses shared DataTable");
	assert(onboarding.includes("useDataTableState"), "admin onboarding table syncs table state to URL");
	assert(onboarding.includes("tableState.queryParams"), "admin onboarding table sends server-side table params");
	assert(onboarding.includes("Current action"), "onboarding pages expose active workflow step");
	assert(onboarding.includes("ConciergeIntakeHandoffPanel"), "new onboarding page shows launch handoff summary");
	assert(onboarding.includes("TemplatePreview"), "new onboarding page previews selected templates");
	assert(onboarding.includes("Concierge intake"), "new onboarding page uses concierge intake workflow");
	assert(onboarding.includes("preferredChannel"), "new onboarding page persists tenant contact channel metadata");
	assert(onboarding.includes("staleDays"), "admin onboarding table exposes stuck-task filtering");
	assert(onboarding.includes("enableCsvExport"), "admin onboarding table enables CSV export");
	assert(onboarding.includes("savedViewsEntity"), "admin onboarding table enables saved views");
	assert(onboarding.includes("bulkActions"), "admin onboarding table enables bulk actions");
	assert(adminOrganizations.includes("<DataTable"), "admin organizations use shared DataTable");
	assert(adminOrganizations.includes("useDataTableState"), "admin organizations sync table controls to URL");
	assert(adminOrganizations.includes("savedViewsEntity"), "admin organizations enable saved views");
	assert(adminOrganizations.includes("enableCsvExport"), "admin organizations enable CSV export");
	assert(!adminOrganizationsRoute.includes("<Input"), "admin organizations use DataTable search instead of separate input");
	assert(adminOrganizationsHandler.includes("organizationSort(params.sort)"), "admin organizations apply server-side sorting");
	assert(adminOrganizationsHandler.includes("members: { some:"), "admin organizations search owner member emails");
	assert(opsGuide.includes("organization directory uses the shared DataTable"), "admin operations guide documents organization table");
	assert(adminOrganizationDetail.includes("<DataTable"), "admin organization detail uses shared DataTable");
	assert(adminOrganizationDetail.includes("Search members"), "admin organization detail member roster is searchable");
	assert(adminOrganizationDetail.includes("enableCsvExport"), "admin organization detail member roster exports CSV");
	assert(adminOrganizationDetail.includes("savedViewsEntity"), "admin organization detail member roster has saved views");
	assert(adminOrgEntitlementOverrides.includes("<DataTable"), "admin organization overrides use shared DataTable");
	assert(adminOrgEntitlementOverrides.includes("Search overrides"), "admin organization overrides are searchable");
	assert(adminOrgEntitlementOverrides.includes("enableCsvExport"), "admin organization overrides export CSV");
	assert(adminOrgEntitlementOverrides.includes("savedViewsEntity"), "admin organization overrides have saved views");
	assert(
		opsGuide.includes("Tenant detail pages use the same DataTable surface"),
		"admin operations guide documents organization detail tables",
	);
	assert(featureFlags.includes("<DataTable"), "admin feature flags use shared DataTable");
	assert(featureFlags.includes("useDataTableState"), "admin feature flags sync table controls to URL");
	assert(featureFlags.includes("savedViewsEntity"), "admin feature flags enable saved views");
	assert(featureFlags.includes("enableCsvExport"), "admin feature flags enable CSV export");
	assert(featureFlags.includes("bulkActions"), "admin feature flags expose bulk global rollout actions");
	assert(featureFlags.includes("<Switch"), "admin feature flags use switches for binary rollout state");
	assert(featureFlags.includes("OrgOverrideDialog"), "admin feature flags keep org override workflow in-table");
	assert(opsGuide.includes("Feature Flag Management"), "admin operations guide documents feature flag rollout table");
	assert(adminAuditLogs.includes("<DataTable"), "admin audit logs use shared DataTable");
	assert(adminAuditLogs.includes("useDataTableState"), "admin audit logs sync table controls to URL");
	assert(adminAuditLogs.includes("savedViewsEntity"), "admin audit logs enable saved views");
	assert(adminAuditLogs.includes("enableCsvExport"), "admin audit logs enable current-page CSV export");
	assert(adminAuditLogs.includes("Export all CSV"), "admin audit logs keep full evidence export action");
	assert(adminAuditHandler.includes("params.search?.trim()"), "admin audit logs apply server-side search");
	assert(adminAuditHandler.includes("auditLogSort(params.sort)"), "admin audit logs apply server-side sorting");
	assert(adminAuditHandler.includes('mode: "insensitive"'), "admin audit logs apply case-insensitive filters");
	assert(opsGuide.includes("Audit Evidence"), "admin operations guide documents audit evidence table");
	assert(adminUsers.includes("<DataTable"), "admin users use shared DataTable");
	assert(adminUsers.includes("useDataTableState"), "admin users sync table controls to URL");
	assert(adminUsers.includes("savedViewsEntity"), "admin users enable saved views");
	assert(adminUsers.includes("enableCsvExport"), "admin users enable CSV export");
	assert(adminUsers.includes("UserActions"), "admin users keep impersonation and reset actions");
	assert(adminUsersHandler.includes("userSort(params.sort)"), "admin users apply server-side sorting");
	assert(adminUsersHandler.includes("parseBooleanFilter(params.verified)"), "admin users apply verified-email filtering");
	assert(opsGuide.includes("Platform User Management"), "admin operations guide documents platform user table");
	assert(adminBilling.includes("<DataTable"), "admin billing subscriptions use shared DataTable");
	assert(adminBilling.includes("Search subscriptions"), "admin billing subscriptions are searchable");
	assert(adminBilling.includes("enableCsvExport"), "admin billing subscriptions export CSV");
	assert(adminBilling.includes("savedViewsEntity"), "admin billing subscriptions have saved views");
	assert(opsGuide.includes("subscription index uses the shared DataTable"), "admin operations guide documents billing table");
	assert(adminPlanDetail.includes("<DataTable"), "admin plan detail entitlements use shared DataTable");
	assert(adminPlanDetail.includes("Search entitlements"), "admin plan detail entitlements are searchable");
	assert(adminPlanDetail.includes("enableCsvExport"), "admin plan detail entitlements export CSV");
	assert(adminPlanDetail.includes("savedViewsEntity"), "admin plan detail entitlements have saved views");
	assert(adminPlanDetail.includes("<Switch"), "admin plan detail entitlements use switches");
	assert(
		opsGuide.includes("Plan detail pages use DataTable for feature entitlement review"),
		"admin operations guide documents plan entitlement table",
	);
	assert(adminBillingDashboard.includes("<DataTable"), "admin billing dashboard uses shared DataTable");
	assert(adminBillingDashboard.includes("Search plan revenue"), "admin billing dashboard plan revenue is searchable");
	assert(adminBillingDashboard.includes("Search past-due invoices"), "admin billing dashboard past-due invoices are searchable");
	assert(adminBillingDashboard.includes("Search pending payments"), "admin billing dashboard pending payments are searchable");
	assert(adminBillingDashboard.includes("enableCsvExport"), "admin billing dashboard tables export CSV");
	assert(adminBillingDashboard.includes("savedViewsEntity"), "admin billing dashboard tables have saved views");
	assert(
		opsGuide.includes("billing dashboard uses DataTable for revenue by plan"),
		"admin operations guide documents billing dashboard tables",
	);
	assert(e2eSmoke.includes("tenant onboarding smoke renders workflow and command palette"), "E2E smoke covers tenant onboarding");
	assert(e2eSmoke.includes("Admin command"), "E2E smoke covers admin command palette trigger");
	assert(e2eSmoke.includes("Billing dashboard"), "E2E smoke covers admin command palette routes");
	assert(e2eSmoke.includes("Operational handoff map"), "E2E smoke covers assisted launch desk");
	assert(e2eSmoke.includes("admin onboarding smoke renders filterable operations table"), "E2E smoke covers admin onboarding table");
	assert(e2eSmoke.includes("Export CSV"), "E2E smoke covers admin onboarding CSV export control");
	assert(e2eSmoke.includes("Saved views"), "E2E smoke covers admin onboarding saved-view controls");
	assert(e2eSmoke.includes("Bulk actions"), "E2E smoke covers admin onboarding bulk actions");
	assert(e2eSmoke.includes("Queue by owner and risk"), "E2E smoke covers admin concierge queue board");
	assert(
		e2eSmoke.includes("admin onboarding new tenant renders concierge intake workflow"),
		"E2E smoke covers new tenant concierge intake",
	);
	assert(e2eSmoke.includes("Create a staff-owned workflow"), "E2E smoke covers new onboarding handoff summary");
	assert(e2eSmoke.includes("search=Demo"), "E2E smoke covers bookmarkable admin table search");
	assert(e2eSmoke.includes("admin feature flags smoke renders rollout table"), "E2E smoke covers admin feature flag table");
	assert(e2eSmoke.includes("Toggle platform.api-keys globally"), "E2E smoke covers feature flag switch controls");
	assert(e2eSmoke.includes("admin audit logs smoke renders filterable evidence table"), "E2E smoke covers admin audit log table");
	assert(e2eSmoke.includes("admin users smoke renders searchable user table"), "E2E smoke covers admin users table");
	assert(
		e2eSmoke.includes("admin organizations smoke renders tenant directory table"),
		"E2E smoke covers admin organizations table",
	);
	assert(
		e2eSmoke.includes("admin organization detail smoke renders member and entitlement tables"),
		"E2E smoke covers admin organization detail tables",
	);
	assert(
		e2eSmoke.includes("admin billing smoke renders searchable subscription table"),
		"E2E smoke covers admin billing subscription table",
	);
	assert(
		e2eSmoke.includes("admin plan detail smoke renders editable entitlement table"),
		"E2E smoke covers admin plan detail entitlement table",
	);
	assert(
		e2eSmoke.includes("admin billing dashboard smoke renders operational tables"),
		"E2E smoke covers admin billing dashboard tables",
	);
}

function assertOnboardingServerTableQuery() {
	const dto = readProjectFile("apps/api/src/modules/onboarding/presentation/dtos/onboarding.dto.ts");
	const module = readProjectFile("apps/api/src/modules/onboarding/onboarding.module.ts");
	const service = readProjectFile("apps/api/src/modules/onboarding/application/onboarding.service.ts");
	const serviceSpec = readProjectFile("apps/api/src/modules/onboarding/application/onboarding.service.spec.ts");
	const staleCron = readProjectFile("apps/api/src/modules/onboarding/infrastructure/crons/stale-onboarding.cron.ts");
	const staleCronSpec = readProjectFile("apps/api/src/modules/onboarding/infrastructure/crons/stale-onboarding.cron.spec.ts");
	const hooks = readProjectFile("apps/web/src/features/onboarding/api/onboarding.hooks.ts");
	assert(service.includes('key: "tenant-intake"'), "generic onboarding starts with staff tenant intake");
	assert(service.includes('key: "first-workflow-check"'), "generic onboarding includes first workflow verification");
	assert(serviceSpec.includes("prevents tenant self-service completion"), "onboarding service tests tenant self-service guardrails");
	assert(serviceSpec.includes("builds filterable, sorted task queries"), "onboarding service tests queue filtering and sorting");
	assert(serviceSpec.includes("marks the workflow complete"), "onboarding service tests workflow completion");
	assert(module.includes("NotificationModule"), "onboarding module imports notification infrastructure");
	assert(staleCron.includes("CreateNotificationHandler"), "stale onboarding cron sends staff notifications");
	assert(staleCron.includes("onboarding.task.stale"), "stale onboarding cron uses a traceable notification source event");
	assert(staleCronSpec.includes("notifies assigned staff"), "stale onboarding cron has notification coverage");
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

function assertWebTableMarkupPolicy() {
	const sourceSecurity = readProjectFile("apps/security/scripts/source-security-check.mjs");
	const webSourceFiles = listProjectFiles("apps/web/src").filter((relPath) => /\.[cm]?[tj]sx?$/.test(relPath));
	const rawTableFiles = webSourceFiles.filter((relPath) => {
		const normalizedPath = relPath.replaceAll("\\", "/");
		if (normalizedPath === "apps/web/src/components/ui/table.tsx") return false;
		return /<\/?(table|thead|tbody|tfoot|tr|th|td)\b/.test(readProjectFile(relPath));
	});

	assert(rawTableFiles.length === 0, "web source avoids raw table markup outside table primitive", rawTableFiles.join(", "));
	assert(sourceSecurity.includes("renders raw table markup"), "source security gate enforces shared table primitives");
}

function assertApiFormattingPolicy() {
	const sourceSecurity = readProjectFile("apps/security/scripts/source-security-check.mjs");
	const apiSourceFiles = listProjectFiles("apps/api/src").filter((relPath) => /\.[cm]?[tj]sx?$/.test(relPath));
	const adHocFormatFiles = apiSourceFiles.filter((relPath) => {
		const normalizedPath = relPath.replaceAll("\\", "/");
		if (normalizedPath.startsWith("apps/api/src/shared/i18n/")) return false;
		return (
			/\.(toLocaleString|toLocaleDateString|toFixed)\s*\(/.test(readProjectFile(relPath)) ||
			/\bIntl\.(NumberFormat|DateTimeFormat)\s*\(/.test(readProjectFile(relPath))
		);
	});

	assert(adHocFormatFiles.length === 0, "API source uses shared i18n formatters", adHocFormatFiles.join(", "));
	assert(sourceSecurity.includes("uses ad hoc formatting"), "source security gate enforces shared i18n formatters");
}

function assertAdminJobsQueueSurface() {
	const queueMonitor = readProjectFile("apps/api/src/modules/admin/application/services/queue-monitor.service.ts");
	const jobsController = readProjectFile("apps/api/src/modules/admin/presentation/controllers/admin-jobs.controller.ts");
	const jobsHooks = readProjectFile("apps/web/src/features/admin/api/admin-jobs.hooks.ts");
	const jobsPage = readProjectFile("apps/web/src/routes/admin/jobs/index.tsx");
	const opsGuide = readProjectFile("docs/ADMIN_OPERATIONS_GUIDE.md");
	assert(queueMonitor.includes("retryFailedJob"), "queue monitor can retry failed BullMQ jobs");
	assert(
		jobsController.includes('queues/:queueName/failed/:jobId/retry'),
		"admin jobs API exposes failed queue job retry",
	);
	assert(jobsHooks.includes("useRetryQueueJob"), "admin jobs web hooks expose failed queue job retry");
	assert(jobsPage.includes("<DataTable"), "admin jobs recent runs use shared DataTable");
	assert(jobsPage.includes("enableCsvExport"), "admin jobs recent runs export CSV through shared DataTable");
	assert(jobsPage.includes("Retry"), "admin jobs page renders failed queue job retry controls");
	assert(opsGuide.includes("can be retried directly"), "admin operations guide documents failed queue retries");
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
	assertTenantIsolationTestSurface();
	assertHealthObservabilitySurface();
	assertUploadHardeningSurface();
	assertTenantAwareRateLimitSurface();
	assertAuditAndErrorSecuritySurface();
	assertOnboardingFirstEntry();
	assertFrontendImprovementSurface();
	assertOnboardingServerTableQuery();
	assertWebBundleImportPolicy();
	assertWebTableMarkupPolicy();
	assertApiFormattingPolicy();
	assertAdminJobsQueueSurface();
	assertGeneratedSecrets();

	console.log(`Base generated-project verification passed: ${checks.length} checks`);
	for (const check of checks) console.log(`- ${check}`);
}

main().catch((error) => {
	console.error(`Base generated-project verification failed: ${error.message}`);
	process.exit(1);
});
