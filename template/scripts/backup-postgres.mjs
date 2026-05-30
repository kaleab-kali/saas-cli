import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

const argValue = (name, fallback = null) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : fallback;
};

const hasFlag = (name) => args.includes(name);

const readEnv = (file) => {
	if (!existsSync(file)) return {};
	const out = {};
	for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
		if (!line || line.trimStart().startsWith("#") || !line.includes("=")) continue;
		const [key, ...rest] = line.split("=");
		out[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
	}
	return out;
};

const help = () => {
	console.log(`Usage: pnpm db:backup [options]

Options:
  --database-url <url>     Override DATABASE_URL
  --output-dir <dir>       Backup directory (default: backups/postgres)
  --retention-days <days>  Delete local .dump files older than this (default: 35)
  --dry-run                Print the planned backup without running pg_dump
  --help                   Show this help
`);
};

if (hasFlag("--help") || hasFlag("-h")) {
	help();
	process.exit(0);
}

const rootEnv = readEnv("apps/api/.env");
const databaseUrl = argValue("--database-url") ?? process.env.DATABASE_URL ?? rootEnv.DATABASE_URL;
const outputDir = path.resolve(argValue("--output-dir", process.env.BACKUP_DIR ?? "backups/postgres"));
const retentionDays = Number(argValue("--retention-days", process.env.BACKUP_RETENTION_DAYS ?? "35"));
const dryRun = hasFlag("--dry-run");
const pgDump = process.env.PGDUMP_BIN ?? "pg_dump";

if (!databaseUrl) {
	console.error("DATABASE_URL is required. Set DATABASE_URL or pass --database-url.");
	process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = path.join(outputDir, `postgres-${timestamp}.dump`);

const pruneOldBackups = () => {
	if (!Number.isFinite(retentionDays) || retentionDays <= 0 || !existsSync(outputDir)) return;
	const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
	for (const entry of readdirSync(outputDir)) {
		if (!entry.endsWith(".dump")) continue;
		const file = path.join(outputDir, entry);
		const info = statSync(file);
		if (info.isFile() && info.mtimeMs < cutoff) rmSync(file);
	}
};

if (dryRun) {
	console.log(`Would write PostgreSQL backup to ${backupFile}`);
	console.log(`Would prune .dump files older than ${retentionDays} day(s) from ${outputDir}`);
	process.exit(0);
}

mkdirSync(outputDir, { recursive: true });
pruneOldBackups();

const result = spawnSync(pgDump, ["--format=custom", "--no-owner", "--no-privileges", "--file", backupFile, databaseUrl], {
	stdio: "inherit",
	shell: process.platform === "win32",
});

if (result.status !== 0) {
	console.error(`PostgreSQL backup failed with exit code ${result.status ?? 1}.`);
	process.exit(result.status ?? 1);
}

console.log(`PostgreSQL backup written to ${backupFile}`);
