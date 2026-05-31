import net from "node:net";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

let failures = 0;
const production = process.argv.includes("--production") || process.argv.includes("--prod");

const status = {
	ok: (label, detail = "") => console.log(`OK   ${label}${detail ? ` - ${detail}` : ""}`),
	warn: (label, detail = "") => console.log(`WARN ${label}${detail ? ` - ${detail}` : ""}`),
	fail: (label, detail = "") => {
		failures += 1;
		console.log(`FAIL ${label}${detail ? ` - ${detail}` : ""}`);
	},
};

const version = (cmd, args = ["--version"]) => {
	const r = spawnSync(cmd, args, { encoding: "utf8", shell: process.platform === "win32" });
	return r.status === 0 ? (r.stdout || r.stderr).trim() : null;
};

const versionAny = (commands, args = ["--version"]) => {
	for (const cmd of commands) {
		const v = version(cmd, args);
		if (v) return v;
	}
	return null;
};

const env = (file) => {
	if (!existsSync(file)) return {};
	const out = {};
	for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
		if (!line || line.trimStart().startsWith("#") || !line.includes("=")) continue;
		const [key, ...rest] = line.split("=");
		out[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
	}
	return out;
};

const json = (file) => {
	if (!existsSync(file)) return null;
	try {
		return JSON.parse(readFileSync(file, "utf8"));
	} catch {
		return null;
	}
};

const connect = (port, host = "127.0.0.1") =>
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

const firstListeningPort = async (ports) => {
	for (const port of ports) {
		if (await connect(port)) return port;
	}
	return null;
};

const requirePath = (path, label) => {
	if (existsSync(path)) status.ok(label);
	else production ? status.fail(label, "required before deploy") : status.warn(label, "recommended");
};

const requireScript = (pkg, name) => {
	if (pkg?.scripts?.[name]) status.ok(`script:${name}`);
	else production ? status.fail(`script:${name}`, "required before deploy") : status.warn(`script:${name}`, "recommended");
};

const main = async () => {
	console.log(`{{projectName}} doctor${production ? " --production" : ""}\n`);

	const node = version("node");
	node ? status.ok("Node", node) : status.fail("Node", "not in PATH");
	const pnpm = versionAny(process.platform === "win32" ? ["pnpm", "pnpm.cmd"] : ["pnpm"]);
	pnpm ? status.ok("pnpm", pnpm) : status.fail("pnpm", "install via Corepack or npm");

	const pkg = json("package.json");
	existsSync("package.json") ? status.ok("package.json") : status.fail("package.json", "run from project root");
	existsSync("apps/api/.env") ? status.ok("apps/api/.env") : status.warn("apps/api/.env", "missing");
	existsSync("apps/web/.env") ? status.ok("apps/web/.env") : status.warn("apps/web/.env", "missing");
	existsSync("apps/api/src/generated/prisma/client.ts")
		? status.ok("Prisma client")
		: production
			? status.fail("Prisma client", "run pnpm db:generate")
			: status.warn("Prisma client", "run pnpm db:generate");

	const apiEnv = { ...env("apps/api/.env"), ...process.env };
	apiEnv.DATABASE_URL ? status.ok("DATABASE_URL") : status.warn("DATABASE_URL", "missing");
	/^[a-f0-9]{64}$/i.test(apiEnv.MASTER_KEY ?? "")
		? status.ok("MASTER_KEY", "32-byte hex")
		: production
			? status.fail("MASTER_KEY", "set a 32-byte hex key with openssl rand -hex 32")
			: status.warn("MASTER_KEY", "missing or invalid");
	/^[a-f0-9]{64}$/i.test(apiEnv.BETTER_AUTH_SECRET ?? "")
		? status.ok("BETTER_AUTH_SECRET", "32-byte hex")
		: production
			? status.fail("BETTER_AUTH_SECRET", "set a 32-byte hex secret with openssl rand -hex 32")
			: status.warn("BETTER_AUTH_SECRET", "missing or weak");

	for (const script of [
		"lint:ci",
		"deploy",
		"build:api",
		"build:web",
		"db:backup",
		"db:restore",
		"db:migrate:deploy",
		"test:ci",
		"test:smoke",
		"test:security",
		"test:load:k6:mock",
		"test:mutation",
	]) {
		requireScript(pkg, script);
	}
	for (const [path, label] of [
		["apps/security/package.json", "security workspace"],
		["apps/performance/package.json", "performance workspace"],
		["apps/acceptance/package.json", "acceptance workspace"],
		["apps/api/stryker.conf.mjs", "mutation testing config"],
		["scripts/backup-postgres.mjs", "Postgres backup script"],
		["scripts/restore-postgres.mjs", "Postgres restore script"],
		["scripts/deploy.mjs", "VPS deploy script"],
		[".gitleaks.toml", "gitleaks config"],
		["docs/SECURITY.md", "security guide"],
		["docs/PRE_LAUNCH_CHECKLIST.md", "pre-launch checklist"],
	]) {
		requirePath(path, label);
	}

	(await connect(5432)) ? status.ok("Postgres reachable") : status.warn("Postgres", "port 5432 unreachable");
	(await connect(6379)) ? status.ok("Redis reachable") : status.warn("Redis", "port 6379 unreachable");
	(await connect(Number(apiEnv.API_PORT || 3000))) ? status.ok("API listening") : status.warn("API", "not listening");
	const webPort = await firstListeningPort([5173, 5174, 5175]);
	webPort ? status.ok("Web listening", `port ${webPort}`) : status.warn("Web", "not listening");

	console.log("\nFirst run: pnpm install && pnpm db:generate && pnpm db:migrate && pnpm db:seed && pnpm dev");
	if (production && failures > 0) {
		console.error(`\nProduction readiness failed with ${failures} blocking issue(s).`);
		process.exit(1);
	}
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
