import { hasCommand } from "./lib.mjs";

const tools = ["gitleaks", "osv-scanner", "semgrep", "nuclei"];
for (const tool of tools) {
	console.log(`${tool}: ${hasCommand(tool) ? "installed" : "not installed"}`);
}
console.log("Security tooling smoke finished. Missing external tools are allowed unless SECURITY_STRICT_TOOLS=1.");
