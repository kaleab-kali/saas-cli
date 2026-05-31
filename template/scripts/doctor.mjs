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

const placeholderPattern = /change-me|generate_with|strong_password|your-domain|example\./i;

const envValue = (values, key) => String(values[key] ?? "").trim();

const requireEnvValue = (values, key, detail = "required before deploy") => {
	const value = envValue(values, key);
	if (value && !placeholderPattern.test(value)) {
		status.ok(`${key} configured`);
		return true;
	}
	production ? status.fail(key, detail) : status.warn(key, detail);
	return false;
};

const requireHttpsEnvUrl = (values, key) => {
	const value = envValue(values, key);
	try {
		const url = new URL(value);
		if (url.protocol === "https:" && !["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname) && !placeholderPattern.test(value)) {
			status.ok(`${key} uses HTTPS`);
			return true;
		}
	} catch {
		// handled below
	}
	const detail = "must be a real HTTPS URL before production deploy";
	production ? status.fail(key, detail) : status.warn(key, detail);
	return false;
};

const requireDeployEnv = () => {
	if (!existsSync(".env.deploy") && !existsSync(".env.deploy.production") && !process.env.DEPLOY_HOST) {
		production
			? status.fail("deploy env", "create .env.deploy.production from .env.deploy.example")
			: status.warn("deploy env", "recommended for staging/production deploys");
		return;
	}

	const deployEnv = { ...env(".env.deploy"), ...env(".env.deploy.production"), ...process.env };
	if (deployEnv.DEPLOY_HOST && !placeholderPattern.test(deployEnv.DEPLOY_HOST)) status.ok("DEPLOY_HOST configured");
	else production ? status.fail("DEPLOY_HOST", "required in .env.deploy.production") : status.warn("DEPLOY_HOST", "missing");
};

const checkProductionCoreEnv = (apiEnv) => {
	if (!production) return;
	apiEnv.NODE_ENV === "production" ? status.ok("NODE_ENV", "production") : status.fail("NODE_ENV", "must be production for release checks");
	requireEnvValue(apiEnv, "DATABASE_URL");
	requireEnvValue(apiEnv, "REDIS_URL");
	requireHttpsEnvUrl(apiEnv, "BETTER_AUTH_URL");
	requireHttpsEnvUrl(apiEnv, "FRONTEND_URL");
	requireEnvValue(apiEnv, "METRICS_TOKEN", "protect /api/v1/metrics with a bearer token");
	requireEnvValue(apiEnv, "SMTP_HOST", "configure an SMTP relay before launch");
	requireEnvValue(apiEnv, "SMTP_FROM", "configure a verified sender before launch");
	requireEnvValue(apiEnv, "API_RATE_LIMIT_PER_TENANT", "configure tenant rate limits before launch");
	requireDeployEnv();

	if (apiEnv.STORAGE_DRIVER === "object") {
		requireEnvValue(apiEnv, "OBJECT_STORAGE_ENDPOINT");
		requireEnvValue(apiEnv, "OBJECT_STORAGE_BUCKET");
		requireEnvValue(apiEnv, "OBJECT_STORAGE_ACCESS_KEY");
		requireEnvValue(apiEnv, "OBJECT_STORAGE_SECRET_KEY");
	} else {
		status.warn("STORAGE_DRIVER", "local uploads are acceptable for a single VPS, object storage is preferred for production scale");
	}
};

const hasEnvKey = (values, key) => Object.prototype.hasOwnProperty.call(values, key);

const checkEimsProductionEnv = (apiEnv, eimsInstalled) => {
	if (!eimsInstalled && !hasEnvKey(apiEnv, "EIMS_ENV")) return;
	if (!hasEnvKey(apiEnv, "EIMS_ENV")) {
		production ? status.fail("EIMS_ENV", "missing for installed EIMS starter") : status.warn("EIMS_ENV", "missing for installed EIMS starter");
		return;
	}
	if (!production) return;
	apiEnv.EIMS_ENV === "production"
		? status.ok("EIMS_ENV", "production")
		: status.fail("EIMS_ENV", "must be production before real EIMS go-live");
	apiEnv.EIMS_MOCK_MODE === "false"
		? status.ok("EIMS_MOCK_MODE", "false")
		: status.fail("EIMS_MOCK_MODE", "must be false before production go-live");
	requireHttpsEnvUrl(apiEnv, "EIMS_BASE_URL_PRODUCTION");
	requireHttpsEnvUrl(apiEnv, "EIMS_BULK_URL_PRODUCTION");
	requireHttpsEnvUrl(apiEnv, "EIMS_CALLBACK_PUBLIC_URL");

	const signingProvider = envValue(apiEnv, "EIMS_SIGNING_PROVIDER");
	if (signingProvider && signingProvider !== "local") status.ok("EIMS_SIGNING_PROVIDER", signingProvider);
	else status.fail("EIMS_SIGNING_PROVIDER", "use vault, kms, hsm, or another non-local signing provider before production");

	apiEnv.EIMS_PHASE0_STRICT === "true"
		? status.ok("EIMS_PHASE0_STRICT", "true")
		: status.fail("EIMS_PHASE0_STRICT", "must be true before EIMS production launch");
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
	const scaffoldState = json(".scaffold-state.json");
	const eimsInstalled = Boolean(scaffoldState?.starters?.some((starter) => starter?.name === "eims"));
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
	checkProductionCoreEnv(apiEnv);
	checkEimsProductionEnv(apiEnv, eimsInstalled);

	for (const script of [
		"lint:ci",
		"deploy:check",
		"deploy",
		"readiness:smoke",
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
		["scripts/readiness-smoke.mjs", "production readiness smoke script"],
		[".env.deploy.example", "deploy env example"],
		[".gitleaks.toml", "gitleaks config"],
		["ecosystem.config.cjs", "PM2 ecosystem config"],
		["Caddyfile", "Caddy reverse-proxy config"],
		["docs/DEPLOYMENT.md", "deployment guide"],
		["docs/DISASTER_RECOVERY.md", "disaster recovery guide"],
		["docs/MIGRATIONS_PLAYBOOK.md", "migration playbook"],
		["docs/OBSERVABILITY.md", "observability guide"],
		["docs/SECURITY.md", "security guide"],
		["docs/PRE_LAUNCH_CHECKLIST.md", "pre-launch checklist"],
		["docs/observability/grafana-dashboard.json", "Grafana dashboard"],
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
