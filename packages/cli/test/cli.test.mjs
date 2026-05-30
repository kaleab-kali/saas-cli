import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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
});

test("lists starter pack metadata", () => {
	const result = runCli(["list", "starters"]);
	assert.equal(result.status, 0, outputOf(result));
	const output = outputOf(result);
	assert.match(output, /Available starter packs/);
	assert.match(output, /\beims\b/);
	assert.match(output, /Manifest:/);
});

test("doctor command runs in advisory mode", () => {
	const result = runCli(["doctor"], { cwd: repoRoot });
	assert.equal(result.status, 0, outputOf(result));
	const output = outputOf(result);
	assert.match(output, /create-vyllion-saas doctor/);
	assert.match(output, /package\.json/);
});

test("scaffolds a base project through the bin entrypoint", () => {
	const targetDir = path.join(tmpRoot, `base-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
	rmSync(targetDir, { recursive: true, force: true });

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
		rmSync(targetDir, { recursive: true, force: true });
	}
});
