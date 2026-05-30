import net from "node:net";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import pc from "picocolors";
import { getStarterPackDetail } from "./module-generator.js";

let failureCount = 0;
const ok = (label, detail = "") => console.log(`${pc.green("OK")} ${label}${detail ? pc.dim(` - ${detail}`) : ""}`);
const warn = (label, detail = "") => console.log(`${pc.yellow("WARN")} ${label}${detail ? pc.dim(` - ${detail}`) : ""}`);
const fail = (label, detail = "") => {
	failureCount += 1;
	console.log(`${pc.red("FAIL")} ${label}${detail ? pc.dim(` - ${detail}`) : ""}`);
};

const commandVersion = (command, args = ["--version"]) => {
	const result = spawnSync(command, args, { encoding: "utf8", shell: process.platform === "win32" });
	if (result.status !== 0) return null;
	return (result.stdout || result.stderr).trim();
};

const commandVersionAny = (commands, args = ["--version"]) => {
	for (const command of commands) {
		const version = commandVersion(command, args);
		if (version) return version;
	}
	return null;
};

const canConnect = (port, host = "127.0.0.1") =>
	new Promise((resolve) => {
		const socket = net.createConnection({ host, port, timeout: 1000 }, () => {
			socket.destroy();
			resolve(true);
		});
		socket.on("error", () => resolve(false));
		socket.on("timeout", () => {
			socket.destroy();
			resolve(false);
		});
	});

const readEnv = (file) => {
	if (!existsSync(file)) return {};
	const out = {};
	for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
		if (!line || line.trimStart().startsWith("#") || !line.includes("=")) continue;
		const [key, ...rest] = line.split("=");
		out[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
	}
	return out;
};

const readJson = (file) => {
	if (!existsSync(file)) return null;
	try {
		return JSON.parse(readFileSync(file, "utf8"));
	} catch {
		return null;
	}
};

const hasScript = (pkg, name) => Boolean(pkg?.scripts?.[name]);

const requireScript = (pkg, name, production) => {
	if (hasScript(pkg, name)) ok(`script:${name}`);
	else production ? fail(`script:${name}`, "required for production readiness") : warn(`script:${name}`, "recommended");
};

const requirePath = (file, label, production) => {
	if (existsSync(file)) ok(label);
	else production ? fail(label, "required for production readiness") : warn(label, "recommended");
};

const hasEnvKey = (env, key) => Object.prototype.hasOwnProperty.call(env, key);

const checkStarterEnvVars = (starters, apiEnv, production) => {
	for (const starter of starters) {
		const name = starter?.name;
		const detail = getStarterPackDetail(name);
		const envVars = detail?.envVars ?? (Array.isArray(starter?.envVars) ? starter.envVars : []);
		const label = detail?.name ?? name;
		if (!detail && envVars.length === 0) {
			const message = "pack metadata unavailable; cannot verify starter-specific env vars";
			production ? fail(`starter:${label} metadata`, message) : warn(`starter:${label} metadata`, message);
			continue;
		}

		if (!envVars.length) {
			ok(`starter:${label} env`, "no starter-specific env vars declared");
			continue;
		}

		const missing = envVars.filter((key) => !hasEnvKey(apiEnv, key));
		if (missing.length === 0) {
			ok(`starter:${label} env`, `${envVars.length} declared env var(s) present`);
		} else {
			const message = `missing ${missing.join(", ")}`;
			production ? fail(`starter:${label} env`, message) : warn(`starter:${label} env`, message);
		}
	}
};

export const runDoctor = async (cwd, options = {}) => {
	failureCount = 0;
	const production = Boolean(options.production);
	console.log(pc.bold(`create-vyllion-saas doctor${production ? " --production" : ""}`));
	console.log(pc.dim(`Project: ${cwd}\n`));

	const node = commandVersion("node", ["--version"]);
	if (node) ok("Node", node);
	else fail("Node", "not found in PATH");

	const pnpm = commandVersionAny(process.platform === "win32" ? ["pnpm", "pnpm.cmd"] : ["pnpm"], ["--version"]);
	if (pnpm) ok("pnpm", pnpm);
	else production ? fail("pnpm", "not found; enable Corepack or install pnpm before deploy") : warn("pnpm", "not found; install via Corepack or npm");

	const rootPackage = path.join(cwd, "package.json");
	const rootPkg = readJson(rootPackage);
	const apiEnvPath = path.join(cwd, "apps/api/.env");
	const webEnvPath = path.join(cwd, "apps/web/.env");
	const apiGenerated = path.join(cwd, "apps/api/src/generated/prisma/client.ts");
	const scaffoldState = readJson(path.join(cwd, ".scaffold-state.json"));

	existsSync(rootPackage) ? ok("package.json") : fail("package.json", "run from a generated project root");
	existsSync(apiEnvPath) ? ok("apps/api/.env") : warn("apps/api/.env", "copy .env.example or rerun scaffold");
	existsSync(webEnvPath) ? ok("apps/web/.env") : warn("apps/web/.env", "copy .env.example or rerun scaffold");
	existsSync(apiGenerated)
		? ok("Prisma client")
		: production
			? fail("Prisma client", "run pnpm db:generate before deploy")
			: warn("Prisma client", "run pnpm db:generate");

	const apiEnv = { ...readEnv(apiEnvPath), ...process.env };
	if (apiEnv.DATABASE_URL) ok("DATABASE_URL configured");
	else warn("DATABASE_URL", "missing from apps/api/.env");

	if (/^[a-f0-9]{64}$/i.test(apiEnv.MASTER_KEY ?? "")) {
		ok("MASTER_KEY configured", "32-byte hex key");
	} else {
		production
			? fail("MASTER_KEY", "missing or invalid; set a 32-byte hex key with openssl rand -hex 32 before deploy")
			: warn("MASTER_KEY", "missing or invalid; rerun scaffold or set a 32-byte hex key");
	}

	if (/^[a-f0-9]{64}$/i.test(apiEnv.BETTER_AUTH_SECRET ?? "")) {
		ok("BETTER_AUTH_SECRET configured", "32-byte hex key");
	} else {
		production
			? fail("BETTER_AUTH_SECRET", "missing or weak; set a 32-byte hex secret with openssl rand -hex 32 before deploy")
			: warn("BETTER_AUTH_SECRET", "missing or weak secret");
	}

	if (scaffoldState?.starters?.length) {
		ok("starter state", scaffoldState.starters.map((starter) => starter.name).join(", "));
		checkStarterEnvVars(scaffoldState.starters, apiEnv, production);
	} else {
		ok("starter state", "base scaffold has no optional starter packs installed");
	}

	if (rootPkg) {
		requireScript(rootPkg, "lint:ci", production);
		requireScript(rootPkg, "build:api", production);
		requireScript(rootPkg, "build:web", production);
		requireScript(rootPkg, "db:backup", production);
		requireScript(rootPkg, "db:restore", production);
		requireScript(rootPkg, "test:ci", production);
		requireScript(rootPkg, "test:smoke", production);
		requireScript(rootPkg, "test:security", production);
		requireScript(rootPkg, "test:load:k6:mock", production);
		requireScript(rootPkg, "test:mutation", production);
		requireScript(rootPkg, "gen:starter", false);
		requireScript(rootPkg, "gen:starter:uninstall", false);
	}

	requirePath(path.join(cwd, "apps/security/package.json"), "security workspace", production);
	requirePath(path.join(cwd, "apps/performance/package.json"), "performance workspace", production);
	requirePath(path.join(cwd, "apps/acceptance/package.json"), "acceptance workspace", production);
	requirePath(path.join(cwd, "apps/api/stryker.conf.mjs"), "mutation testing config", production);
	requirePath(path.join(cwd, "scripts/backup-postgres.mjs"), "Postgres backup script", production);
	requirePath(path.join(cwd, "scripts/restore-postgres.mjs"), "Postgres restore script", production);
	requirePath(path.join(cwd, ".gitleaks.toml"), "gitleaks config", production);

	const postgresOpen = await canConnect(5432);
	postgresOpen ? ok("Postgres port 5432 reachable") : warn("Postgres", "port 5432 is not reachable");

	const redisOpen = await canConnect(6379);
	redisOpen ? ok("Redis port 6379 reachable") : warn("Redis", "port 6379 is not reachable");

	const apiOpen = await canConnect(Number(apiEnv.API_PORT || 3000));
	apiOpen ? ok("API port in use", "server may already be running") : warn("API port", "not currently listening");

	const webOpen = await canConnect(5173);
	webOpen ? ok("Web port 5173 in use", "server may already be running") : warn("Web port", "not currently listening");

	console.log(pc.dim("\nRecommended first run: pnpm install && pnpm db:generate && pnpm db:migrate && pnpm db:seed && pnpm dev"));
	if (production && failureCount > 0) {
		process.exitCode = 1;
		console.log(pc.red(`\nProduction readiness failed with ${failureCount} blocking issue(s).`));
	}
};
