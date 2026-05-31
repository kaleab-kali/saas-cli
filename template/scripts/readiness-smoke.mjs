import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const tempDir = mkdtempSync(path.join(os.tmpdir(), "{{projectSlug}}-readiness-"));
const databaseUrl = "postgresql://readiness:readiness@127.0.0.1:5432/readiness";

const runNode = (label, args, env = {}) => {
	const result = spawnSync(process.execPath, args, {
		cwd: root,
		encoding: "utf8",
		env: { ...process.env, ...env },
	});
	const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
	if (result.status !== 0) {
		throw new Error(`${label} failed with exit code ${result.status ?? 1}\n${output}`);
	}
	return output;
};

const assertIncludes = (output, expected, label) => {
	if (!output.includes(expected)) {
		throw new Error(`${label} did not include ${expected}\n${output}`);
	}
};

try {
	const deployOutput = runNode(
		"deploy dry-run",
		["scripts/deploy.mjs", "staging", "--dry-run", "--skip-checks", "--skip-git-checks"],
		{
			DEPLOY_HOST: "127.0.0.1",
			DEPLOY_RELEASE_ID: "readiness-smoke",
			DEPLOY_BRANCH: "",
			DEPLOY_PM2_APP: "{{projectSlug}}-readiness",
		},
	);
	assertIncludes(deployOutput, "DRY RUN prepare remote release directories", "deploy dry-run");
	assertIncludes(deployOutput, "DRY RUN rsync release", "deploy dry-run");
	assertIncludes(deployOutput, "pnpm db:backup", "deploy dry-run");
	assertIncludes(deployOutput, "prisma migrate deploy", "deploy dry-run");
	assertIncludes(deployOutput, "pm2 reload", "deploy dry-run");

	const backupOutput = runNode("backup dry-run", [
		"scripts/backup-postgres.mjs",
		"--dry-run",
		"--database-url",
		databaseUrl,
		"--output-dir",
		path.join(tempDir, "backups"),
	]);
	assertIncludes(backupOutput, "Would write PostgreSQL backup", "backup dry-run");
	assertIncludes(backupOutput, "Would prune .dump files older", "backup dry-run");

	const fakeDump = path.join(tempDir, "postgres-readiness.dump");
	writeFileSync(fakeDump, "readiness smoke placeholder", "utf8");
	const restoreOutput = runNode("restore dry-run", [
		"scripts/restore-postgres.mjs",
		"--dry-run",
		"--file",
		fakeDump,
		"--database-url",
		databaseUrl,
	]);
	assertIncludes(restoreOutput, "Would restore", "restore dry-run");

	console.log("Production readiness smoke passed");
} finally {
	rmSync(tempDir, { recursive: true, force: true });
}
