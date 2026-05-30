import { repoRoot, run, runOptional } from "./lib.mjs";

let failed = false;

if (process.env.SECURITY_SKIP_PNPM_AUDIT === "1") {
	console.log("SECURITY_SKIP_PNPM_AUDIT=1. Skipping pnpm audit.");
} else {
	const auditCode = await run(
		"pnpm",
		["audit", "--prod", "--audit-level", process.env.SECURITY_AUDIT_LEVEL ?? "high"],
		{
			cwd: repoRoot,
		},
	);
	failed = failed || auditCode !== 0;
}

const osvCode = await runOptional({
	command: "osv-scanner",
	args: ["--lockfile", "pnpm-lock.yaml"],
	cwd: repoRoot,
	install: "Install osv-scanner from https://google.github.io/osv-scanner/",
});
failed = failed || osvCode !== 0;

process.exit(failed ? 1 : 0);
