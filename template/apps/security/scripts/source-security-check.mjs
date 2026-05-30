import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { repoRoot } from "./lib.mjs";

const failures = [];

const read = (relPath) => readFileSync(path.join(repoRoot, relPath), "utf8");

const fail = (message) => failures.push(message);

const assertIncludes = (text, needle, message) => {
	if (!text.includes(needle)) fail(message);
};

const walkFiles = (dir, predicate, out = []) => {
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir)) {
		const fullPath = path.join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			if (["node_modules", "dist", "coverage", "generated"].includes(entry)) continue;
			walkFiles(fullPath, predicate, out);
		} else if (predicate(fullPath)) {
			out.push(fullPath);
		}
	}
	return out;
};

const rel = (fullPath) => path.relative(repoRoot, fullPath).replaceAll("\\", "/");
const sourceExt = /\.(mjs|cjs|js|jsx|ts|tsx)$/;

const apiMain = read("apps/api/src/main.ts");
assertIncludes(apiMain, "app.use(helmet(", "API bootstrap must install Helmet security headers");
assertIncludes(apiMain, "app.enableCors({", "API bootstrap must configure CORS explicitly");
assertIncludes(apiMain, "credentials: true", "CORS must preserve credentialed auth cookies intentionally");
assertIncludes(apiMain, "new ValidationPipe({", "API bootstrap must install a global ValidationPipe");
assertIncludes(apiMain, "whitelist: true", "ValidationPipe must strip unknown DTO properties");
assertIncludes(apiMain, "forbidNonWhitelisted: true", "ValidationPipe must reject unknown DTO properties");
assertIncludes(apiMain, 'process.env.NODE_ENV !== "production"', "Swagger/docs must stay development-only");
assertIncludes(apiMain, "X-Content-Type-Options", "served uploads must set nosniff headers");
assertIncludes(apiMain, "Content-Security-Policy", "served uploads must set a restrictive CSP");

const uploadService = read("apps/api/src/modules/upload/application/upload.service.ts");
assertIncludes(uploadService, "UPLOAD_TYPE_POLICIES", "uploads must use an explicit MIME and extension policy");
assertIncludes(uploadService, "UPLOAD_ALLOWED_MIME_TYPES", "uploads must support configurable MIME allowlists");
assertIncludes(uploadService, "file content does not match declared type", "uploads must validate binary signatures");
assertIncludes(uploadService, "text upload contains unsafe content", "uploads must reject unsafe text/HTML payloads");

const appModule = read("apps/api/src/app.module.ts");
const tenantThrottler = read("apps/api/src/shared/rate-limit/tenant-throttler.guard.ts");
const rateLimitConfig = read("apps/api/src/shared/rate-limit/rate-limit.config.ts");
assertIncludes(appModule, "TenantThrottlerGuard", "global throttling must use tenant-aware tracker guard");
assertIncludes(tenantThrottler, "tenant:", "rate limiting must isolate tenant request buckets");
assertIncludes(tenantThrottler, "admin:", "rate limiting must isolate admin request buckets");
assertIncludes(tenantThrottler, "auth.api.getSession", "tenant throttler must resolve Better Auth tenant sessions");
assertIncludes(tenantThrottler, "adminAuth.api.getSession", "tenant throttler must resolve admin sessions separately");
assertIncludes(rateLimitConfig, "API_RATE_LIMIT_PER_TENANT", "rate limit defaults must be configurable per deployment");

const allSource = walkFiles(repoRoot, (file) => sourceExt.test(file));
const unsafePrismaRaw = "$query" + "RawUnsafe";

for (const file of allSource) {
	const relative = rel(file);
	if (relative.includes("/node_modules/") || relative.includes("/dist/")) continue;
	const text = readFileSync(file, "utf8");

	if (text.includes(unsafePrismaRaw)) {
		fail(`${relative} uses Prisma ${unsafePrismaRaw}`);
	}

	if (/\beval\s*\(/.test(text) || /\bnew\s+Function\s*\(/.test(text)) {
		fail(`${relative} uses eval-like code execution`);
	}

	if (relative.startsWith("apps/web/src/") && /from\s+["']axios["']/.test(text)) {
		fail(`${relative} imports axios directly; use the shared api client`);
	}

	if (
		relative.startsWith("apps/web/src/") &&
		relative !== "apps/web/src/shared/lib/api-client.ts" &&
		/useEffect\s*\([^)]*=>[\s\S]{0,400}\bfetch\s*\(/.test(text)
	) {
		fail(`${relative} performs fetch inside useEffect; use TanStack Query hooks`);
	}
}

if (failures.length > 0) {
	console.error("Source security check failed:");
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log("Source security check passed");
