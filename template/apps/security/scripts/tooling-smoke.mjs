import { hasCommand } from "./lib.mjs";

const tools = ["gitleaks", "osv-scanner", "semgrep", "nuclei"];
const missingTools = [];
const strict = process.env.SECURITY_STRICT_TOOLS === "1" || process.argv.includes("--strict");

for (const tool of tools) {
	const installed = hasCommand(tool);
	if (!installed) missingTools.push(tool);
	console.log(`${tool}: ${installed ? "installed" : "not installed"}`);
}

if (missingTools.length > 0 && strict) {
	console.error(`Missing required security tooling: ${missingTools.join(", ")}`);
	console.error("Install the missing scanners before running production deploy checks.");
	process.exit(1);
}

console.log("Security tooling smoke finished. Missing external tools are allowed unless --strict or SECURITY_STRICT_TOOLS=1.");
