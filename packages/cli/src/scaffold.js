import { spawnSync } from "node:child_process";
import path from "node:path";
import { spinner } from "@clack/prompts";
import fs from "fs-extra";
import pc from "picocolors";

const IGNORE_DIRS = new Set([
	"node_modules",
	".git",
	".turbo",
	".tanstack",
	"dist",
	"build",
	".next",
	"coverage",
	"logs",
	"uploads",
	"playwright-report",
	"test-results",
	".playwright-cli",
	".claude",
	".agents",
	".env",
	".env.local",
	".env.development",
	".env.production",
]);

const BINARY_EXTS = new Set([
	".png",
	".jpg",
	".jpeg",
	".gif",
	".webp",
	".ico",
	".pdf",
	".zip",
	".gz",
	".tar",
	".woff",
	".woff2",
	".ttf",
	".otf",
	".mp4",
	".mov",
	".avif",
]);

const isBinary = (file) => BINARY_EXTS.has(path.extname(file).toLowerCase());
const envQuote = (value) =>
	`"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;

const buildReplacements = (tokens) => [
	[/\{\{\s*projectName\s*\}\}/g, tokens.projectName],
	[/\{\{\s*projectSlug\s*\}\}/g, tokens.projectSlug],
	[/\{\{\s*dbName\s*\}\}/g, tokens.dbName],
	[/\{\{\s*superAdminEmail\s*\}\}/g, tokens.superAdminEmail],
	[/\{\{\s*caddyDomain\s*\}\}/g, tokens.caddyDomain],
];

const walk = async (dir, base, out) => {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		const rel = path.relative(base, full);
		if (entry.isDirectory()) {
			if (IGNORE_DIRS.has(entry.name)) continue;
			await walk(full, base, out);
		} else if (entry.isFile()) {
			out.push(rel);
		}
	}
};

export const scaffold = async ({
	templateDir,
	targetDir,
	tokens,
	actions = {},
}) => {
	const s = spinner();

	s.start("Copying template files");
	await fs.ensureDir(targetDir);
	await fs.copy(templateDir, targetDir, {
		filter: (src) => {
			const base = path.basename(src);
			return !IGNORE_DIRS.has(base);
		},
	});
	s.stop("Template copied");

	s.start("Applying tokens");
	const files = [];
	await walk(targetDir, targetDir, files);

	const rules = buildReplacements(tokens);

	for (const rel of files) {
		const full = path.join(targetDir, rel);
		if (isBinary(full)) continue;
		try {
			const stat = await fs.stat(full);
			if (stat.size > 5 * 1024 * 1024) continue;
			let content = await fs.readFile(full, "utf8");
			let changed = false;
			for (const [re, val] of rules) {
				if (re.test(content)) {
					content = content.replace(re, val);
					changed = true;
				}
			}
			if (changed) await fs.writeFile(full, content, "utf8");
		} catch {
			// Ignore unreadable or non-text files.
		}
	}
	s.stop(pc.green(`Tokens applied to ${files.length} files`));

	s.start("Writing .env files");
	await writeEnvFiles(targetDir, tokens);
	s.stop(".env files written");

	s.start("Writing credentials file");
	await fs.writeFile(
		path.join(targetDir, ".scaffold-credentials.txt"),
		renderCredentials(tokens),
		"utf8",
	);
	s.stop(".scaffold-credentials.txt written (do not commit)");

	if (actions.afterTemplate) await actions.afterTemplate(targetDir);

	if (actions.install) runStep(targetDir, "pnpm", ["install"]);
	if (actions.dbPush) runStep(targetDir, "pnpm", ["db:push"]);
	if (actions.seed) runStep(targetDir, "pnpm", ["db:seed"]);
};

const runStep = (cwd, command, args) => {
	console.log(pc.dim(`\nRunning: ${command} ${args.join(" ")}`));
	const result = spawnSync(command, args, {
		cwd,
		stdio: "inherit",
		shell: process.platform === "win32",
	});
	if (result.status !== 0) {
		throw new Error(`Command failed: ${command} ${args.join(" ")}`);
	}
};

const writeEnvFiles = async (targetDir, t) => {
	const apiEnv = `NODE_ENV=development
APP_NAME=${t.projectName}
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/${t.dbName}
REDIS_URL=redis://localhost:6379
BULLMQ_QUEUES=billing,notifications,reports
BULLMQ_PREFIX=
BETTER_AUTH_SECRET=${t.authSecret}
BETTER_AUTH_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
SUPER_ADMIN_EMAIL=${t.superAdminEmail}
SUPER_ADMIN_PASSWORD=${envQuote(t.superAdminPassword)}
SUPER_ADMIN_NAME=Platform Admin
SAMPLE_OWNER_EMAIL=${t.ownerEmail}
SAMPLE_OWNER_PASSWORD=${envQuote(t.ownerPassword)}
SAMPLE_OWNER_NAME=Sample Owner
API_PORT=3000
API_HOST=0.0.0.0
UPLOAD_MAX_BYTES=10485760
STORAGE_DRIVER=local
OBJECT_STORAGE_ENDPOINT=http://localhost:9000
OBJECT_STORAGE_BUCKET=${t.projectSlug}
OBJECT_STORAGE_REGION=us-east-1
OBJECT_STORAGE_ACCESS_KEY=
OBJECT_STORAGE_SECRET_KEY=
OBJECT_STORAGE_PUBLIC_URL=
LOG_LEVEL=debug
SLOW_QUERY_THRESHOLD_MS=200
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=
CHAPA_SECRET_KEY=
CHAPA_PUBLIC_KEY=
CHAPA_WEBHOOK_SECRET=
CHAPA_BASE_URL=https://api.chapa.co/v1
CHAPA_CALLBACK_BASE_URL=
`;
	const webEnv = `VITE_API_URL=http://localhost:3000
VITE_APP_NAME=${t.projectName}
`;
	await fs.writeFile(path.join(targetDir, "apps/api/.env"), apiEnv, "utf8");
	await fs.writeFile(path.join(targetDir, "apps/web/.env"), webEnv, "utf8");
};

const renderCredentials = (t) => `# ${t.projectName} - Scaffold Credentials

THIS FILE IS LOCAL ONLY. DO NOT COMMIT.

==========================================
SUPER ADMIN (platform admin panel)
==========================================
URL:      http://localhost:5173/admin-login
Email:    ${t.superAdminEmail}
Password: ${t.superAdminPassword}

==========================================
TENANT OWNER (sample org "Acme Inc")
==========================================
URL:      http://localhost:5173/login
Email:    ${t.ownerEmail}
Password: ${t.ownerPassword}

==========================================
ENVIRONMENT
==========================================
Database Name:        ${t.dbName}
Better Auth Secret:   ${t.authSecret}

==========================================
NEXT STEPS
==========================================

1. Create the Postgres database (one of):
   a) psql:        psql -U postgres -c "CREATE DATABASE ${t.dbName};"
   b) pgAdmin:     right-click "Databases" -> Create -> Database -> name = ${t.dbName}
   c) DBeaver / TablePlus: connect, create new database named ${t.dbName}
   d) createdb CLI (if installed):  createdb ${t.dbName}

2. cd ${t.projectSlug} && pnpm install
3. pnpm db:migrate
4. pnpm db:seed
5. pnpm dev
6. Open URLs above and login.
`;
