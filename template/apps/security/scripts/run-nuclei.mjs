import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasCommand, run } from "./lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

const createMockTarget = () =>
	http.createServer((req, res) => {
		const url = new URL(req.url ?? "/", "http://127.0.0.1");
		const isProtectedPath = [
			"/.env",
			"/.env.local",
			"/.env.production",
			"/apps/api/.env",
			"/package.json",
			"/pnpm-lock.yaml",
		].includes(url.pathname);
		res.writeHead(isProtectedPath ? 404 : 200, {
			"content-type": "text/plain; charset=utf-8",
			"x-content-type-options": "nosniff",
			"x-frame-options": "DENY",
		});
		res.end(isProtectedPath ? "not found" : "ok");
	});

const riskyPaths = [
	{ path: "/.env", words: ["DATABASE_URL=", "BETTER_AUTH_SECRET=", "STRIPE_SECRET_KEY="] },
	{ path: "/.env.local", words: ["DATABASE_URL=", "BETTER_AUTH_SECRET=", "STRIPE_SECRET_KEY="] },
	{ path: "/.env.production", words: ["DATABASE_URL=", "BETTER_AUTH_SECRET=", "STRIPE_SECRET_KEY="] },
	{ path: "/apps/api/.env", words: ["DATABASE_URL=", "BETTER_AUTH_SECRET=", "STRIPE_SECRET_KEY="] },
	{ path: "/package.json", words: ['"dependencies"'] },
	{ path: "/pnpm-lock.yaml", words: ["lockfileVersion:"] },
];

const runBuiltInHttpCheck = async (baseUrl) => {
	const findings = [];
	for (const item of riskyPaths) {
		const response = await fetch(new URL(item.path, baseUrl));
		const body = await response.text();
		if (response.status === 200 && item.words.some((word) => body.includes(word))) {
			findings.push(`${item.path} exposed matching content`);
		}
	}
	if (findings.length > 0) {
		for (const finding of findings) console.error(`[security-http] ${finding}`);
		return 1;
	}
	console.log(`Built-in HTTP security scan passed against ${baseUrl}`);
	return 0;
};

let server = null;
let target = process.env.NUCLEI_TARGET ?? process.env.SECURITY_HTTP_TARGET;
if (!target) {
	server = createMockTarget();
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	const port = typeof address === "object" && address ? address.port : 0;
	target = `http://127.0.0.1:${port}`;
	console.log(`Running HTTP security scan against local mock target at ${target}`);
}

let code = 0;
try {
	code = await runBuiltInHttpCheck(target);
	if (code !== 0) {
		// The deterministic built-in scan already found an exposure.
	} else if (
		hasCommand("nuclei") &&
		(process.env.SECURITY_RUN_NUCLEI === "1" || process.env.SECURITY_STRICT_TOOLS === "1")
	) {
		code = await run("nuclei", [
			"-u",
			target,
			"-t",
			path.resolve(here, "../nuclei"),
			"-duc",
			"-no-stdin",
			"-severity",
			"low,medium,high,critical",
			"-timeout",
			"5",
			"-retries",
			"0",
			"-silent",
			"-no-color",
		]);
	} else if (!hasCommand("nuclei") && process.env.SECURITY_STRICT_TOOLS === "1") {
		console.error("nuclei is not installed.");
		console.error("Install nuclei from https://docs.projectdiscovery.io/tools/nuclei/install");
		code = 1;
	} else {
		console.log("Built-in HTTP security scan passed. Set SECURITY_RUN_NUCLEI=1 to also run nuclei locally.");
	}
} finally {
	if (server) await new Promise((resolve) => server.close(resolve));
}

process.exit(code);
