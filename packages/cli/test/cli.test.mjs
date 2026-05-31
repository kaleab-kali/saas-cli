import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseArgs } from "../src/args.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(cliRoot, "../..");
const binPath = path.join(cliRoot, "bin/index.js");
const tmpRoot = process.env.CLI_TEST_TMPDIR ?? path.join(os.tmpdir(), "create-vyllion-saas-cli-tests");

const runCli = (args, options = {}) =>
	spawnSync(process.execPath, [binPath, ...args], {
		cwd: options.cwd ?? repoRoot,
		encoding: "utf8",
		env: { ...process.env, NO_COLOR: "1", ...(options.env ?? {}) },
		timeout: options.timeout ?? 90_000,
	});

const outputOf = (result) => `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

const removeDir = (dir) => {
	rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
};

const readEnv = (filePath) => {
	const out = {};
	for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
		if (!line || line.trimStart().startsWith("#") || !line.includes("=")) continue;
		const [key, ...rest] = line.split("=");
		out[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
	}
	return out;
};

test("prints help for the CLI command surface", () => {
	const result = runCli(["--help"]);
	assert.equal(result.status, 0, outputOf(result));
	const output = outputOf(result);
	assert.match(output, /Usage:/);
	assert.match(output, /create-vyllion-saas doctor/);
	assert.match(output, /create-vyllion-saas add starter <pack>/);
	assert.match(output, /comma-separated/);
});

test("lists starter pack metadata", () => {
	const result = runCli(["list", "starters"]);
	assert.equal(result.status, 0, outputOf(result));
	const output = outputOf(result);
	assert.match(output, /Available starter packs/);
	assert.match(output, /\beims\b/);
	assert.match(output, /Manifest:/);
	assert.match(output, /Env vars:/);
	assert.match(output, /EIMS_ENV/);
	assert.match(output, /Models:/);
	assert.match(output, /EimsCredential/);
	assert.match(output, /Seed data:/);
	assert.match(output, /eims-entitlements/);
	assert.match(output, /Queues:/);
	assert.match(output, /eims-submission-retry/);
	assert.match(output, /Crons:/);
	assert.match(output, /certificate-expiry-daily/);
});

test("parses repeated and comma-separated starter flags", () => {
	const args = parseArgs(["my-app", "--starter", "eims,crm", "--starter=helpdesk"]);
	assert.deepEqual(args.starters, ["eims", "crm", "helpdesk"]);
});

test("parses starter refresh flag", () => {
	const args = parseArgs(["add", "starter", "eims", "--refresh"]);
	assert.equal(args.command, "add-starter");
	assert.equal(args.starterName, "eims");
	assert.equal(args.refresh, true);
});

test("doctor command runs in advisory mode", () => {
	const result = runCli(["doctor"], { cwd: repoRoot });
	assert.equal(result.status, 0, outputOf(result));
	const output = outputOf(result);
	assert.match(output, /create-vyllion-saas doctor/);
	assert.match(output, /package\.json/);
});

test("doctor checks installed starter env vars from pack metadata", () => {
	const targetDir = path.join(tmpRoot, `doctor-eims-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
	removeDir(targetDir);

	try {
		mkdirSync(path.join(targetDir, "apps/api"), { recursive: true });
		writeFileSync(path.join(targetDir, "package.json"), JSON.stringify({ scripts: {} }), "utf8");
		writeFileSync(
			path.join(targetDir, ".scaffold-state.json"),
			JSON.stringify({ version: 1, starters: [{ name: "eims" }] }),
			"utf8",
		);
		writeFileSync(
			path.join(targetDir, "apps/api/.env"),
			[
				"MASTER_KEY=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
				"BETTER_AUTH_SECRET=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
				"EIMS_ENV=sandbox",
			].join("\n"),
			"utf8",
		);

		const result = runCli(["doctor"], { cwd: targetDir });
		assert.equal(result.status, 0, outputOf(result));
		const output = outputOf(result);
		assert.match(output, /starter state.*eims/);
		assert.match(output, /starter:eims env/);
		assert.match(output, /EIMS_BASE_URL_SANDBOX/);
	} finally {
		removeDir(targetDir);
	}
});

test("unknown starter fails before creating the target project", () => {
	const targetDir = path.join(tmpRoot, `unknown-starter-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
	removeDir(targetDir);

	try {
		const result = runCli([targetDir, "--yes", "--starter", "missing-pack"], { timeout: 120_000 });
		assert.notEqual(result.status, 0, outputOf(result));
		assert.match(outputOf(result), /Unknown starter pack 'missing-pack'/);
		assert.ok(!existsSync(targetDir), "target project should not be created when starter validation fails");
	} finally {
		removeDir(targetDir);
	}
});

test("scaffolds a base project through the bin entrypoint", () => {
	const targetDir = path.join(tmpRoot, `base-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
	removeDir(targetDir);

	try {
		const result = runCli([targetDir, "--yes"], { timeout: 120_000 });
		assert.equal(result.status, 0, outputOf(result));
		assert.ok(existsSync(path.join(targetDir, "package.json")), "package.json should exist in generated project");
		assert.ok(existsSync(path.join(targetDir, "apps/api/.env")), "API env file should be generated");
		assert.ok(!existsSync(path.join(targetDir, "apps/api/src/modules/eims")), "base scaffold must not include EIMS");

		const apiEnv = readEnv(path.join(targetDir, "apps/api/.env"));
		assert.match(apiEnv.BETTER_AUTH_SECRET, /^[a-f0-9]{64}$/i);
		assert.match(apiEnv.MASTER_KEY, /^[a-f0-9]{64}$/i);

		const packageJson = JSON.parse(readFileSync(path.join(targetDir, "package.json"), "utf8"));
		assert.match(packageJson.scripts["deploy:check"], /build:api/);
		assert.match(packageJson.scripts["deploy:check"], /build:web/);
	} finally {
		removeDir(targetDir);
	}
});

test("adds and removes the EIMS starter without leaving generated residue", () => {
	const targetDir = path.join(tmpRoot, `eims-remove-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
	removeDir(targetDir);

	try {
		const scaffoldResult = runCli([targetDir, "--yes"], { timeout: 120_000 });
		assert.equal(scaffoldResult.status, 0, outputOf(scaffoldResult));

		const addResult = runCli(["add", "starter", "eims"], { cwd: targetDir, timeout: 120_000 });
		assert.equal(addResult.status, 0, outputOf(addResult));
		assert.ok(existsSync(path.join(targetDir, "apps/api/src/modules/eims")), "EIMS API module should be installed");
		assert.match(
			readFileSync(path.join(targetDir, "apps/web/src/routes/index.tsx"), "utf8"),
			/return <Navigate to="\/eims" \/>;/,
			"EIMS starter should make the tax workspace the authenticated landing page",
		);
		assert.ok(
			existsSync(path.join(targetDir, "apps/performance/scripts/eims-mock-load.mjs")),
			"EIMS performance smoke should be installed",
		);

		const removeResult = runCli(["remove", "starter", "eims"], { cwd: targetDir, timeout: 120_000 });
		assert.equal(removeResult.status, 0, outputOf(removeResult));
		assert.ok(!existsSync(path.join(targetDir, "apps/api/src/modules/eims")), "EIMS API module should be removed");
		assert.ok(
			!existsSync(path.join(targetDir, "apps/performance/scripts/eims-mock-load.mjs")),
			"EIMS performance smoke should be removed",
		);
		assert.ok(
			!existsSync(path.join(targetDir, "apps/api/prisma/seed-eims-onboarding-template.ts")),
			"EIMS onboarding seed should be removed",
		);
		assert.match(
			readFileSync(path.join(targetDir, "apps/web/src/routes/index.tsx"), "utf8"),
			/return <Navigate to="\/onboarding" \/>;/,
			"removing EIMS should restore the base onboarding landing page",
		);

		const scaffoldState = JSON.parse(readFileSync(path.join(targetDir, ".scaffold-state.json"), "utf8"));
		assert.deepEqual(scaffoldState.starters, []);

		const packageJson = JSON.parse(readFileSync(path.join(targetDir, "package.json"), "utf8"));
		assert.ok(
			Object.keys(packageJson.scripts ?? {}).every((key) => !key.toLowerCase().includes("eims")),
			"EIMS scripts should be removed",
		);
	} finally {
		removeDir(targetDir);
	}
});

test("refreshes an already-installed EIMS starter UI without reinstalling API modules", () => {
	const targetDir = path.join(tmpRoot, `eims-refresh-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
	removeDir(targetDir);

	try {
		const scaffoldResult = runCli([targetDir, "--yes"], { timeout: 120_000 });
		assert.equal(scaffoldResult.status, 0, outputOf(scaffoldResult));

		const addResult = runCli(["add", "starter", "eims"], { cwd: targetDir, timeout: 120_000 });
		assert.equal(addResult.status, 0, outputOf(addResult));

		const tenantPage = path.join(targetDir, "apps/web/src/features/eims/components/eims-tenant-pages.tsx");
		const rootRoute = path.join(targetDir, "apps/web/src/routes/index.tsx");
		const apiModule = path.join(targetDir, "apps/api/src/modules/eims/eims.module.ts");
		writeFileSync(tenantPage, "export const staleEimsUi = 'old ui';\n", "utf8");
		writeFileSync(
			rootRoute,
			readFileSync(rootRoute, "utf8").replace('return <Navigate to="/eims" />;', 'return <Navigate to="/onboarding" />;'),
			"utf8",
		);
		writeFileSync(apiModule, `${readFileSync(apiModule, "utf8")}\n// local API implementation marker\n`, "utf8");

		const noRefreshResult = runCli(["add", "starter", "eims"], { cwd: targetDir, timeout: 120_000 });
		assert.equal(noRefreshResult.status, 0, outputOf(noRefreshResult));
		assert.match(readFileSync(tenantPage, "utf8"), /old ui/);
		assert.match(readFileSync(rootRoute, "utf8"), /return <Navigate to="\/onboarding" \/>;/);

		const refreshResult = runCli(["add", "starter", "eims", "--refresh"], { cwd: targetDir, timeout: 120_000 });
		assert.equal(refreshResult.status, 0, outputOf(refreshResult));
		assert.match(readFileSync(tenantPage, "utf8"), /Ethiopia tax workspace/);
		assert.match(readFileSync(rootRoute, "utf8"), /return <Navigate to="\/eims" \/>;/);
		assert.match(readFileSync(apiModule, "utf8"), /local API implementation marker/);
		assert.match(outputOf(refreshResult), /EIMS starter refresh complete/);
	} finally {
		removeDir(targetDir);
	}
});
