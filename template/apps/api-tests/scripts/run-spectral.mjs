import { spawn } from "node:child_process";
import { accessSync } from "node:fs";
import path from "node:path";

const spec = process.env.OPENAPI_SPEC ?? process.env.OPENAPI_SPEC_URL ?? "openapi/openapi-smoke.yaml";
const spectral = path.join(
	process.cwd(),
	"node_modules",
	".bin",
	process.platform === "win32" ? "spectral.cmd" : "spectral",
);

try {
	accessSync(spectral);
} catch {
	console.error("Spectral CLI is not installed. Run pnpm install first.");
	process.exit(1);
}

const child = spawn(spectral, ["lint", spec, "--ruleset", ".spectral.yaml"], {
	stdio: "inherit",
	shell: process.platform === "win32",
});
child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (error) => {
	console.error(error);
	process.exit(1);
});
