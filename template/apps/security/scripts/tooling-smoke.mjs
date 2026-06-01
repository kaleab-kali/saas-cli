import { spawnSync } from "node:child_process";

const tools = [
	{ name: "gitleaks", candidates: [{ command: "gitleaks", versionArgs: ["version"] }] },
	{ name: "osv-scanner", candidates: [{ command: "osv-scanner", versionArgs: ["--version"] }] },
	{
		name: "semgrep",
		candidates: [
			{ command: "semgrep", versionArgs: ["--version"] },
			{ command: "python", versionArgs: ["-m", "semgrep", "--version"] },
		],
	},
	{ name: "nuclei", candidates: [{ command: "nuclei", versionArgs: ["-version"] }] },
];
const missingTools = [];
const unusableTools = [];
const strict = process.env.SECURITY_STRICT_TOOLS === "1" || process.argv.includes("--strict");
const timeoutMs = Number(process.env.SECURITY_TOOLING_TIMEOUT_MS ?? 10_000);

const labelFor = ({ command, versionArgs }) => [command, ...versionArgs].join(" ");

const checkCandidate = ({ command, versionArgs }) => {
	const result = spawnSync(command, versionArgs, {
		encoding: "utf8",
		shell: process.platform === "win32",
		stdio: "pipe",
		timeout: timeoutMs,
	});
	if (result.error?.code === "ENOENT") return { status: "missing" };
	if (result.error?.code === "ETIMEDOUT") return { status: "unusable", detail: `timed out after ${timeoutMs}ms` };
	if (result.status !== 0) {
		const detail = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
		return { status: "unusable", detail: detail || `exited with ${result.status ?? "unknown"}` };
	}
	const version = [result.stdout, result.stderr].filter(Boolean).join("\n").trim().split(/\r?\n/)[0] ?? "ok";
	return { status: "installed", detail: version };
};

const checkTool = ({ candidates }) => {
	const results = candidates.map((candidate) => ({ candidate, result: checkCandidate(candidate) }));
	const installed = results.find(({ result }) => result.status === "installed");
	if (installed) {
		const fallbackDetail = installed.candidate === candidates[0] ? "" : ` via ${labelFor(installed.candidate)}`;
		return {
			status: "installed",
			detail: `${installed.result.detail}${fallbackDetail}`,
		};
	}
	if (results.some(({ result }) => result.status === "unusable")) {
		return {
			status: "unusable",
			detail: results
				.filter(({ result }) => result.status === "unusable")
				.map(({ candidate, result }) => `${labelFor(candidate)} ${result.detail}`)
				.join("; "),
		};
	}
	return { status: "missing" };
};

for (const tool of tools) {
	const result = checkTool(tool);
	if (result.status === "missing") missingTools.push(tool.name);
	if (result.status === "unusable") unusableTools.push(tool.name);
	const detail = result.detail ? ` (${result.detail})` : "";
	console.log(`${tool.name}: ${result.status}${detail}`);
}

if ((missingTools.length > 0 || unusableTools.length > 0) && strict) {
	if (missingTools.length > 0) console.error(`Missing required security tooling: ${missingTools.join(", ")}`);
	if (unusableTools.length > 0) console.error(`Unusable required security tooling: ${unusableTools.join(", ")}`);
	console.error("Install or repair the scanners before running production deploy checks.");
	process.exit(1);
}

console.log(
	"Security tooling smoke finished. Missing or unusable external tools are allowed unless --strict or SECURITY_STRICT_TOOLS=1.",
);
