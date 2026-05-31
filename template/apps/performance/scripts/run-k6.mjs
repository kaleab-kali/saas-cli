import { spawn, spawnSync } from "node:child_process";

const script = process.argv[2] ?? "k6/health.js";
const strict = process.env.PERFORMANCE_STRICT_TOOLS === "1" || process.argv.includes("--strict");

const hasK6 =
	spawnSync(process.platform === "win32" ? "where" : "which", ["k6"], {
		stdio: "ignore",
		shell: process.platform === "win32",
	}).status === 0;

if (!hasK6) {
	console.log("k6 is not installed. Skipping k6 performance run.");
	console.log("Install k6 from https://grafana.com/docs/k6/latest/set-up/install-k6/");
	if (strict) {
		console.error("Install k6 before running production deploy checks.");
		process.exit(1);
	}
	process.exit(0);
}

const child = spawn("k6", ["run", script], {
	stdio: "inherit",
	shell: process.platform === "win32",
	env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (error) => {
	console.error(error);
	process.exit(1);
});
