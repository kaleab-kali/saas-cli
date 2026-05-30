import net from "node:net";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const status = {
	ok: (label, detail = "") => console.log(`OK   ${label}${detail ? ` - ${detail}` : ""}`),
	warn: (label, detail = "") => console.log(`WARN ${label}${detail ? ` - ${detail}` : ""}`),
	fail: (label, detail = "") => console.log(`FAIL ${label}${detail ? ` - ${detail}` : ""}`),
};

const version = (cmd, args = ["--version"]) => {
	const r = spawnSync(cmd, args, { encoding: "utf8", shell: process.platform === "win32" });
	return r.status === 0 ? (r.stdout || r.stderr).trim() : null;
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

const main = async () => {
	console.log("{{projectName}} doctor\n");
	const node = version("node");
	node ? status.ok("Node", node) : status.fail("Node", "not in PATH");
	const pnpm = version("pnpm");
	pnpm ? status.ok("pnpm", pnpm) : status.fail("pnpm", "install via Corepack or npm");

	existsSync("apps/api/.env") ? status.ok("apps/api/.env") : status.warn("apps/api/.env", "missing");
	existsSync("apps/web/.env") ? status.ok("apps/web/.env") : status.warn("apps/web/.env", "missing");
	existsSync("apps/api/src/generated/prisma/client.ts")
		? status.ok("Prisma client")
		: status.warn("Prisma client", "run pnpm db:generate");

	const apiEnv = env("apps/api/.env");
	apiEnv.DATABASE_URL ? status.ok("DATABASE_URL") : status.warn("DATABASE_URL", "missing");
	(await connect(5432)) ? status.ok("Postgres reachable") : status.warn("Postgres", "port 5432 unreachable");
	(await connect(6379)) ? status.ok("Redis reachable") : status.warn("Redis", "port 6379 unreachable");
	(await connect(Number(apiEnv.API_PORT || 3000))) ? status.ok("API listening") : status.warn("API", "not listening");
	const webPort = await firstListeningPort([5173, 5174, 5175]);
	webPort ? status.ok("Web listening", `port ${webPort}`) : status.warn("Web", "not listening");

	console.log("\nFirst run: pnpm install && pnpm db:generate && pnpm db:migrate && pnpm db:seed && pnpm dev");
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
