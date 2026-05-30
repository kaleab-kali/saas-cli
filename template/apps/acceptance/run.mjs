import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";

const cucumber = path.join(
	process.cwd(),
	"node_modules",
	".bin",
	process.platform === "win32" ? "cucumber-js.cmd" : "cucumber-js",
);

const json = (res, status, body, headers = {}) => {
	res.writeHead(status, { "content-type": "application/json", ...headers });
	res.end(JSON.stringify(body));
};

const mockServer = () =>
	http.createServer((req, res) => {
		const url = new URL(req.url ?? "/", "http://127.0.0.1");
		const method = req.method ?? "GET";

		if (url.pathname.includes("/sign-in/email") && method === "POST") {
			return json(res, 200, { data: { user: { id: "user_acceptance" } } }, { "set-cookie": "sid=mock; Path=/" });
		}
		if (url.pathname === "/api/auth/organization/set-active" && method === "POST") {
			return json(res, 200, { data: { ok: true } }, { "set-cookie": "sid=mock; Path=/" });
		}
		if (url.pathname === "/api/v1/billing/capabilities" && method === "GET") {
			return json(res, 200, {
				data: {
					"platform.api-keys": { enabled: true },
					"platform.members": { enabled: true, limit: 5 },
					"platform.storage-bytes": { enabled: true, limit: 1_073_741_824 },
				},
			});
		}
		if (url.pathname === "/api/v1/team/members" && method === "GET") {
			return json(res, 200, {
				data: [{ id: "mem_owner", role: "owner", user: { email: "owner@example.com", name: "Owner" } }],
			});
		}
		return json(res, 404, { error: "not found" });
	});

const runCucumber = (env) =>
	new Promise((resolve) => {
		const child = spawn(cucumber, ["features", "--import", "steps/*.mjs"], {
			stdio: "inherit",
			shell: process.platform === "win32",
			env,
		});
		child.on("exit", (code) => resolve(code ?? 1));
		child.on("error", () => resolve(1));
	});

let server = null;
const env = { ...process.env };
if (!env.ACCEPTANCE_BASE_URL) {
	server = mockServer();
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	const port = typeof address === "object" && address ? address.port : 0;
	env.ACCEPTANCE_BASE_URL = `http://127.0.0.1:${port}`;
	env.ACCEPTANCE_USER_EMAIL = env.ACCEPTANCE_USER_EMAIL ?? "owner@example.com";
	env.ACCEPTANCE_USER_PASSWORD = env.ACCEPTANCE_USER_PASSWORD ?? "password";
	env.ACCEPTANCE_ORG_SLUG = env.ACCEPTANCE_ORG_SLUG ?? "acme";
	console.log(`Running acceptance tests against local mock API at ${env.ACCEPTANCE_BASE_URL}`);
}

try {
	const code = await runCucumber(env);
	process.exitCode = code;
} finally {
	if (server) await new Promise((resolve) => server.close(resolve));
}
