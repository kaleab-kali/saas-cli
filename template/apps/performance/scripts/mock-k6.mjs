import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";

const strict = process.env.PERFORMANCE_STRICT_TOOLS === "1";
const port = Number(process.env.K6_MOCK_PORT ?? 4299);
const target = `http://127.0.0.1:${port}/health`;

const hasK6 =
	spawnSync(process.platform === "win32" ? "where" : "which", ["k6"], {
		stdio: "ignore",
		shell: process.platform === "win32",
	}).status === 0;

if (!hasK6) {
	console.log("k6 is not installed. Skipping k6 mock performance run.");
	console.log("Install k6 from https://grafana.com/docs/k6/latest/set-up/install-k6/");
	if (strict) process.exit(1);
	process.exit(0);
}

const server = createServer((req, res) => {
	if (req.url === "/health") {
		res.writeHead(200, { "content-type": "application/json" });
		res.end(JSON.stringify({ status: "ok" }));
		return;
	}
	res.writeHead(404, { "content-type": "application/json" });
	res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, "127.0.0.1", () => {
	const child = spawn("k6", ["run", "k6/health.js"], {
		stdio: "inherit",
		shell: process.platform === "win32",
		env: { ...process.env, K6_TARGET: target, K6_DURATION: "5s", K6_VUS: "2" },
	});
	child.on("exit", (code) => server.close(() => process.exit(code ?? 1)));
	child.on("error", (error) => {
		console.error(error);
		server.close(() => process.exit(1));
	});
});
