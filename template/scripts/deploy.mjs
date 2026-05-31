import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const environment = args.find((arg) => !arg.startsWith("-"));
const dryRun = args.includes("--dry-run");
const skipChecks = args.includes("--skip-checks");
const skipBackup = args.includes("--skip-backup");
const skipMigrate = args.includes("--skip-migrate");
const skipHealth = args.includes("--skip-health-check");
const skipGitChecks = args.includes("--skip-git-checks") || process.env.DEPLOY_SKIP_GIT_CHECKS === "1";
const confirmedProduction = args.includes("--confirm-production") || process.env.DEPLOY_CONFIRM_PRODUCTION === "1";

const help = () => {
	console.log(`Usage: pnpm deploy <environment> [options]

Examples:
  pnpm deploy staging --dry-run
  pnpm deploy production --confirm-production

Required environment:
  DEPLOY_HOST                 SSH host for the VPS

Optional environment:
  DEPLOY_USER                 SSH user (default: deploy)
  DEPLOY_PATH                 Base deploy path (default: /var/www/{{projectSlug}})
  DEPLOY_SSH_PORT             SSH port
  DEPLOY_BRANCH               Expected local branch (default: main)
  DEPLOY_PM2_APP              PM2 process name (default: {{projectSlug}}-api)
  DEPLOY_HEALTH_URL           Remote health URL (default: http://127.0.0.1:3000/health)
  DEPLOY_KEEP_RELEASES        Release directories to keep (default: 5)
  DEPLOY_BACKUP_RETENTION_DAYS Backup retention for pnpm db:backup (default: 35)
  DEPLOY_RELEASE_ID           Override release id

Options:
  --dry-run                   Print commands without running them
  --skip-checks               Skip local pnpm deploy:check
  --skip-backup               Skip remote pre-migration backup
  --skip-migrate              Skip prisma migrate deploy
  --skip-health-check         Skip post-reload health check
  --skip-git-checks           Skip local clean-worktree and branch checks for dry-run smoke tests
  --confirm-production        Required for production deploys
  --help                      Show this help
`);
};

if (!environment || args.includes("--help") || args.includes("-h")) {
	help();
	process.exit(environment ? 0 : 1);
}

const readEnvFile = (file) => {
	if (!existsSync(file)) return {};
	const values = {};
	for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
		if (!line || line.trimStart().startsWith("#") || !line.includes("=")) continue;
		const [key, ...rest] = line.split("=");
		values[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
	}
	return values;
};

const deployEnv = {
	...readEnvFile(".env.deploy"),
	...readEnvFile(`.env.deploy.${environment}`),
	...process.env,
};

const slug = "{{projectSlug}}";
const host = deployEnv.DEPLOY_HOST;
const user = deployEnv.DEPLOY_USER ?? "deploy";
const sshPort = deployEnv.DEPLOY_SSH_PORT;
const deployPath = deployEnv.DEPLOY_PATH ?? `/var/www/${slug}`;
const expectedBranch = deployEnv.DEPLOY_BRANCH ?? "main";
const pm2App = deployEnv.DEPLOY_PM2_APP ?? `${slug}-api`;
const healthUrl = deployEnv.DEPLOY_HEALTH_URL ?? "http://127.0.0.1:3000/health";
const keepReleases = Number(deployEnv.DEPLOY_KEEP_RELEASES ?? "5");
const backupRetentionDays = Number(deployEnv.DEPLOY_BACKUP_RETENTION_DAYS ?? "35");
const releaseId =
	deployEnv.DEPLOY_RELEASE_ID ??
	new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");

if (environment === "production" && !confirmedProduction && !dryRun) {
	console.error("Production deploys require --confirm-production or DEPLOY_CONFIRM_PRODUCTION=1.");
	process.exit(1);
}

if (!host) {
	console.error("DEPLOY_HOST is required.");
	process.exit(1);
}

if (!Number.isFinite(keepReleases) || keepReleases < 1) {
	console.error("DEPLOY_KEEP_RELEASES must be a positive number.");
	process.exit(1);
}

if (!Number.isFinite(backupRetentionDays) || backupRetentionDays < 1) {
	console.error("DEPLOY_BACKUP_RETENTION_DAYS must be a positive number.");
	process.exit(1);
}

const remote = `${user}@${host}`;
const releasePath = `${deployPath}/releases/${releaseId}`;
const sharedPath = `${deployPath}/shared`;
const currentPath = `${deployPath}/current`;

const shellQuote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;
const asCommand = (cmd, commandArgs) => [cmd, ...commandArgs].join(" ");

const run = (label, cmd, commandArgs, options = {}) => {
	const commandText = asCommand(cmd, commandArgs);
	if (dryRun) {
		console.log(`DRY RUN ${label}: ${commandText}`);
		return;
	}
	const result = spawnSync(cmd, commandArgs, {
		encoding: "utf8",
		shell: process.platform === "win32",
		stdio: "inherit",
		...options,
	});
	if (result.status !== 0) {
		throw new Error(`${label} failed with exit code ${result.status ?? 1}`);
	}
};

const runLocal = (label, command) => {
	run(label, process.platform === "win32" ? "cmd" : "sh", process.platform === "win32" ? ["/c", command] : ["-lc", command]);
};

const runRemote = (label, script) => {
	const sshArgs = [];
	if (sshPort) sshArgs.push("-p", String(sshPort));
	sshArgs.push(remote, `bash -lc ${shellQuote(script)}`);
	run(label, "ssh", sshArgs);
};

const assertCleanGit = () => {
	if (!existsSync(".git")) {
		console.warn("WARN git metadata not found; skipping clean worktree check.");
		return;
	}
	const status = spawnSync("git", ["status", "--short"], {
		encoding: "utf8",
		shell: process.platform === "win32",
	});
	if (status.status !== 0) {
		console.warn("WARN unable to inspect git status before deploy.");
		return;
	}
	if (status.stdout.trim()) {
		throw new Error("Refusing to deploy with uncommitted changes. Commit or stash first.");
	}
};

const assertBranch = () => {
	if (!existsSync(".git")) return;
	const branch = spawnSync("git", ["branch", "--show-current"], {
		encoding: "utf8",
		shell: process.platform === "win32",
	});
	if (branch.status !== 0) {
		console.warn("WARN unable to inspect git branch before deploy.");
		return;
	}
	const actual = branch.stdout.trim();
	if (expectedBranch && actual !== expectedBranch) {
		throw new Error(`Refusing to deploy branch ${actual || "(detached)"}; expected ${expectedBranch}.`);
	}
};

const rsyncArgs = [
	"-az",
	"--delete",
	"--exclude",
	".git",
	"--exclude",
	"node_modules",
	"--exclude",
	"dist",
	"--exclude",
	"coverage",
	"--exclude",
	"playwright-report",
	"--exclude",
	"test-results",
	"--exclude",
	"backups",
	"--exclude",
	"apps/api/uploads",
	"--exclude",
	"apps/api/.env",
	"--exclude",
	"apps/web/.env",
];
if (sshPort) rsyncArgs.push("-e", `ssh -p ${sshPort}`);
rsyncArgs.push(`${path.resolve(".")}/`, `${remote}:${releasePath}/`);

const prepareRemote = `
set -euo pipefail
mkdir -p ${shellQuote(`${deployPath}/releases`)} ${shellQuote(`${sharedPath}/apps/api`)} ${shellQuote(`${sharedPath}/apps/web`)} ${shellQuote(`${sharedPath}/backups`)}
`;

const linkSharedEnv = `
set -euo pipefail
if [ -f ${shellQuote(`${sharedPath}/apps/api/.env`)} ]; then
  ln -sfn ${shellQuote(`${sharedPath}/apps/api/.env`)} ${shellQuote(`${releasePath}/apps/api/.env`)}
else
  echo "WARN missing ${sharedPath}/apps/api/.env"
fi
if [ -f ${shellQuote(`${sharedPath}/apps/web/.env`)} ]; then
  ln -sfn ${shellQuote(`${sharedPath}/apps/web/.env`)} ${shellQuote(`${releasePath}/apps/web/.env`)}
else
  echo "WARN missing ${sharedPath}/apps/web/.env"
fi
`;

const remoteInstall = `
set -euo pipefail
cd ${shellQuote(releasePath)}
corepack enable || true
pnpm install --frozen-lockfile
pnpm db:generate
pnpm build
`;

const remoteBackup = `
set -euo pipefail
cd ${shellQuote(releasePath)}
pnpm db:backup --output-dir ${shellQuote(`${sharedPath}/backups`)} --retention-days ${backupRetentionDays}
`;

const remoteMigrate = `
set -euo pipefail
cd ${shellQuote(releasePath)}
pnpm --filter api exec prisma migrate deploy
`;

const remoteActivate = `
set -euo pipefail
release=${shellQuote(releasePath)}
current=${shellQuote(currentPath)}
previous="$(readlink "$current" || true)"
ln -sfn "$release" "$current"
cd "$current"
pm2 reload ${shellQuote(pm2App)} --update-env || pm2 start ecosystem.config.cjs --env production --name ${shellQuote(pm2App)}
if ${skipHealth ? "false" : `! curl -fsS --max-time 10 ${shellQuote(healthUrl)}`}; then
  echo "Health check failed; rolling back."
  if [ -n "$previous" ] && [ -d "$previous" ]; then
    ln -sfn "$previous" "$current"
    cd "$current"
    pm2 reload ${shellQuote(pm2App)} --update-env || pm2 start ecosystem.config.cjs --env production --name ${shellQuote(pm2App)}
  fi
  exit 1
fi
pm2 save
ls -dt ${shellQuote(`${deployPath}/releases`)}/* | tail -n +$(( ${keepReleases} + 1 )) | xargs -r rm -rf
`;

try {
	console.log(`Deploying {{projectName}} to ${environment} (${remote}:${deployPath})`);
	if (!skipGitChecks) {
		assertCleanGit();
		assertBranch();
	}
	if (!skipChecks) runLocal("local deploy gate", "pnpm deploy:check");
	runRemote("prepare remote release directories", prepareRemote);
	run("rsync release", "rsync", rsyncArgs);
	runRemote("link shared environment files", linkSharedEnv);
	runRemote("install and build remote release", remoteInstall);
	if (!skipBackup) runRemote("backup remote database", remoteBackup);
	if (!skipMigrate) runRemote("run database migrations", remoteMigrate);
	runRemote("activate release and health check", remoteActivate);
	console.log(`Deployment ${releaseId} completed.`);
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
