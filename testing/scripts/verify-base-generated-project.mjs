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
			authSecret: "base-scaffold-proof-better-auth-secret-32-bytes",
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

	console.log(`Base generated-project verification passed: ${checks.length} checks`);
	for (const check of checks) console.log(`- ${check}`);
}

main().catch((error) => {
	console.error(`Base generated-project verification failed: ${error.message}`);
	process.exit(1);
});
