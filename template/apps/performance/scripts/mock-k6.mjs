import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { performance } from "node:perf_hooks";

const strict = process.env.PERFORMANCE_STRICT_TOOLS === "1";
const port = Number(process.env.K6_MOCK_PORT ?? 4299);
const target = `http://127.0.0.1:${port}/health`;
const p95ThresholdMs = Number(process.env.K6_P95_MS ?? 750);
const maxErrorRate = Number(process.env.K6_MAX_ERROR_RATE ?? 0.01);
const builtinRequests = Number(process.env.PERFORMANCE_BUILTIN_REQUESTS ?? 40);
const builtinConcurrency = Number(process.env.PERFORMANCE_BUILTIN_CONCURRENCY ?? 8);

const hasK6 =
	spawnSync(process.platform === "win32" ? "where" : "which", ["k6"], {
		stdio: "ignore",
		shell: process.platform === "win32",
	}).status === 0;

if (!hasK6) {
	console.log("k6 is not installed.");
	console.log("Install k6 from https://grafana.com/docs/k6/latest/set-up/install-k6/");
	if (strict) process.exit(1);
	console.log("Running built-in mock HTTP load smoke instead.");
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

const percentile = (values, targetPercentile) => {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const index = Math.ceil((targetPercentile / 100) * sorted.length) - 1;
	return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
};

const runBuiltinLoad = async () => {
	const latencies = [];
	let failed = 0;
	let cursor = 0;

	const requestOnce = async () => {
		const startedAt = performance.now();
		try {
			const response = await fetch(target);
			const body = await response.text();
			if (response.status !== 200 || !body.includes('"ok"')) failed += 1;
		} catch {
			failed += 1;
		} finally {
			latencies.push(performance.now() - startedAt);
		}
	};

	const worker = async () => {
		while (cursor < builtinRequests) {
			cursor += 1;
			await requestOnce();
		}
	};

	await Promise.all(Array.from({ length: Math.min(builtinConcurrency, builtinRequests) }, () => worker()));

	const p95 = percentile(latencies, 95);
	const errorRate = builtinRequests === 0 ? 1 : failed / builtinRequests;
	console.log(
		`Built-in performance smoke: requests=${builtinRequests} failed=${failed} errorRate=${errorRate.toFixed(
			3,
		)} p95=${p95.toFixed(1)}ms`,
	);

	if (errorRate >= maxErrorRate) {
		throw new Error(`error rate ${errorRate.toFixed(3)} exceeded max ${maxErrorRate}`);
	}
	if (p95 >= p95ThresholdMs) {
		throw new Error(`p95 ${p95.toFixed(1)}ms exceeded threshold ${p95ThresholdMs}ms`);
	}
};

server.listen(port, "127.0.0.1", () => {
	if (!hasK6) {
		runBuiltinLoad()
			.then(() => server.close(() => process.exit(0)))
			.catch((error) => {
				console.error(error instanceof Error ? error.message : String(error));
				server.close(() => process.exit(1));
			});
		return;
	}

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
