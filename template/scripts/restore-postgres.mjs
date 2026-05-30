import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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
	console.log(`Usage: pnpm db:restore --file <backup.dump> --yes [options]

Options:
  --file <backup.dump>     Backup file created by pnpm db:backup
  --database-url <url>     Override RESTORE_DATABASE_URL/DATABASE_URL
  --yes                    Confirm destructive restore
  --dry-run                Validate inputs and print the restore command plan
  --help                   Show this help
`);
};

if (hasFlag("--help") || hasFlag("-h")) {
	help();
	process.exit(0);
}

const rootEnv = readEnv("apps/api/.env");
const backupFile = argValue("--file");
const databaseUrl = argValue("--database-url") ?? process.env.RESTORE_DATABASE_URL ?? process.env.DATABASE_URL ?? rootEnv.DATABASE_URL;
const dryRun = hasFlag("--dry-run");
const confirmed = hasFlag("--yes");
const pgRestore = process.env.PGRESTORE_BIN ?? "pg_restore";

if (!backupFile) {
	console.error("A backup file is required. Pass --file <backup.dump>.");
	process.exit(1);
}

const resolvedBackupFile = path.resolve(backupFile);
if (!existsSync(resolvedBackupFile)) {
	console.error(`Backup file not found: ${resolvedBackupFile}`);
	process.exit(1);
}

if (!databaseUrl) {
	console.error("RESTORE_DATABASE_URL or DATABASE_URL is required. Set an env var or pass --database-url.");
	process.exit(1);
}

if (!confirmed && !dryRun) {
	console.error("Restore is destructive. Re-run with --yes after verifying the target database URL.");
	process.exit(1);
}

if (dryRun) {
	console.log(`Would restore ${resolvedBackupFile} into the configured PostgreSQL database.`);
	process.exit(0);
}

const result = spawnSync(
	pgRestore,
	["--clean", "--if-exists", "--no-owner", "--no-privileges", "--dbname", databaseUrl, resolvedBackupFile],
	{
		stdio: "inherit",
		shell: process.platform === "win32",
	},
);

if (result.status !== 0) {
	console.error(`PostgreSQL restore failed with exit code ${result.status ?? 1}.`);
	process.exit(result.status ?? 1);
}

console.log(`PostgreSQL restore completed from ${resolvedBackupFile}`);
