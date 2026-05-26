import net from "node:net";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import pc from "picocolors";

const ok = (label, detail = "") => console.log(`${pc.green("OK")} ${label}${detail ? pc.dim(` - ${detail}`) : ""}`);
const warn = (label, detail = "") => console.log(`${pc.yellow("WARN")} ${label}${detail ? pc.dim(` - ${detail}`) : ""}`);
const fail = (label, detail = "") => console.log(`${pc.red("FAIL")} ${label}${detail ? pc.dim(` - ${detail}`) : ""}`);

const commandVersion = (command, args = ["--version"]) => {
	const result = spawnSync(command, args, { encoding: "utf8", shell: process.platform === "win32" });
	if (result.status !== 0) return null;
	return (result.stdout || result.stderr).trim();
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

export const runDoctor = async (cwd) => {
	console.log(pc.bold("create-vyllion-saas doctor"));
	console.log(pc.dim(`Project: ${cwd}\n`));

	const node = commandVersion("node", ["--version"]);
	if (node) ok("Node", node);
	else fail("Node", "not found in PATH");

	const pnpm = commandVersion("pnpm", ["--version"]);
	if (pnpm) ok("pnpm", pnpm);
	else warn("pnpm", "not found; install via Corepack or npm");

	const rootPackage = path.join(cwd, "package.json");
	const apiEnvPath = path.join(cwd, "apps/api/.env");
	const webEnvPath = path.join(cwd, "apps/web/.env");
	const apiGenerated = path.join(cwd, "apps/api/src/generated/prisma/client.ts");

	existsSync(rootPackage) ? ok("package.json") : fail("package.json", "run from a generated project root");
	existsSync(apiEnvPath) ? ok("apps/api/.env") : warn("apps/api/.env", "copy .env.example or rerun scaffold");
	existsSync(webEnvPath) ? ok("apps/web/.env") : warn("apps/web/.env", "copy .env.example or rerun scaffold");
	existsSync(apiGenerated) ? ok("Prisma client") : warn("Prisma client", "run pnpm db:generate");

	const apiEnv = readEnv(apiEnvPath);
	if (apiEnv.DATABASE_URL) ok("DATABASE_URL configured");
	else warn("DATABASE_URL", "missing from apps/api/.env");

	const postgresOpen = await canConnect(5432);
	postgresOpen ? ok("Postgres port 5432 reachable") : warn("Postgres", "port 5432 is not reachable");

	const redisOpen = await canConnect(6379);
	redisOpen ? ok("Redis port 6379 reachable") : warn("Redis", "port 6379 is not reachable");

	const apiOpen = await canConnect(Number(apiEnv.API_PORT || 3000));
	apiOpen ? ok("API port in use", "server may already be running") : warn("API port", "not currently listening");

	const webOpen = await canConnect(5173);
	webOpen ? ok("Web port 5173 in use", "server may already be running") : warn("Web port", "not currently listening");

	console.log(pc.dim("\nRecommended first run: pnpm install && pnpm db:generate && pnpm db:migrate && pnpm db:seed && pnpm dev"));
};
