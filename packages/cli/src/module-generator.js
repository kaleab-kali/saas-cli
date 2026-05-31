import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import pc from "picocolors";
import { stripDomainStarterCode } from "./base-cleanup.js";

const SOURCE_DIR = path.dirname(fileURLToPath(import.meta.url));
const STARTER_PACK_ROOT = path.resolve(SOURCE_DIR, "../starters");
const EIMS_STARTER_ARTIFACTS_DIR = path.join(STARTER_PACK_ROOT, "eims", "artifacts");

const slugify = (s) =>
	s
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

const pascal = (slug) =>
	slug
		.split("-")
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");

const camel = (slug) => {
	const p = pascal(slug);
	return p.charAt(0).toLowerCase() + p.slice(1);
};

const writeNew = async (file, content) => {
	if (await fs.pathExists(file))
		throw new Error(`Refusing to overwrite existing file: ${file}`);
	await fs.ensureDir(path.dirname(file));
	await fs.writeFile(file, content, "utf8");
};

const writeIfMissing = async (file, content) => {
	if (await fs.pathExists(file)) return;
	await writeNew(file, content);
};

const STARTER_PACKS = {
	crm: {
		label: "CRM",
		modules: ["accounts", "contacts", "deals", "activities"],
	},
	marketplace: {
		label: "Marketplace",
		modules: ["vendors", "listings", "orders", "reviews"],
	},
	"project-management": {
		label: "Project management",
		modules: ["projects", "tasks", "milestones", "comments"],
	},
	"ai-saas": {
		label: "AI SaaS",
		modules: ["ai-workflows", "prompt-runs", "model-usage", "knowledge-bases"],
	},
	booking: {
		label: "Booking",
		modules: ["services", "bookings", "availability", "customers"],
	},
	helpdesk: {
		label: "Helpdesk",
		modules: ["tickets", "ticket-comments", "support-slas", "knowledge-base"],
	},
	eims: {
		label: "EIMS/EIRMS e-invoicing",
		description:
			"Adds Ethiopian EIMS/EIRMS onboarding, setup, submissions, compliance, tests, and operations scaffolding.",
		version: "0.1.0",
		modules: ["invoicing", "eims"],
		custom: "eims",
		manifest: "packages/cli/starters/eims/pack.json",
	},
};

const STARTER_ALIASES = {
	ai: "ai-saas",
	project: "project-management",
	projects: "project-management",
	pm: "project-management",
	support: "helpdesk",
};

const STATE_FILE = ".scaffold-state.json";

const EIMS_DIRECTORY_SKELETON = [
	"apps/api/src/modules/eims/admin/application",
	"apps/api/src/modules/eims/admin/domain",
	"apps/api/src/modules/eims/admin/infrastructure",
	"apps/api/src/modules/eims/admin/presentation",
	"apps/api/src/modules/eims/compliance/application",
	"apps/api/src/modules/eims/compliance/domain",
	"apps/api/src/modules/eims/compliance/infrastructure",
	"apps/api/src/modules/eims/compliance/presentation",
	"apps/api/src/modules/eims/receipts/application",
	"apps/api/src/modules/eims/receipts/domain",
	"apps/api/src/modules/eims/receipts/infrastructure",
	"apps/api/src/modules/eims/receipts/presentation",
	"apps/api/src/modules/eims/setup/application/commands",
	"apps/api/src/modules/eims/setup/application/dto",
	"apps/api/src/modules/eims/setup/application/queries",
	"apps/api/src/modules/eims/setup/domain",
	"apps/api/src/modules/eims/setup/infrastructure/repositories",
	"apps/api/src/modules/eims/setup/presentation",
	"apps/api/src/modules/eims/shared/client",
	"apps/api/src/modules/eims/shared/callbacks",
	"apps/api/src/modules/eims/shared/canonicalization",
	"apps/api/src/modules/eims/shared/constants",
	"apps/api/src/modules/eims/shared/crypto",
	"apps/api/src/modules/eims/shared/errors",
	"apps/api/src/modules/eims/shared/lookups",
	"apps/api/src/modules/eims/shared/mock",
	"apps/api/src/modules/eims/shared/notifications",
	"apps/api/src/modules/eims/shared/offline",
	"apps/api/src/modules/eims/shared/presentation",
	"apps/api/src/modules/eims/shared/printing",
	"apps/api/src/modules/eims/shared/queues",
	"apps/api/src/modules/eims/shared/schemas",
	"apps/api/src/modules/eims/shared/signing",
	"apps/api/src/modules/eims/submission/application",
	"apps/api/src/modules/eims/submission/domain",
	"apps/api/src/modules/eims/submission/infrastructure",
	"apps/api/src/modules/eims/submission/presentation",
	"apps/api/src/modules/invoicing/domain",
	"apps/web/src/features/eims/api",
	"apps/web/src/features/eims/components",
	"apps/web/src/routes/_authenticated/eims",
	"apps/web/src/routes/admin/eims",
	"apps/api-tests/bruno/EIMS-Phase0",
	"apps/api-tests/tests",
	"apps/e2e/tests",
];

const EIMS_STARTER_ARTIFACTS = [
	"apps/api/src/modules/eims",
	"apps/api/src/modules/invoicing",
	"apps/api-tests/bruno/EIMS-Phase0",
	"apps/api-tests/scripts/eims-mock-api-server.mjs",
	"apps/api-tests/scripts/eims-static-web-server.mjs",
	"apps/api-tests/scripts/with-mock-api.mjs",
	"apps/api-tests/tests/eims-acceptance.spec.ts",
	"apps/api-tests/tests/eims-v3-mock.spec.ts",
	"apps/e2e/playwright.eims.config.ts",
	"apps/e2e/tests/eims-mock.spec.ts",
	"apps/web/src/features/eims",
	"apps/web/src/routes/_authenticated/eims",
	"apps/web/src/routes/admin/eims",
];
const EIMS_REPLACEABLE_ARTIFACTS = new Set(["apps/api-tests/scripts/with-mock-api.mjs"]);
const EIMS_REFRESHABLE_ARTIFACTS = new Set([
	"apps/api-tests/scripts/eims-static-web-server.mjs",
	"apps/api-tests/scripts/with-mock-api.mjs",
	"apps/e2e/playwright.eims.config.ts",
	"apps/e2e/tests/eims-mock.spec.ts",
	"apps/web/src/features/eims",
	"apps/web/src/routes/_authenticated/eims",
	"apps/web/src/routes/admin/eims",
]);

export const listStarterPacks = () => Object.keys(STARTER_PACKS);

const starterManifestPath = (slug) => path.join(STARTER_PACK_ROOT, slug, "pack.json");

const readStarterManifest = (slug) => {
	const file = starterManifestPath(slug);
	if (!fs.existsSync(file)) return null;
	try {
		return fs.readJsonSync(file);
	} catch {
		return null;
	}
};

export const getStarterPackDetail = (starterName) => {
	const slug = resolveStarterPack(starterName);
	const pack = STARTER_PACKS[slug];
	if (!pack) return null;
	const manifest = readStarterManifest(slug);
	return {
		name: slug,
		label: manifest?.displayName ?? pack.label,
		description: manifest?.description ?? pack.description ?? `${pack.label} starter pack`,
		version: manifest?.version ?? pack.version ?? "0.1.0",
		modules: pack.modules,
		manifest: fs.existsSync(starterManifestPath(slug))
			? pack.manifest ?? `packages/cli/starters/${slug}/pack.json`
			: null,
		envVars: Array.isArray(manifest?.addsEnvVars) ? manifest.addsEnvVars : [],
		routes: Array.isArray(manifest?.addsRoutes) ? manifest.addsRoutes : [],
		models: Array.isArray(manifest?.addsModels) ? manifest.addsModels : [],
		permissions: Array.isArray(manifest?.addsPermissions) ? manifest.addsPermissions : [],
		seedData: Array.isArray(manifest?.addsSeedData) ? manifest.addsSeedData : [],
		queues: Array.isArray(manifest?.addsQueues) ? manifest.addsQueues : [],
		crons: Array.isArray(manifest?.addsCrons) ? manifest.addsCrons : [],
		dependencies:
			manifest?.addsDependencies && typeof manifest.addsDependencies === "object"
				? manifest.addsDependencies
				: {},
		devDependencies:
			manifest?.addsDevDependencies && typeof manifest.addsDevDependencies === "object"
				? manifest.addsDevDependencies
				: {},
	};
};

export const listStarterPackDetails = () =>
	Object.keys(STARTER_PACKS).map((name) => getStarterPackDetail(name));

export const validateStarterPackNames = (starterNames = []) => {
	const normalized = [];
	for (const starterName of starterNames) {
		const slug = resolveStarterPack(starterName);
		if (!STARTER_PACKS[slug]) {
			throw new Error(
				`Unknown starter pack '${starterName}'. Available packs: ${listStarterPacks().join(", ")}`,
			);
		}
		if (!normalized.includes(slug)) normalized.push(slug);
	}
	return normalized;
};

const resolveStarterPack = (starterName) => {
	const slug = slugify(starterName ?? "");
	return STARTER_ALIASES[slug] ?? slug;
};

const assertGeneratedProjectRoot = async (cwd) => {
	const rootPackage = path.join(cwd, "package.json");
	if (!(await fs.pathExists(rootPackage))) {
		throw new Error("Run this command from a generated project root.");
	}
};

const readScaffoldState = async (cwd) => {
	const file = path.join(cwd, STATE_FILE);
	if (!(await fs.pathExists(file))) return { version: 1, starters: [] };
	try {
		const state = await fs.readJson(file);
		return {
			version: Number(state.version) || 1,
			starters: Array.isArray(state.starters) ? state.starters : [],
		};
	} catch {
		return { version: 1, starters: [] };
	}
};

const writeScaffoldState = async (cwd, state) => {
	await fs.writeJson(path.join(cwd, STATE_FILE), state, { spaces: "\t" });
};

const isStarterInstalled = async (cwd, slug) => {
	const state = await readScaffoldState(cwd);
	return state.starters.some((starter) => starter.name === slug);
};

const recordStarterInstalled = async (cwd, slug, pack) => {
	const state = await readScaffoldState(cwd);
	const existing = state.starters.find((starter) => starter.name === slug);
	const installedAt = new Date().toISOString();
	const detail = getStarterPackDetail(slug);
	const entry = {
		name: slug,
		label: detail?.label ?? pack.label,
		version: detail?.version ?? pack.version ?? "0.1.0",
		modules: pack.modules,
		envVars: detail?.envVars ?? [],
		routes: detail?.routes ?? [],
		models: detail?.models ?? [],
		permissions: detail?.permissions ?? [],
		seedData: detail?.seedData ?? [],
		queues: detail?.queues ?? [],
		crons: detail?.crons ?? [],
		dependencies: detail?.dependencies ?? {},
		devDependencies: detail?.devDependencies ?? {},
		installedAt,
	};
	if (existing) Object.assign(existing, entry);
	else state.starters.push(entry);
	await writeScaffoldState(cwd, state);
};

const recordStarterRemoved = async (cwd, slug) => {
	const state = await readScaffoldState(cwd);
	const next = {
		...state,
		starters: state.starters.filter((starter) => starter.name !== slug),
	};
	await writeScaffoldState(cwd, next);
};

const assertModulesCanBeCreated = async (cwd, modules) => {
	const existing = [];
	for (const moduleName of modules) {
		const slug = slugify(moduleName);
		const paths = [
			path.join(cwd, "apps/api/src/modules", slug),
			path.join(cwd, "apps/web/src/features", slug),
			path.join(cwd, "apps/web/src/routes/_authenticated", slug),
		];
		for (const target of paths) {
			if (await fs.pathExists(target)) {
				existing.push(path.relative(cwd, target));
				break;
			}
		}
	}
	if (existing.length > 0) {
		throw new Error(
			`Refusing to overwrite existing starter-pack modules:\n${existing.map((p) => `- ${p}`).join("\n")}`,
		);
	}
};

const patchAppModule = async (root, slug, name) => {
	const file = path.join(root, "apps/api/src/app.module.ts");
	if (!(await fs.pathExists(file))) return false;
	let text = await fs.readFile(file, "utf8");
	const importLine = `import { ${name}Module } from "#modules/${slug}/${slug}.module";`;
	if (!text.includes(importLine)) {
		text = text.replace(
			/import \{ PrismaModule \}/,
			`${importLine}\nimport { PrismaModule }`,
		);
	}
	if (!text.includes(`${name}Module,`)) {
		text = text.replace(/(\s+RoleModule,\r?\n)/, `$1\t\t${name}Module,\n`);
	}
	text = sortTopLevelImports(text);
	await fs.writeFile(file, text, "utf8");
	return true;
};

const sortTopLevelImports = (text) => {
	const match = text.match(/^((?:import .+\r?\n)+)/);
	if (!match) return text;
	const newline = match[0].includes("\r\n") ? "\r\n" : "\n";
	const importSource = (line) => line.match(/\sfrom\s"([^"]+)"/)?.[1] ?? line;
	const importGroup = (source) => {
		if (source.startsWith("#modules/")) return 1;
		if (source.startsWith("#shared/")) return 2;
		if (source.startsWith(".")) return 3;
		return 0;
	};
	const imports = match[1]
		.trimEnd()
		.split(/\r?\n/)
		.sort((a, b) => {
			const sourceA = importSource(a);
			const sourceB = importSource(b);
			const groupDiff = importGroup(sourceA) - importGroup(sourceB);
			if (groupDiff !== 0) return groupDiff;
			return sourceA.localeCompare(sourceB) || a.localeCompare(b);
		});
	return `${imports.join(newline)}${newline}${text.slice(match[1].length)}`;
};

const insertBeforeLastRoleBrace = (text, roleName, line) => {
	const start = text.indexOf(`export const ${roleName} = ac.newRole({`);
	if (start === -1) return text;
	const end = text.indexOf("\n});", start);
	if (end === -1) return text;
	const block = text.slice(start, end);
	if (block.includes(line.trim())) return text;
	return `${text.slice(0, end)}\n${line}${text.slice(end)}`;
};

const patchPermissions = async (root, slug) => {
	const file = path.join(root, "apps/api/src/modules/auth/permissions.ts");
	if (!(await fs.pathExists(file))) return false;
	let text = await fs.readFile(file, "utf8");
	const statementLine = `\t"${slug}": ["create", "read", "update", "delete"],`;
	if (!text.includes(statementLine.trim())) {
		text = text.replace(/(\n\} as const;)/, `\n${statementLine}$1`);
	}
	text = insertBeforeLastRoleBrace(
		text,
		"owner",
		`\t"${slug}": ["create", "read", "update", "delete"],`,
	);
	text = insertBeforeLastRoleBrace(
		text,
		"admin",
		`\t"${slug}": ["create", "read", "update", "delete"],`,
	);
	text = insertBeforeLastRoleBrace(
		text,
		"member",
		`\t"${slug}": ["create", "read", "update", "delete"],`,
	);
	text = insertBeforeLastRoleBrace(text, "viewer", `\t"${slug}": ["read"],`);
	await fs.writeFile(file, text, "utf8");
	return true;
};

const patchLocaleEntries = async (localeFile, containerKey, entries) => {
	if (!(await fs.pathExists(localeFile))) return;
	let text = await fs.readFile(localeFile, "utf8");
	const containerMatch = text.match(new RegExp(`^(\\t*)${containerKey}: \\{`, "m"));
	const containerIndent = containerMatch?.[1] ?? "\t";
	const entryIndent = `${containerIndent}\t`;
	const entryIndentPattern = entryIndent.replace(/\t/g, "\\t");

	for (const [key, label] of entries) {
		const pattern = new RegExp(`(${entryIndentPattern}${key}: )"[^"]+",`);
		if (pattern.test(text)) {
			text = text.replace(pattern, `$1"${label}",`);
		}
	}

	const missing = entries.filter(([key]) => !new RegExp(`\\b${key}:`).test(text));
	if (missing.length > 0) {
		const missingLines = missing.map(([key, label]) => `${entryIndent}${key}: "${label}",`).join("\n");
		const containerPattern = new RegExp(`(${containerIndent.replace(/\t/g, "\\t")}${containerKey}: \\{\\r?\\n)`);
		text = text.replace(containerPattern, `$1${missingLines}\n`);
	}

	await fs.writeFile(localeFile, text, "utf8");
};

const patchSidebarLocaleEntries = async (root, entries) => {
	for (const locale of ["en", "am"]) {
		await patchLocaleEntries(
			path.join(root, `apps/web/src/shared/i18n/locales/${locale}.ts`),
			"sidebar",
			entries,
		);
	}
};

const patchAdminLocaleEntries = async (root, entries) => {
	for (const locale of ["en", "am"]) {
		await patchLocaleEntries(
			path.join(root, `apps/web/src/shared/i18n/locales/${locale}.ts`),
			"nav",
			entries,
		);
	}
};

const patchEimsTenantSidebar = async (root) => {
	const file = path.join(root, "apps/web/src/components/layout/AppSidebar.tsx");
	if (!(await fs.pathExists(file))) return false;
	let text = await fs.readFile(file, "utf8");
	if (!text.includes("FileValidationIcon")) {
		if (text.includes('import DashboardSquare01Icon from "@hugeicons/core-free-icons/DashboardSquare01Icon";')) {
			text = text.replace(
				'import DashboardSquare01Icon from "@hugeicons/core-free-icons/DashboardSquare01Icon";',
				'import DashboardSquare01Icon from "@hugeicons/core-free-icons/DashboardSquare01Icon";\nimport FileValidationIcon from "@hugeicons/core-free-icons/FileValidationIcon";',
			);
		} else {
			text = text.replace(
				/import \{\r?\n/,
				"import {\n\tFileValidationIcon,\n",
			);
		}
	}
	const navBlock = `\t{
\t\tlabelKey: "sidebar.eims",
\t\tto: "/eims",
\t\ticon: FileValidationIcon,
\t\tchildren: [
\t\t\t{ labelKey: "sidebar.eimsStatus", to: "/eims" },
\t\t\t{ labelKey: "sidebar.eimsSetup", to: "/eims/setup" },
\t\t\t{ labelKey: "sidebar.eimsInvoices", to: "/eims/submissions" },
\t\t\t{ labelKey: "sidebar.eimsReceipts", to: "/eims/receipts" },
\t\t\t{ labelKey: "sidebar.eimsCancellations", to: "/eims/bulk" },
\t\t\t{ labelKey: "sidebar.eimsExports", to: "/eims/compliance" },
\t\t],
\t},`;

	if (text.includes(`labelKey: "sidebar.eims"`)) {
		text = text.replace(
			/\n\t\{\n\t\tlabelKey: "sidebar\.eims",[\s\S]*?\n\t\},/,
			`\n${navBlock}`,
		);
	} else {
		text = text.replace(
			/(const NAV_ITEMS: readonly NavItemDef\[] = \[\r?\n)/,
			`$1${navBlock}\n`,
		);
	}

	text = text
		.replace("Tenant workspace", "EIMS tax workspace")
		.replace("Launch status", "Tax launch status")
		.replace("Concierge setup ready", "EIMS setup active")
		.replace(
			`<div className="mt-1 text-sidebar-foreground/62">Use onboarding first, then attach vertical packs.</div>`,
			`<div className="mt-1 text-sidebar-foreground/62">
								Start in onboarding, then use MoR approval, certificates, source setup, and compliance evidence.
							</div>`,
		);

	await fs.writeFile(file, text, "utf8");
	await patchSidebarLocaleEntries(root, [
		["eims", "Tax tools"],
		["eimsStatus", "Status"],
		["eimsSetup", "Setup"],
		["eimsInvoices", "Tax invoices"],
		["eimsReceipts", "Receipts"],
		["eimsCancellations", "Cancellations"],
		["eimsExports", "Records & exports"],
	]);
	return true;
};

const patchEimsAdminSidebar = async (root) => {
	const file = path.join(root, "apps/web/src/components/layout/AdminSidebar.tsx");
	if (!(await fs.pathExists(file))) return false;
	let text = await fs.readFile(file, "utf8");

	if (!text.includes("const EIMS_ADMIN_NAV =")) {
		const navConst = `
const EIMS_ADMIN_NAV = [
\t{ labelKey: "admin.nav.eimsOverview", to: "/admin/eims", icon: DashboardSquare01Icon },
\t{ labelKey: "admin.nav.eimsTenants", to: "/admin/eims/tenants", icon: Building06Icon },
\t{ labelKey: "admin.nav.eimsFailures", to: "/admin/eims/failures", icon: FileValidationIcon },
\t{ labelKey: "admin.nav.eimsCertificates", to: "/admin/eims/certificates", icon: AiSecurity01Icon },
\t{ labelKey: "admin.nav.eimsResources", to: "/admin/eims/resources", icon: Settings02Icon },
\t{ labelKey: "admin.nav.eimsCompliance", to: "/admin/eims/compliance", icon: FileValidationIcon },
] as const;
`;
		text = text.replace("] as const;\nconst APP_NAME", `] as const;\n${navConst}const APP_NAME`);
	}

	if (!text.includes('admin.nav.eimsOperations')) {
		const group = `\n\t\t\t\t\t<SidebarGroup>
\t\t\t\t\t\t<SidebarGroupLabel>{t("admin.nav.eimsOperations")}</SidebarGroupLabel>
\t\t\t\t\t\t<SidebarGroupContent>
\t\t\t\t\t\t\t<SidebarMenu>
\t\t\t\t\t\t\t\t{EIMS_ADMIN_NAV.map((item) => (
\t\t\t\t\t\t\t\t\t<AdminNavItem
\t\t\t\t\t\t\t\t\t\tkey={item.to}
\t\t\t\t\t\t\t\t\t\tlabel={t(item.labelKey)}
\t\t\t\t\t\t\t\t\t\tto={item.to}
\t\t\t\t\t\t\t\t\t\ticon={item.icon}
\t\t\t\t\t\t\t\t\t\tisActive={!!matchRoute({ to: item.to, fuzzy: true })}
\t\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t))}
\t\t\t\t\t\t\t</SidebarMenu>
\t\t\t\t\t\t</SidebarGroupContent>
\t\t\t\t\t</SidebarGroup>`;
		text = text.replace("</SidebarGroup>\n\t\t\t\t</SidebarContent>", `</SidebarGroup>${group}\n\t\t\t\t</SidebarContent>`);
	}

	text = text
		.replace("Operations focus", "EIMS operations focus")
		.replace("Tenant launch queue", "EIMS tenant launch queue")
		.replace(
			"Onboarding, jobs, billing, and audits are grouped for support staff.",
			"Failures, certificates, queues, and compliance evidence stay grouped for support staff.",
		);

	await fs.writeFile(file, text, "utf8");
	await patchAdminLocaleEntries(root, [
		["eimsOperations", "EIMS operations"],
		["eimsOverview", "Operations overview"],
		["eimsTenants", "Tenant readiness"],
		["eimsFailures", "Failure queue"],
		["eimsCertificates", "Certificates"],
		["eimsResources", "Runtime resources"],
		["eimsCompliance", "Compliance evidence"],
	]);
	return true;
};

const patchEimsLandingRoute = async (root) => {
	const file = path.join(root, "apps/web/src/routes/index.tsx");
	if (!(await fs.pathExists(file))) return false;
	const text = await fs.readFile(file, "utf8");
	const next = text.replace(
		/return <Navigate to="\/(?:onboarding|eims)" \/>;/,
		'return <Navigate to="/onboarding" />;',
	);
	if (next === text) return false;
	await fs.writeFile(file, next, "utf8");
	return true;
};

const patchSidebar = async (root, slug, name, varName) => {
	if (slug === "eims") {
		await patchEimsTenantSidebar(root);
		await patchEimsAdminSidebar(root);
		return true;
	}

	const file = path.join(root, "apps/web/src/components/layout/AppSidebar.tsx");
	if (!(await fs.pathExists(file))) return false;
	let text = await fs.readFile(file, "utf8");
	const navBlock = `\t{
\t\tlabelKey: "sidebar.${varName}",
\t\tto: "/${slug}",
\t\ticon: DashboardSquare01Icon,
\t},`;
	if (!text.includes(`to: "/${slug}"`)) {
		text = text.replace(
			/(const NAV_ITEMS: readonly NavItemDef\[] = \[\r?\n)/,
			`$1${navBlock}\n`,
		);
	}
	await fs.writeFile(file, text, "utf8");

	for (const locale of ["en", "am"]) {
		const localeFile = path.join(
			root,
			`apps/web/src/shared/i18n/locales/${locale}.ts`,
		);
		if (!(await fs.pathExists(localeFile))) continue;
		let localeText = await fs.readFile(localeFile, "utf8");
		const label = locale === "en" ? name : name;
		const line = `\t\t${varName}: "${label}",`;
		if (!localeText.includes(`${varName}:`)) {
			localeText = localeText.replace(
				/(\n\t\},\r?\n\tauth: \{)/,
				`\n${line}$1`,
			);
			await fs.writeFile(localeFile, localeText, "utf8");
		}
	}
	return true;
};

export const addModule = async ({ cwd, moduleName }) => {
	if (!moduleName)
		throw new Error("Usage: create-vyllion-saas add module <name>");
	await assertGeneratedProjectRoot(cwd);

	const slug = slugify(moduleName);
	const name = pascal(slug);
	const varName = camel(slug);
	const apiBase = path.join(cwd, "apps/api/src/modules", slug);
	const webBase = path.join(cwd, "apps/web/src/features", slug);
	const routeFile = path.join(
		cwd,
		"apps/web/src/routes/_authenticated",
		slug,
		"index.tsx",
	);

	await writeNew(
		path.join(apiBase, `${slug}.module.ts`),
		`import { Module } from "@nestjs/common";
import { AuthModule } from "#modules/auth/auth.module";
import { PrismaModule } from "#shared/database/prisma.module";
import { Create${name}Handler } from "./application/commands/create-${slug}.handler";
import { List${name}Handler } from "./application/queries/list-${slug}.handler";
import { ${name}Repository } from "./domain/repositories/${slug}.repository";
import { Prisma${name}Repository } from "./infrastructure/repositories/prisma-${slug}.repository";
import { ${name}Controller } from "./presentation/${slug}.controller";

@Module({
\timports: [AuthModule, PrismaModule],
\tcontrollers: [${name}Controller],
\tproviders: [
\t\t{ provide: ${name}Repository, useClass: Prisma${name}Repository },
\t\tCreate${name}Handler,
\t\tList${name}Handler,
\t],
})
export class ${name}Module {}
`,
	);
	await writeNew(
		path.join(apiBase, "domain", "entities", `${slug}.entity.ts`),
		`import { randomUUID } from "node:crypto";
import { BadRequestException } from "@nestjs/common";

export interface ${name}Props {
\tid: string;
\torganizationId: string;
\tname: string;
\tdescription: string | null;
\tcreatedAt: Date;
\tupdatedAt: Date;
}

export class ${name} {
\tprivate constructor(private readonly props: ${name}Props) {}

\tstatic create(input: { organizationId: string; name: string; description?: string | null }) {
\t\tconst name = input.name.trim();
\t\tif (!name) throw new BadRequestException("name is required");
\t\treturn new ${name}({
\t\t\tid: randomUUID(),
\t\t\torganizationId: input.organizationId,
\t\t\tname,
\t\t\tdescription: input.description?.trim() || null,
\t\t\tcreatedAt: new Date(),
\t\t\tupdatedAt: new Date(),
\t\t});
\t}

\tstatic rehydrate(props: ${name}Props) {
\t\treturn new ${name}(props);
\t}

\tget id() {
\t\treturn this.props.id;
\t}

\ttoPrimitives(): ${name}Props {
\t\treturn { ...this.props };
\t}
}
`,
	);
	await writeNew(
		path.join(apiBase, "domain", "repositories", `${slug}.repository.ts`),
		`import type { ${name} } from "../entities/${slug}.entity";

export abstract class ${name}Repository {
\tabstract list(organizationId: string): Promise<${name}[]>;
\tabstract save(entity: ${name}): Promise<${name}>;
}
`,
	);
	await writeNew(
		path.join(apiBase, "infrastructure", "mappers", `${slug}.mapper.ts`),
		`import { ${name} } from "../../domain/entities/${slug}.entity";

export class ${name}Mapper {
\tstatic toDto(entity: ${name}) {
\t\tconst row = entity.toPrimitives();
\t\treturn {
\t\t\tid: row.id,
\t\t\torganizationId: row.organizationId,
\t\t\tname: row.name,
\t\t\tdescription: row.description,
\t\t\tcreatedAt: row.createdAt,
\t\t\tupdatedAt: row.updatedAt,
\t\t};
\t}
}
`,
	);
	await writeNew(
		path.join(
			apiBase,
			"infrastructure",
			"repositories",
			`prisma-${slug}.repository.ts`,
		),
		`import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { ${name} } from "../../domain/entities/${slug}.entity";
import { ${name}Repository } from "../../domain/repositories/${slug}.repository";

@Injectable()
export class Prisma${name}Repository extends ${name}Repository {
\tconstructor(private readonly prisma: PrismaService) {
\t\tsuper();
\t}

\tasync list(_organizationId: string): Promise<${name}[]> {
\t\t// Add a Prisma model to schema.prisma, then map rows back with ${name}.rehydrate.
\t\tvoid this.prisma;
\t\treturn [];
\t}

\tasync save(entity: ${name}): Promise<${name}> {
\t\t// Replace this with prisma.${varName}.create once the model exists.
\t\tvoid this.prisma;
\t\treturn entity;
\t}
}
`,
	);
	await writeNew(
		path.join(apiBase, "application", "commands", `create-${slug}.handler.ts`),
		`import { Injectable } from "@nestjs/common";
import { ${name} } from "../../domain/entities/${slug}.entity";
import { ${name}Repository } from "../../domain/repositories/${slug}.repository";
import { ${name}Mapper } from "../../infrastructure/mappers/${slug}.mapper";
import type { Create${name}Dto } from "../../presentation/${slug}.dto";

@Injectable()
export class Create${name}Handler {
\tconstructor(private readonly repo: ${name}Repository) {}

\tasync execute(organizationId: string, dto: Create${name}Dto) {
\t\tconst entity = ${name}.create({
\t\t\torganizationId,
\t\t\tname: dto.name,
\t\t\tdescription: dto.description,
\t\t});
\t\treturn ${name}Mapper.toDto(await this.repo.save(entity));
\t}
}
`,
	);
	await writeNew(
		path.join(apiBase, "application", "queries", `list-${slug}.handler.ts`),
		`import { Injectable } from "@nestjs/common";
import { ${name}Repository } from "../../domain/repositories/${slug}.repository";
import { ${name}Mapper } from "../../infrastructure/mappers/${slug}.mapper";

@Injectable()
export class List${name}Handler {
\tconstructor(private readonly repo: ${name}Repository) {}

\tasync execute(organizationId: string) {
\t\tconst items = await this.repo.list(organizationId);
\t\treturn items.map(${name}Mapper.toDto);
\t}
}
`,
	);
	await writeNew(
		path.join(
			apiBase,
			"application",
			"commands",
			`create-${slug}.handler.spec.ts`,
		),
		`import { Create${name}Handler } from "./create-${slug}.handler";
import type { ${name}Repository } from "../../domain/repositories/${slug}.repository";

describe("Create${name}Handler", () => {
\tit("creates a tenant-scoped ${slug} through the repository", async () => {
\t\tconst repo = {
\t\t\tsave: jest.fn(async (entity) => entity),
\t\t\tlist: jest.fn(),
\t\t} as unknown as ${name}Repository;
\t\tconst handler = new Create${name}Handler(repo);

\t\tconst result = await handler.execute("org_1", { name: "Example", description: "Demo" });

\t\texpect(result.organizationId).toBe("org_1");
\t\texpect(result.name).toBe("Example");
\t\texpect(repo.save).toHaveBeenCalledTimes(1);
\t});
});
`,
	);
	await writeNew(
		path.join(apiBase, "presentation", `${slug}.dto.ts`),
		`import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class Create${name}Dto {
\t@ApiProperty()
\t@IsString()
\t@MinLength(1)
\t@MaxLength(160)
\tname!: string;

\t@ApiProperty({ required: false })
\t@IsOptional()
\t@IsString()
\t@MaxLength(1000)
\tdescription?: string;
}
`,
	);
	await writeNew(
		path.join(apiBase, "presentation", `${slug}.controller.ts`),
		`import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { Create${name}Handler } from "../application/commands/create-${slug}.handler";
import { List${name}Handler } from "../application/queries/list-${slug}.handler";
import { Create${name}Dto } from "./${slug}.dto";

type AuthedReq = { organizationId: string };

@ApiTags("${name}")
@Controller("${slug}")
@UseGuards(AuthGuard, PermissionsGuard)
export class ${name}Controller {
\tconstructor(
\t\tprivate readonly createHandler: Create${name}Handler,
\t\tprivate readonly listHandler: List${name}Handler,
\t) {}

\t@Get()
\t@RequirePermissions("${slug}:read")
\t@ApiOperation({ summary: "List ${slug}" })
\tasync list(@Req() req: AuthedReq) {
\t\treturn { data: await this.listHandler.execute(req.organizationId) };
\t}

\t@Post()
\t@RequirePermissions("${slug}:create")
\t@ApiOperation({ summary: "Create ${slug}" })
\tasync create(@Req() req: AuthedReq, @Body() dto: Create${name}Dto) {
\t\treturn { data: await this.createHandler.execute(req.organizationId, dto) };
\t}
}
`,
	);
	await writeNew(
		path.join(webBase, "api", `${slug}.hooks.ts`),
		`import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface ${name}Item {
\tid: string;
\tname: string;
\tdescription?: string;
}

const keys = {
\tall: ["${slug}"] as const,
};

export const use${name}List = () =>
\tuseQuery({
\t\tqueryKey: keys.all,
\t\tqueryFn: () => api.get<{ data: ${name}Item[] }>("/${slug}"),
\t\tselect: (r) => r.data,
\t});

export const useCreate${name} = () => {
\tconst qc = useQueryClient();
\treturn useMutation({
\t\tmutationFn: (body: { name: string; description?: string }) => api.post("/${slug}", body),
\t\tonSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
\t});
};
`,
	);
	await writeNew(
		path.join(webBase, "components", `${name}List.tsx`),
		`import React from "react";
import { use${name}List } from "../api/${slug}.hooks";

export const ${name}List = React.memo(() => {
\tconst { data = [], isLoading } = use${name}List();
\tif (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
\tif (data.length === 0) return <p className="text-sm text-muted-foreground">No ${slug} yet.</p>;
\treturn (
\t\t<ul className="space-y-2">
\t\t\t{data.map((item) => (
\t\t\t\t<li key={item.id} className="rounded-md border p-3">
\t\t\t\t\t<div className="font-medium">{item.name}</div>
\t\t\t\t\t{item.description && <div className="text-sm text-muted-foreground">{item.description}</div>}
\t\t\t\t</li>
\t\t\t))}
\t\t</ul>
\t);
});
${name}List.displayName = "${name}List";
`,
	);
	await writeNew(
		routeFile,
		`import { createFileRoute } from "@tanstack/react-router";
import { ${name}List } from "#features/${slug}/components/${name}List";

export const Route = createFileRoute("/_authenticated/${slug}/")({
\tcomponent: ${name}Page,
});

function ${name}Page() {
\treturn (
\t\t<div className="space-y-6 p-6">
\t\t\t<div>
\t\t\t\t<h1 className="text-2xl font-semibold">${name}</h1>
\t\t\t\t<p className="text-sm text-muted-foreground">Replace this scaffold with your real workflow.</p>
\t\t\t</div>
\t\t\t<${name}List />
\t\t</div>
\t);
}
`,
	);

	const patched = await patchAppModule(cwd, slug, name);
	const permissionsPatched = await patchPermissions(cwd, slug);
	const sidebarPatched = await patchSidebar(cwd, slug, name, varName);
	console.log(pc.green(`Module '${slug}' scaffolded.`));
	console.log(pc.dim(`API: apps/api/src/modules/${slug}`));
	console.log(pc.dim(`Web: apps/web/src/features/${slug}`));
	console.log(
		pc.dim(`Route: apps/web/src/routes/_authenticated/${slug}/index.tsx`),
	);
	if (patched) console.log(pc.dim("AppModule import was updated."));
	if (permissionsPatched) console.log(pc.dim("Permissions were updated."));
	if (sidebarPatched) console.log(pc.dim("Sidebar navigation was updated."));
	console.log(
		pc.dim(
			"Next: add a Prisma model and replace the scaffold service with real queries.",
		),
	);
};

const EIMS_PERMISSION_STATEMENTS = [
	`"eims-enterprise": ["create", "read", "update"],`,
	`"eims-establishment": ["create", "read", "update"],`,
	`"eims-source": ["create", "read", "update"],`,
	`"eims-credential": ["create", "read", "rotate"],`,
	`"eims-certificate": ["read", "import", "rotate"],`,
	`"eims-submission": ["read", "create", "retry"],`,
	`"eims-bulk": ["read", "create", "retry"],`,
	`"eims-compliance": ["read", "export"],`,
];

const patchEimsPermissions = async (root) => {
	const file = path.join(root, "apps/api/src/modules/auth/permissions.ts");
	if (!(await fs.pathExists(file))) return false;
	let text = await fs.readFile(file, "utf8");
	text = text.replaceAll(
		`\tinvoice: ["create", "read", "submit", "cancel", "verify", "export"],`,
		`\tinvoice: ["create", "read", "update-draft", "submit", "verify", "cancel", "export"],`,
	);
	for (const line of EIMS_PERMISSION_STATEMENTS) {
		const statementLine = `\t${line}`;
		if (!text.includes(statementLine.trim())) {
			text = text.replace(/(\n\} as const;)/, `\n${statementLine}$1`);
		}
	}

	const ownerLines = [
		`\t"eims-enterprise": ["create", "read", "update"],`,
		`\t"eims-establishment": ["create", "read", "update"],`,
		`\t"eims-source": ["create", "read", "update"],`,
		`\t"eims-credential": ["create", "read", "rotate"],`,
		`\t"eims-certificate": ["read", "import", "rotate"],`,
		`\t"eims-submission": ["read", "create", "retry"],`,
		`\t"eims-bulk": ["read", "create", "retry"],`,
		`\t"eims-compliance": ["read", "export"],`,
	];
	const adminLines = [
		`\t"eims-enterprise": ["create", "read", "update"],`,
		`\t"eims-establishment": ["create", "read", "update"],`,
		`\t"eims-source": ["create", "read", "update"],`,
		`\t"eims-credential": ["create", "read", "rotate"],`,
		`\t"eims-certificate": ["read", "import", "rotate"],`,
		`\t"eims-submission": ["read", "create", "retry"],`,
		`\t"eims-bulk": ["read", "create", "retry"],`,
		`\t"eims-compliance": ["read", "export"],`,
	];
	const memberLines = [
		`\t"eims-enterprise": ["read"],`,
		`\t"eims-establishment": ["read"],`,
		`\t"eims-source": ["read"],`,
		`\t"eims-submission": ["read"],`,
	];
	const viewerLines = [
		`\t"eims-enterprise": ["read"],`,
		`\t"eims-establishment": ["read"],`,
		`\t"eims-source": ["read"],`,
		`\t"eims-submission": ["read"],`,
	];

	for (const line of ownerLines)
		text = insertBeforeLastRoleBrace(text, "owner", line);
	for (const line of adminLines)
		text = insertBeforeLastRoleBrace(text, "admin", line);
	for (const line of memberLines)
		text = insertBeforeLastRoleBrace(text, "member", line);
	for (const line of viewerLines)
		text = insertBeforeLastRoleBrace(text, "viewer", line);

	await fs.writeFile(file, text, "utf8");
	return true;
};

const patchEimsFeatureKeys = async (root) => {
	const keysFile = path.join(
		root,
		"apps/api/src/modules/billing/domain/value-objects/feature-keys.vo.ts",
	);
	if (await fs.pathExists(keysFile)) {
		let text = await fs.readFile(keysFile, "utf8");
		if (!text.includes(`"eims.enabled"`)) {
			const eimsKeys = [
				`"eims.enabled",`,
				`"eims.enterprises",`,
				`"eims.establishments",`,
				`"eims.source-systems",`,
				`"eims.monthly-invoices",`,
				`"eims.bulk-registration",`,
				`"eims.offline-mode",`,
				`"eims.compliance-export",`,
				`"eims.api-requests-per-minute",`,
				`"eims.retention-months",`,
			]
				.map((line) => `\t${line}`)
				.join("\n");
			text = text.replace(
				/(\t"reporting\.export-pdf",\r?\n)(\] as const;)/,
				`$1${eimsKeys}\n$2`,
			);
		}
		if (!text.includes(`"eims.enterprises": "enterprises"`)) {
			const limited = [
				`"eims.enterprises": "registered taxpayer enterprises",`,
				`"eims.establishments": "registered establishments/branches",`,
				`"eims.source-systems": "registered source systems",`,
				`"eims.monthly-invoices": "EIMS invoices per month",`,
				`"eims.api-requests-per-minute": "EIMS API requests per minute",`,
				`"eims.retention-months": "EIMS retention months",`,
			]
				.map((line) => `\t${line}`)
				.join("\n");
			text = text.replace(
				/(\n\} as const;\r?\n\r?\nexport const PLAN_SLUGS)/,
				`\n${limited}$1`,
			);
		}
		await fs.writeFile(keysFile, text, "utf8");
	}

	const registryFile = path.join(
		root,
		"apps/api/src/modules/billing/domain/value-objects/feature-registry.ts",
	);
	if (await fs.pathExists(registryFile)) {
		let text = await fs.readFile(registryFile, "utf8");
		text = text.replace(
			`category: "core" | "platform" | "notifications" | "reporting";`,
			`category: "core" | "platform" | "notifications" | "reporting" | "eims";`,
		);
		if (!text.includes(`"eims.enabled": {`)) {
			const entries = `\t"eims.enabled": {
\t\tkey: "eims.enabled",
\t\tlabel: "EIMS",
\t\tcategory: "eims",
\t\tenforcement: "allow",
\t\tdescription: "Enable Ethiopian EIMS/EIRMS e-invoicing workflows.",
\t},
\t"eims.enterprises": {
\t\tkey: "eims.enterprises",
\t\tlabel: "EIMS enterprises",
\t\tcategory: "eims",
\t\tenforcement: "limit",
\t\tdescription: "Registered taxpayer enterprises allowed.",
\t},
\t"eims.establishments": {
\t\tkey: "eims.establishments",
\t\tlabel: "EIMS establishments",
\t\tcategory: "eims",
\t\tenforcement: "limit",
\t\tdescription: "Registered establishments/branches allowed.",
\t},
\t"eims.source-systems": {
\t\tkey: "eims.source-systems",
\t\tlabel: "EIMS source systems",
\t\tcategory: "eims",
\t\tenforcement: "limit",
\t\tdescription: "Registered POS/ERP/source systems allowed.",
\t},
\t"eims.monthly-invoices": {
\t\tkey: "eims.monthly-invoices",
\t\tlabel: "EIMS monthly invoices",
\t\tcategory: "eims",
\t\tenforcement: "limit",
\t\tdescription: "Accepted EIMS invoices per month.",
\t},
\t"eims.bulk-registration": {
\t\tkey: "eims.bulk-registration",
\t\tlabel: "EIMS bulk registration",
\t\tcategory: "eims",
\t\tenforcement: "allow",
\t\tdescription: "Bulk invoice registration workflows.",
\t},
\t"eims.offline-mode": {
\t\tkey: "eims.offline-mode",
\t\tlabel: "EIMS offline mode",
\t\tcategory: "eims",
\t\tenforcement: "allow",
\t\tdescription: "Pending local invoice mode while EIMS is unreachable.",
\t},
\t"eims.compliance-export": {
\t\tkey: "eims.compliance-export",
\t\tlabel: "EIMS compliance export",
\t\tcategory: "eims",
\t\tenforcement: "allow",
\t\tdescription: "Export EIMS compliance evidence packages.",
\t},
\t"eims.api-requests-per-minute": {
\t\tkey: "eims.api-requests-per-minute",
\t\tlabel: "EIMS API rate limit",
\t\tcategory: "eims",
\t\tenforcement: "limit",
\t\tdescription: "Per-tenant EIMS API requests per minute.",
\t},
\t"eims.retention-months": {
\t\tkey: "eims.retention-months",
\t\tlabel: "EIMS retention",
\t\tcategory: "eims",
\t\tenforcement: "limit",
\t\tdescription: "EIMS evidence retention period in months.",
\t},
`;
			text = text.replace(
				/(\n\};\r?\n\r?\nconst missing)/,
				`\n${entries.trimEnd()}$1`,
			);
		}
		await fs.writeFile(registryFile, text, "utf8");
	}

	return true;
};

const patchJsonFile = async (file, patcher) => {
	if (!(await fs.pathExists(file))) return false;
	const json = await fs.readJson(file);
	const next = patcher(json) ?? json;
	await fs.writeFile(file, `${JSON.stringify(next, null, "\t")}\n`, "utf8");
	return true;
};

const patchEimsPackageScripts = async (root) => {
	await patchJsonFile(path.join(root, "package.json"), (json) => {
		json.scripts ??= {};
		json.scripts["test:eims:local"] ??=
			"pnpm --filter api test -- --runTestsByPath src/modules/eims/shared/constants/eims-lookup-values.spec.ts src/modules/eims/shared/client/mock-eims-external.client.spec.ts src/modules/eims/shared/client/eims-sdk-client.provider.spec.ts src/modules/eims/shared/client/eims-sdk-external.client.spec.ts src/modules/eims/shared/bulk/eims-bulk-submission.service.spec.ts src/modules/eims/shared/callbacks/eims-bulk-callback.service.spec.ts src/modules/eims/shared/callbacks/eims-bulk-callback-persistence.service.spec.ts src/modules/eims/shared/callbacks/eims-bulk-reconciliation-polling.service.spec.ts src/modules/eims/shared/callbacks/eims-bulk-reconciliation-scheduler.service.spec.ts src/modules/eims/shared/cancellations/eims-cancellation.service.spec.ts src/modules/eims/shared/crypto/eims-credential-secret.service.spec.ts src/modules/eims/shared/crypto/eims-credential-persistence.service.spec.ts src/modules/eims/shared/crypto/eims-credential-validation.service.spec.ts src/modules/eims/shared/lookups/eims-lookup.service.spec.ts src/modules/eims/shared/offline/eims-offline-pending-sync-cache.service.spec.ts src/modules/eims/shared/offline/eims-offline-pending-sync-persistence.service.spec.ts src/modules/eims/shared/offline/eims-offline-replay.service.spec.ts src/modules/eims/shared/offline/eims-offline-replay-scheduler.service.spec.ts src/modules/eims/shared/printing/eims-print-proof.service.spec.ts src/modules/eims/shared/queues/eims-bulk-reconciliation-queue.service.spec.ts src/modules/eims/shared/queues/eims-offline-replay-queue.service.spec.ts src/modules/eims/shared/queues/eims-submission-queue-persistence.service.spec.ts src/modules/eims/shared/queues/eims-submission-source-lock.service.spec.ts src/modules/eims/shared/queues/eims-submission-queue.service.spec.ts src/modules/eims/setup/domain/source-submission.guard.spec.ts src/modules/eims/submission/application/eims-submission.service.spec.ts src/modules/invoicing/domain/canonical-invoice.spec.ts";
		json.scripts["phase0:eims:local"] ??=
			"pnpm --filter api exec tsx scripts/phase0/layer-a/run-all.ts";
		json.scripts["test:eims:sdk-contract"] ??=
			"pnpm --filter api exec tsx scripts/eims-sdk-contract.ts";
		json.scripts["test:eims:api"] ??=
			"pnpm --filter api-tests test:eims:mock";
		json.scripts["test:eims:phase0"] ??=
			"pnpm --filter api-tests test:bruno:mock";
		json.scripts["test:eims:acceptance"] ??=
			"pnpm --filter acceptance test:eims";
		json.scripts["test:eims:sandbox"] ??= "pnpm --filter api-tests test:bruno";
		json.scripts["test:eims:ui"] ??= "pnpm --filter e2e test:eims";
		json.scripts["test:eims:ui:headed"] ??=
			"pnpm --filter e2e test:eims:headed";
		json.scripts["test:eims:security"] ??= "pnpm --filter security test:eims";
		json.scripts["test:eims:performance"] ??=
			"pnpm --filter performance test:eims";
		json.scripts["test:eims:mock"] ??=
			"pnpm db:generate && pnpm lint && pnpm typecheck && pnpm test:eims:local && pnpm phase0:eims:local && pnpm test:eims:api && pnpm test:eims:phase0 && pnpm test:eims:acceptance && pnpm test:eims:security && pnpm test:eims:performance && pnpm test:eims:ui";
		return json;
	});
	await patchJsonFile(path.join(root, "apps/acceptance/package.json"), (json) => {
		json.scripts ??= {};
		json.scripts["test:eims"] ??=
			"cucumber-js features/eims.feature --import steps/*.mjs";
		return json;
	});
	await patchJsonFile(path.join(root, "apps/e2e/package.json"), (json) => {
		json.scripts ??= {};
		json.scripts["test:eims"] ??= "playwright test -c playwright.eims.config.ts tests/eims-mock.spec.ts";
		json.scripts["test:eims:headed"] ??=
			"playwright test -c playwright.eims.config.ts tests/eims-mock.spec.ts --headed --project=chromium";
		return json;
	});
	await patchJsonFile(path.join(root, "apps/api-tests/package.json"), (json) => {
		json.scripts ??= {};
		json.scripts["test:eims:mock"] ??= "node scripts/with-mock-api.mjs eims-http";
		return json;
	});
	await patchJsonFile(path.join(root, "apps/security/package.json"), (json) => {
		json.scripts ??= {};
		json.scripts["test:eims"] ??= "node scripts/eims-security-smoke.mjs";
		return json;
	});
	await patchJsonFile(path.join(root, "apps/performance/package.json"), (json) => {
		json.scripts ??= {};
		json.scripts["test:eims"] ??= "node scripts/eims-mock-load.mjs";
		json.scripts["test:eims:k6"] ??= "node scripts/run-k6.mjs k6/eims-submit.js";
		return json;
	});
};

const appendBlockIfMissing = async (file, marker, block) => {
	if (!(await fs.pathExists(file))) return false;
	let text = await fs.readFile(file, "utf8");
	if (text.includes(marker)) return false;
	text = `${text.trimEnd()}\n\n${block.trimEnd()}\n`;
	await fs.writeFile(file, text, "utf8");
	return true;
};

const patchEnvListValue = async (file, key, values) => {
	if (!(await fs.pathExists(file))) return false;
	let text = await fs.readFile(file, "utf8");
	const lineRegex = new RegExp(`^${key}=.*$`, "m");
	const existingLine = text.match(lineRegex)?.[0];
	const existingValues = existingLine
		? existingLine
				.slice(key.length + 1)
				.split(",")
				.map((value) => value.trim())
				.filter(Boolean)
		: [];
	const nextValues = [...new Set([...existingValues, ...values])].join(",");
	const nextLine = `${key}=${nextValues}`;
	text = existingLine ? text.replace(lineRegex, nextLine) : `${text.trimEnd()}\n${nextLine}\n`;
	await fs.writeFile(file, text, "utf8");
	return true;
};

const patchEimsEnvExamples = async (root) => {
	const block = `# --- EIMS / Ethiopian e-invoicing (optional starter) ---
EIMS_ENV=sandbox
EIMS_SDK_PACKAGE_NAME=@yourcompany/eims-sdk
EIMS_API_URL=
EIMS_BASE_URL_SANDBOX=
EIMS_BASE_URL_PRODUCTION=
EIMS_BULK_URL_SANDBOX=
EIMS_BULK_URL_PRODUCTION=
EIMS_TIMEOUT_MS=30000
EIMS_MAX_RETRIES=3
EIMS_SIGNING_PROVIDER=local
EIMS_CANONICALIZATION_VERSION=phase0-unlocked
EIMS_MOCK_MODE=true
EIMS_PHASE0_STRICT=false
EIMS_CALLBACK_PUBLIC_URL=
EIMS_CALLBACK_HMAC_SECRET=
EIMS_LOOKUP_CACHE_TTL_SECONDS=300
EIMS_QUEUE_PREFIX=eims
EIMS_SUBMISSION_DISTRIBUTED_LOCKS=false
EIMS_SUBMISSION_LOCK_TTL_MS=30000
EIMS_SUBMISSION_LOCK_WAIT_MS=10000
EIMS_WORKERS_ENABLED=false
EIMS_BULK_RECONCILIATION_ATTEMPTS=5
EIMS_BULK_RECONCILIATION_SCHEDULER_ENABLED=false
EIMS_BULK_RECONCILIATION_BATCH_LIMIT=25
EIMS_OFFLINE_REPLAY_ATTEMPTS=5
EIMS_OFFLINE_REPLAY_SCHEDULER_ENABLED=false
EIMS_OFFLINE_REPLAY_BATCH_LIMIT=10
EIMS_OFFLINE_REPLAY_ORGANIZATION_LIMIT=50`;
	const productionBlock = `# --- EIMS / Ethiopian e-invoicing (optional starter) ---
EIMS_ENV=production
EIMS_SDK_PACKAGE_NAME=@yourcompany/eims-sdk
EIMS_API_URL=https://eims.example.gov.et
EIMS_BASE_URL_SANDBOX=
EIMS_BASE_URL_PRODUCTION=https://eims.example.gov.et
EIMS_BULK_URL_SANDBOX=
EIMS_BULK_URL_PRODUCTION=https://eims-bulk.example.gov.et
EIMS_TIMEOUT_MS=30000
EIMS_MAX_RETRIES=3
EIMS_SIGNING_PROVIDER=vault
EIMS_CANONICALIZATION_VERSION=phase0-unlocked
EIMS_MOCK_MODE=false
EIMS_PHASE0_STRICT=true
EIMS_CALLBACK_PUBLIC_URL=https://your-domain.com/api/v1/eims/callbacks
EIMS_CALLBACK_HMAC_SECRET=replace-with-32-byte-random-callback-secret
EIMS_LOOKUP_CACHE_TTL_SECONDS=300
EIMS_QUEUE_PREFIX=eims
EIMS_SUBMISSION_DISTRIBUTED_LOCKS=true
EIMS_SUBMISSION_LOCK_TTL_MS=30000
EIMS_SUBMISSION_LOCK_WAIT_MS=10000
EIMS_WORKERS_ENABLED=true
EIMS_BULK_RECONCILIATION_ATTEMPTS=5
EIMS_BULK_RECONCILIATION_SCHEDULER_ENABLED=true
EIMS_BULK_RECONCILIATION_BATCH_LIMIT=25
EIMS_OFFLINE_REPLAY_ATTEMPTS=5
EIMS_OFFLINE_REPLAY_SCHEDULER_ENABLED=true
EIMS_OFFLINE_REPLAY_BATCH_LIMIT=10
EIMS_OFFLINE_REPLAY_ORGANIZATION_LIMIT=50`;

	await appendBlockIfMissing(
		path.join(root, ".env.example"),
		"EIMS_ENV=",
		block,
	);
	await appendBlockIfMissing(
		path.join(root, ".env.production.example"),
		"EIMS_ENV=",
		productionBlock,
	);
	await appendBlockIfMissing(
		path.join(root, "apps/api/.env.example"),
		"EIMS_ENV=",
		block,
	);
	await appendBlockIfMissing(
		path.join(root, "apps/api/.env"),
		"EIMS_ENV=",
		block,
	);
	const eimsQueueNames = ["eims-submission-retry", "eims-bulk-callback", "eims-offline-replay"];
	for (const envFile of [
		path.join(root, ".env.example"),
		path.join(root, ".env.production.example"),
		path.join(root, "apps/api/.env.example"),
		path.join(root, "apps/api/.env"),
	]) {
		await patchEnvListValue(envFile, "BULLMQ_QUEUES", eimsQueueNames);
	}
	return true;
};

const patchEimsPrismaSchema = async (root) => {
	const file = path.join(root, "apps/api/prisma/schema.prisma");
	if (!(await fs.pathExists(file))) return false;
	let text = await fs.readFile(file, "utf8");
	if (text.includes("model EimsEnterprise")) return false;

	const block = `
// ============================================================
// EIMS / EIRMS ETHIOPIAN E-INVOICING
// Optional starter pack. Keep this bounded context isolated.
// ============================================================

model EimsEnterprise {
  id             String   @id @default(cuid())
  organizationId String
  tin            String
  legalName      String
  tradeName      String?
  vatNumber      String?
  email          String?
  phone          String?
  status         String   @default("draft")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([organizationId, tin])
  @@index([organizationId, status])
  @@map("eims_enterprise")
}

model EimsEstablishment {
  id              String    @id @default(cuid())
  organizationId  String
  enterpriseId    String
  establishmentNo String?
  name            String
  code            String
  subTin          String?
  region          String?
  zone            String?
  city            String?
  subCity         String?
  wereda          String?
  kebele          String?
  locality        String?
  houseNumber     String?
  managerUserId   String?
  status          String    @default("draft")
  openedAt        DateTime?
  closedAt        DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([organizationId, enterpriseId, code])
  @@index([organizationId, enterpriseId])
  @@index([organizationId, status])
  @@map("eims_establishment")
}

model EimsSourceSystem {
  id                    String    @id @default(cuid())
  organizationId        String
  enterpriseId          String
  establishmentId       String
  name                  String
  systemNumber          String?
  systemType            String
  model                 String?
  manufacturer          String?
  softwareVersion       String?
  serviceType           String?
  serviceCenterTin      String?
  serviceDate           DateTime?
  lastUpgradeDate       DateTime?
  permitNo              String?
  machineRegNo          String?
  simCardNo             String?
  inHouseDeveloped      Boolean   @default(false)
  approvalStatus        String    @default("draft")
  active                Boolean   @default(false)
  credentialId          String?
  certificateId         String?
  updateRequestedStatus String?
  version               Int       @default(0)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([organizationId, establishmentId])
  @@index([organizationId, approvalStatus, active])
  @@map("eims_source_system")
}

model EimsCredential {
  id                         String    @id @default(cuid())
  organizationId             String
  sourceSystemId             String
  environment                String
  clientId                   String?
  username                   String?
  clientSecretEncrypted      Bytes?
  clientSecretKeyVersion     String?
  apiKeyEncrypted            Bytes?
  apiKeyKeyVersion           String?
  passwordEncrypted          Bytes?
  passwordKeyVersion         String?
  refreshTokenEncrypted      Bytes?
  refreshTokenKeyVersion     String?
  tokenExpiresAt             DateTime?
  lastTestedAt               DateTime?
  lastTestStatus             String?
  lastRotatedAt              DateTime?
  rotationRevision           Int       @default(0)
  rotationEvidenceSha256     String?
  status                     String    @default("initial_setup")
  createdAt                  DateTime  @default(now())
  updatedAt                  DateTime  @updatedAt

  @@unique([organizationId, sourceSystemId, environment])
  @@map("eims_credential")
}

model EimsCertificate {
  id             String    @id @default(cuid())
  organizationId String
  sourceSystemId String
  environment    String
  certificatePem String
  serialNumber   String?
  subjectCn      String?
  issuer         String?
  validFrom      DateTime?
  validTo        DateTime?
  fingerprintSha256 String?
  status         String    @default("imported")
  keyProvider    String?
  keyRef         String?
  keyVersion     String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([organizationId, sourceSystemId, environment])
  @@index([validTo, status])
  @@map("eims_certificate")
}

model EimsSourceSystemCounter {
  id                  String    @id @default(cuid())
  organizationId      String
  sourceSystemId      String    @unique
  lastAcceptedCounter BigInt    @default(0)
  lastAcceptedIrn     String?
  lastIssuedAt        DateTime?
  status              String    @default("healthy")
  version             Int       @default(0)
  updatedAt           DateTime  @updatedAt

  @@index([organizationId])
  @@map("eims_source_system_counter")
}

model EimsCounterReservation {
  id             String    @id @default(cuid())
  organizationId String
  sourceSystemId String
  invoiceId      String
  counter        BigInt
  previousIrn    String?
  payloadHash    String
  status         String
  eimsRequestId  String?
  createdAt      DateTime  @default(now())
  submittedAt    DateTime?
  acceptedAt     DateTime?
  failedAt       DateTime?
  errorCode      String?
  errorDetail    Json?

  @@unique([sourceSystemId, counter])
  @@index([organizationId, sourceSystemId, status])
  @@map("eims_counter_reservation")
}

model UserEstablishmentAssignment {
  id              String    @id @default(cuid())
  organizationId  String
  userId          String
  establishmentId String
  role            String
  isPrimary       Boolean   @default(false)
  assignedAt      DateTime  @default(now())
  revokedAt       DateTime?

  @@unique([userId, establishmentId])
  @@index([organizationId])
  @@map("user_establishment_assignment")
}

model UserSourceSystemAssignment {
  id             String    @id @default(cuid())
  organizationId String
  userId         String
  sourceSystemId String
  assignedAt     DateTime  @default(now())
  revokedAt      DateTime?

  @@unique([userId, sourceSystemId])
  @@index([organizationId])
  @@map("user_source_system_assignment")
}

model TenantBuyer {
  id             String   @id @default(cuid())
  organizationId String
  buyerTin       String?
  buyerSubTin    String?
  legalName      String
  tradeName      String?
  vatNumber      String?
  buyerType      String   @default("business")
  isGovernment   Boolean  @default(false)
  email          String?
  phone          String?
  region         String?
  zone           String?
  city           String?
  subCity        String?
  wereda         String?
  kebele         String?
  locality       String?
  houseNumber    String?
  idType         String?
  idNumberEncrypted Bytes?
  idNumberKeyVersion String?
  frequentBuyer Boolean  @default(false)
  active         Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId, buyerTin])
  @@index([organizationId, buyerType, active])
  @@map("tenant_buyer")
}

model TaxInvoice {
  id                  String    @id @default(cuid())
  organizationId      String
  enterpriseId        String
  establishmentId     String
  sourceSystemId      String
  transactionType     String
  documentType        String
  documentNumber      String
  manualInvoiceNumber String?
  documentDate        DateTime
  invoiceCurrency     String    @default("ETB")
  exchangeRate        Decimal?  @db.Decimal(20, 6)
  previousIrn         String?
  relatedDocument     String?
  sourceBusinessEvent String?
  status              String    @default("draft")
  historical          Boolean   @default(false)
  totalValue          Decimal   @db.Decimal(20, 2)
  taxValue            Decimal   @db.Decimal(20, 2)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@unique([organizationId, documentNumber])
  @@index([organizationId, sourceSystemId, status])
  @@index([organizationId, documentDate])
  @@map("tax_invoice")
}

model TaxInvoiceLine {
  id                 String   @id @default(cuid())
  organizationId     String
  invoiceId          String
  lineNumber         Int
  natureOfSupplies   String
  itemCode           String?
  harmonizationCode  String?
  productDescription String
  unitPrice          Decimal  @db.Decimal(20, 2)
  quantity           Decimal  @db.Decimal(20, 4)
  unit               String
  preTaxValue        Decimal  @db.Decimal(20, 2)
  discount           Decimal? @db.Decimal(20, 2)
  exciseTaxValue     Decimal? @db.Decimal(20, 2)
  taxCode            String
  taxAmount          Decimal  @db.Decimal(20, 2)
  totalLineAmount    Decimal  @db.Decimal(20, 2)

  @@unique([invoiceId, lineNumber])
  @@index([organizationId, invoiceId])
  @@map("tax_invoice_line")
}

model EimsSubmission {
  id                       String    @id @default(cuid())
  organizationId           String
  enterpriseId             String
  establishmentId          String
  sourceSystemId           String
  invoiceId                String
  environment              String
  counter                  BigInt?
  irn                      String?
  signedQr                 String?
  signedInvoice            Json?
  ackDate                  DateTime?
  status                   String
  keyProvider              String?
  keyRef                   String?
  keyVersion               String?
  signatureAlgorithm       String?
  canonicalizationVersion  String?
  payloadHash              String?
  errorCode                String?
  errorDetail              Json?
  createdAt                DateTime  @default(now())
  submittedAt              DateTime?
  acceptedAt               DateTime?

  @@index([organizationId, sourceSystemId, status])
  @@index([organizationId, irn])
  @@map("eims_submission")
}

model EimsOfflinePendingSync {
  id               String    @id @default(cuid())
  offlineId        String
  organizationId   String
  sourceSystemId   String
  documentNumber   String
  counter          BigInt?
  previousIrn      String?
  capturedAt       DateTime  @default(now())
  reason           String    @default("network_unavailable")
  encryptedPayload Bytes
  payloadKeyVersion String   @default("cipher:v1")
  payloadSha256    String
  payloadBytes     Int
  syncStatus       String    @default("pending_offline")
  attempts         Int       @default(0)
  acceptedIrn      String?
  lastError        String?
  claimedAt        DateTime?
  syncedAt         DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@unique([organizationId, offlineId])
  @@index([organizationId, sourceSystemId, syncStatus])
  @@index([organizationId, syncStatus, capturedAt])
  @@map("eims_offline_pending_sync")
}

model EimsBulkCallbackReceipt {
  id                   String    @id @default(cuid())
  organizationId       String
  conversationId       String
  callbackId           String?
  idempotencyKey       String
  encryptedPayload     Bytes
  payloadKeyVersion    String    @default("cipher:v1")
  payloadSha256        String
  payloadBytes         Int
  signatureSha256      String?
  signatureStatus      String    @default("verified")
  reconciliationStatus String
  submitted            Int
  accepted             Int
  failed               Int
  pending              Int
  failures             Json?
  processedAt          DateTime
  duplicateCount       Int       @default(0)
  lastDuplicateAt      DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@unique([organizationId, idempotencyKey])
  @@index([organizationId, conversationId])
  @@index([organizationId, reconciliationStatus, processedAt])
  @@map("eims_bulk_callback_receipt")
}

model EimsReceipt {
  id               String    @id @default(cuid())
  organizationId   String
  enterpriseId     String
  establishmentId  String
  sourceSystemId   String
  receiptType      String
  receiptNumber    String
  manualReceiptNumber String?
  receiptCounter   BigInt?
  invoiceIrn       String?
  rrn              String?
  signedQr         String?
  signedReceipt    Json?
  status           String    @default("draft")
  totalAmount      Decimal   @db.Decimal(20, 2)
  paidAmount       Decimal?  @db.Decimal(20, 2)
  remainingAmount  Decimal?  @db.Decimal(20, 2)
  paymentMode      String?
  withholdingType  String?
  withholdingRate  Decimal?  @db.Decimal(10, 4)
  withholdingAmount Decimal? @db.Decimal(20, 2)
  createdAt        DateTime  @default(now())
  submittedAt      DateTime?
  acceptedAt       DateTime?

  @@index([organizationId, sourceSystemId, status])
  @@map("eims_receipt")
}

model EimsCancellation {
  id             String    @id @default(cuid())
  organizationId String
  sourceSystemId String
  invoiceIrn     String
  reasonCode     String
  remark         String?
  requestedBy    String?
  requestedAt    DateTime  @default(now())
  eimsResponse   Json?
  status         String    @default("pending")

  @@index([organizationId, sourceSystemId, status])
  @@map("eims_cancellation")
}

model EimsAuditEvent {
  id              String   @id @default(cuid())
  organizationId  String
  enterpriseId    String?
  establishmentId String?
  sourceSystemId  String?
  actorId         String?
  eventType       String
  payloadJson     Json
  prevHash        String?
  hash            String
  createdAt       DateTime @default(now())

  @@index([organizationId, createdAt])
  @@map("eims_audit_event")
}

model EimsNotificationLog {
  id             String    @id @default(cuid())
  organizationId String
  invoiceId      String?
  receiptId      String?
  cancellationId String?
  buyerEmail     String?
  buyerPhone     String?
  channel        String
  status         String
  providerResponse Json?
  sentAt         DateTime?
  retryCount     Int       @default(0)
  createdAt      DateTime  @default(now())

  @@index([organizationId, status])
  @@map("eims_notification_log")
}
`;

	text = `${text.trimEnd()}\n\n${block.trim()}\n`;
	await fs.writeFile(file, text, "utf8");
	return true;
};

const writeEimsSetupFoundation = async (root) => {
	const base = path.join(root, "apps/api/src/modules/eims/setup");
	await writeNew(
		path.join(base, "domain", "eims-setup.types.ts"),
		`export interface EimsEnterpriseRecord {
\tid: string;
\torganizationId: string;
\ttin: string;
\tlegalName: string;
\ttradeName: string | null;
\tvatNumber: string | null;
\tstatus: string;
}

export interface EimsEstablishmentRecord {
\tid: string;
\torganizationId: string;
\tenterpriseId: string;
\tname: string;
\tcode: string;
\tsubTin: string | null;
\tstatus: string;
}

export interface EimsSourceSystemRecord {
\tid: string;
\torganizationId: string;
\tenterpriseId: string;
\testablishmentId: string;
\tname: string;
\tsystemNumber: string | null;
\tsystemType: string;
\tapprovalStatus: string;
\tactive: boolean;
}

export interface CreateEimsEnterpriseInput {
\ttin: string;
\tlegalName: string;
\ttradeName?: string | null;
\tvatNumber?: string | null;
\temail?: string | null;
\tphone?: string | null;
}

export interface CreateEimsEstablishmentInput {
\tenterpriseId: string;
\tname: string;
\tcode: string;
\tsubTin?: string | null;
\tregion?: string | null;
\tcity?: string | null;
}

export interface CreateEimsSourceSystemInput {
\tenterpriseId: string;
\testablishmentId: string;
\tname: string;
\tsystemType: string;
\tsystemNumber?: string | null;
\tsoftwareVersion?: string | null;
\tinHouseDeveloped?: boolean;
}
`,
	);
	await writeNew(
		path.join(base, "domain", "eims-setup.repository.ts"),
		`import type {
\tCreateEimsEnterpriseInput,
\tCreateEimsEstablishmentInput,
\tCreateEimsSourceSystemInput,
\tEimsEnterpriseRecord,
\tEimsEstablishmentRecord,
\tEimsSourceSystemRecord,
} from "./eims-setup.types";

export abstract class EimsSetupRepository {
\tabstract createEnterprise(organizationId: string, input: CreateEimsEnterpriseInput): Promise<EimsEnterpriseRecord>;

\tabstract listEnterprises(organizationId: string): Promise<EimsEnterpriseRecord[]>;

\tabstract createEstablishment(
\t\torganizationId: string,
\t\tinput: CreateEimsEstablishmentInput,
\t): Promise<EimsEstablishmentRecord>;

\tabstract listEstablishments(organizationId: string, enterpriseId?: string): Promise<EimsEstablishmentRecord[]>;

\tabstract createSourceSystem(
\t\torganizationId: string,
\t\tinput: CreateEimsSourceSystemInput,
\t): Promise<EimsSourceSystemRecord>;

\tabstract listSourceSystems(organizationId: string, establishmentId?: string): Promise<EimsSourceSystemRecord[]>;
}
`,
	);
	await writeNew(
		path.join(base, "domain", "source-submission.guard.ts"),
		`export interface SourceSubmissionReadiness {
\tapprovalStatus: string;
\tactive: boolean;
\tsystemNumber?: string | null;
\tcredentialLastTestedAt?: Date | null;
\tcertificateValidTo?: Date | null;
\tcounterInitialized: boolean;
}

export function evaluateSourceSubmissionReadiness(source: SourceSubmissionReadiness, now = new Date()) {
\tconst reasons: string[] = [];

\tif (source.approvalStatus !== "approved") reasons.push("source_not_approved");
\tif (!source.active) reasons.push("source_inactive");
\tif (!source.systemNumber) reasons.push("missing_system_number");
\tif (!source.credentialLastTestedAt) reasons.push("credential_not_tested");
\tif (!source.certificateValidTo) reasons.push("certificate_missing");
\telse if (source.certificateValidTo <= now) reasons.push("certificate_expired");
\tif (!source.counterInitialized) reasons.push("counter_not_initialized");

\treturn { ready: reasons.length === 0, reasons };
}
`,
	);
	await writeNew(
		path.join(base, "domain", "source-submission.guard.spec.ts"),
		`import { evaluateSourceSubmissionReadiness } from "./source-submission.guard";

describe("evaluateSourceSubmissionReadiness", () => {
\tit("allows an approved and fully configured source", () => {
\t\tconst result = evaluateSourceSubmissionReadiness({
\t\t\tapprovalStatus: "approved",
\t\t\tactive: true,
\t\t\tsystemNumber: "SYS-1",
\t\t\tcredentialLastTestedAt: new Date("2026-05-26T08:00:00Z"),
\t\t\tcertificateValidTo: new Date("2027-05-26T08:00:00Z"),
\t\t\tcounterInitialized: true,
\t\t});

\t\texpect(result).toEqual({ ready: true, reasons: [] });
\t});

\tit("blocks pending, untested, or expired sources", () => {
\t\tconst result = evaluateSourceSubmissionReadiness(
\t\t\t{
\t\t\t\tapprovalStatus: "pending_mor_approval",
\t\t\t\tactive: false,
\t\t\t\tsystemNumber: null,
\t\t\t\tcredentialLastTestedAt: null,
\t\t\t\tcertificateValidTo: new Date("2026-01-01T00:00:00Z"),
\t\t\t\tcounterInitialized: false,
\t\t\t},
\t\t\tnew Date("2026-05-26T00:00:00Z"),
\t\t);

\t\texpect(result.ready).toBe(false);
\t\texpect(result.reasons).toEqual(
\t\t\texpect.arrayContaining([
\t\t\t\t"source_not_approved",
\t\t\t\t"source_inactive",
\t\t\t\t"missing_system_number",
\t\t\t\t"credential_not_tested",
\t\t\t\t"certificate_expired",
\t\t\t\t"counter_not_initialized",
\t\t\t]),
\t\t);
\t});
});
`,
	);
	await writeNew(
		path.join(base, "application", "dto", "eims-setup.dto.ts"),
		`import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateEimsEnterpriseDto {
\t@IsString()
\t@Matches(/^\\d{10}$/)
\ttin!: string;

\t@IsString()
\t@Length(2, 200)
\tlegalName!: string;

\t@IsOptional()
\t@IsString()
\ttradeName?: string;

\t@IsOptional()
\t@IsString()
\tvatNumber?: string;

\t@IsOptional()
\t@IsString()
\temail?: string;

\t@IsOptional()
\t@IsString()
\tphone?: string;
}

export class CreateEimsEstablishmentDto {
\t@IsString()
\tenterpriseId!: string;

\t@IsString()
\t@Length(2, 120)
\tname!: string;

\t@IsString()
\t@Length(2, 16)
\tcode!: string;

\t@IsOptional()
\t@IsString()
\tsubTin?: string;

\t@IsOptional()
\t@IsString()
\tregion?: string;

\t@IsOptional()
\t@IsString()
\tcity?: string;
}

export class CreateEimsSourceSystemDto {
\t@IsString()
\tenterpriseId!: string;

\t@IsString()
\testablishmentId!: string;

\t@IsString()
\t@Length(2, 120)
\tname!: string;

\t@IsIn(["POS", "ERP", "CRM", "SYS", "MAN", "EFD"])
\tsystemType!: string;

\t@IsOptional()
\t@IsString()
\tsystemNumber?: string;

\t@IsOptional()
\t@IsString()
\tsoftwareVersion?: string;

\t@IsOptional()
\t@IsBoolean()
\tinHouseDeveloped?: boolean;
}
`,
	);
	await writeNew(
		path.join(base, "application", "commands", "create-enterprise.handler.ts"),
		`import { Injectable } from "@nestjs/common";
import { EimsSetupRepository } from "../../domain/eims-setup.repository";
import type { CreateEimsEnterpriseDto } from "../dto/eims-setup.dto";

@Injectable()
export class CreateEimsEnterpriseHandler {
\tconstructor(private readonly repo: EimsSetupRepository) {}

\texecute(organizationId: string, dto: CreateEimsEnterpriseDto) {
\t\treturn this.repo.createEnterprise(organizationId, dto);
\t}
}
`,
	);
	await writeNew(
		path.join(
			base,
			"application",
			"commands",
			"create-establishment.handler.ts",
		),
		`import { Injectable } from "@nestjs/common";
import { EimsSetupRepository } from "../../domain/eims-setup.repository";
import type { CreateEimsEstablishmentDto } from "../dto/eims-setup.dto";

@Injectable()
export class CreateEimsEstablishmentHandler {
\tconstructor(private readonly repo: EimsSetupRepository) {}

\texecute(organizationId: string, dto: CreateEimsEstablishmentDto) {
\t\treturn this.repo.createEstablishment(organizationId, dto);
\t}
}
`,
	);
	await writeNew(
		path.join(
			base,
			"application",
			"commands",
			"create-source-system.handler.ts",
		),
		`import { Injectable } from "@nestjs/common";
import { EimsSetupRepository } from "../../domain/eims-setup.repository";
import type { CreateEimsSourceSystemDto } from "../dto/eims-setup.dto";

@Injectable()
export class CreateEimsSourceSystemHandler {
\tconstructor(private readonly repo: EimsSetupRepository) {}

\texecute(organizationId: string, dto: CreateEimsSourceSystemDto) {
\t\treturn this.repo.createSourceSystem(organizationId, dto);
\t}
}
`,
	);
	await writeNew(
		path.join(base, "application", "queries", "list-eims-setup.handler.ts"),
		`import { Injectable } from "@nestjs/common";
import { EimsSetupRepository } from "../../domain/eims-setup.repository";

@Injectable()
export class ListEimsSetupHandler {
\tconstructor(private readonly repo: EimsSetupRepository) {}

\tasync execute(organizationId: string) {
\t\tconst [enterprises, establishments, sourceSystems] = await Promise.all([
\t\t\tthis.repo.listEnterprises(organizationId),
\t\t\tthis.repo.listEstablishments(organizationId),
\t\t\tthis.repo.listSourceSystems(organizationId),
\t\t]);

\t\treturn {
\t\t\tstatus: sourceSystems.some((source) => source.approvalStatus === "approved") ? "ready" : "setup_required",
\t\t\tcounts: {
\t\t\t\tenterprises: enterprises.length,
\t\t\t\testablishments: establishments.length,
\t\t\t\tsourceSystems: sourceSystems.length,
\t\t\t},
\t\t\tenterprises,
\t\t\testablishments,
\t\t\tsourceSystems,
\t\t};
\t}
}
`,
	);
	await writeNew(
		path.join(
			base,
			"infrastructure",
			"repositories",
			"prisma-eims-setup.repository.ts",
		),
		`import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { EimsSetupRepository } from "../../domain/eims-setup.repository";
import type {
\tCreateEimsEnterpriseInput,
\tCreateEimsEstablishmentInput,
\tCreateEimsSourceSystemInput,
} from "../../domain/eims-setup.types";

@Injectable()
export class PrismaEimsSetupRepository extends EimsSetupRepository {
\tconstructor(private readonly prisma: PrismaService) {
\t\tsuper();
\t}

\tcreateEnterprise(organizationId: string, input: CreateEimsEnterpriseInput) {
\t\treturn this.prisma.eimsEnterprise.create({
\t\t\tdata: {
\t\t\t\torganizationId,
\t\t\t\ttin: input.tin,
\t\t\t\tlegalName: input.legalName,
\t\t\t\ttradeName: input.tradeName ?? null,
\t\t\t\tvatNumber: input.vatNumber ?? null,
\t\t\t\temail: input.email ?? null,
\t\t\t\tphone: input.phone ?? null,
\t\t\t\tstatus: "draft",
\t\t\t},
\t\t});
\t}

\tlistEnterprises(organizationId: string) {
\t\treturn this.prisma.eimsEnterprise.findMany({
\t\t\twhere: { organizationId },
\t\t\torderBy: { createdAt: "desc" },
\t\t});
\t}

\tcreateEstablishment(organizationId: string, input: CreateEimsEstablishmentInput) {
\t\treturn this.prisma.eimsEstablishment.create({
\t\t\tdata: {
\t\t\t\torganizationId,
\t\t\t\tenterpriseId: input.enterpriseId,
\t\t\t\tname: input.name,
\t\t\t\tcode: input.code,
\t\t\t\tsubTin: input.subTin ?? null,
\t\t\t\tregion: input.region ?? null,
\t\t\t\tcity: input.city ?? null,
\t\t\t\tstatus: "draft",
\t\t\t},
\t\t});
\t}

\tlistEstablishments(organizationId: string, enterpriseId?: string) {
\t\treturn this.prisma.eimsEstablishment.findMany({
\t\t\twhere: { organizationId, ...(enterpriseId ? { enterpriseId } : {}) },
\t\t\torderBy: { createdAt: "desc" },
\t\t});
\t}

\tasync createSourceSystem(organizationId: string, input: CreateEimsSourceSystemInput) {
\t\tconst source = await this.prisma.eimsSourceSystem.create({
\t\t\tdata: {
\t\t\t\torganizationId,
\t\t\t\tenterpriseId: input.enterpriseId,
\t\t\t\testablishmentId: input.establishmentId,
\t\t\t\tname: input.name,
\t\t\t\tsystemType: input.systemType,
\t\t\t\tsystemNumber: input.systemNumber ?? null,
\t\t\t\tsoftwareVersion: input.softwareVersion ?? null,
\t\t\t\tinHouseDeveloped: input.inHouseDeveloped ?? false,
\t\t\t\tapprovalStatus: "draft",
\t\t\t\tactive: false,
\t\t\t},
\t\t});
\t\tawait this.prisma.eimsSourceSystemCounter.create({
\t\t\tdata: {
\t\t\t\torganizationId,
\t\t\t\tsourceSystemId: source.id,
\t\t\t\tlastAcceptedCounter: BigInt(0),
\t\t\t\tstatus: "healthy",
\t\t\t},
\t\t});
\t\treturn source;
\t}

\tlistSourceSystems(organizationId: string, establishmentId?: string) {
\t\treturn this.prisma.eimsSourceSystem.findMany({
\t\t\twhere: { organizationId, ...(establishmentId ? { establishmentId } : {}) },
\t\t\torderBy: { createdAt: "desc" },
\t\t});
\t}
}
`,
	);
	await writeNew(
		path.join(base, "presentation", "eims-setup.controller.ts"),
		`import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { CreateEimsEnterpriseHandler } from "../application/commands/create-enterprise.handler";
import { CreateEimsEstablishmentHandler } from "../application/commands/create-establishment.handler";
import { CreateEimsSourceSystemHandler } from "../application/commands/create-source-system.handler";
import {
\tCreateEimsEnterpriseDto,
\tCreateEimsEstablishmentDto,
\tCreateEimsSourceSystemDto,
} from "../application/dto/eims-setup.dto";
import { ListEimsSetupHandler } from "../application/queries/list-eims-setup.handler";
import { EimsSetupRepository } from "../domain/eims-setup.repository";

interface AuthedRequest {
\torganizationId: string;
}

@Controller("eims/setup")
@UseGuards(AuthGuard, PermissionsGuard)
export class EimsSetupController {
\tconstructor(
\t\tprivate readonly listSetup: ListEimsSetupHandler,
\t\tprivate readonly createEnterpriseHandler: CreateEimsEnterpriseHandler,
\t\tprivate readonly createEstablishmentHandler: CreateEimsEstablishmentHandler,
\t\tprivate readonly createSourceSystemHandler: CreateEimsSourceSystemHandler,
\t\tprivate readonly repo: EimsSetupRepository,
\t) {}

\t@Get()
\t@RequirePermissions("eims-enterprise:read")
\tasync index(@Req() req: AuthedRequest) {
\t\treturn { data: await this.listSetup.execute(req.organizationId) };
\t}

\t@Get("enterprises")
\t@RequirePermissions("eims-enterprise:read")
\tasync enterprises(@Req() req: AuthedRequest) {
\t\treturn { data: await this.repo.listEnterprises(req.organizationId) };
\t}

\t@Post("enterprises")
\t@RequirePermissions("eims-enterprise:create")
\tasync createEnterprise(@Body() dto: CreateEimsEnterpriseDto, @Req() req: AuthedRequest) {
\t\treturn {
\t\t\tdata: await this.createEnterpriseHandler.execute(req.organizationId, dto),
\t\t};
\t}

\t@Get("establishments")
\t@RequirePermissions("eims-establishment:read")
\tasync establishments(@Query("enterpriseId") enterpriseId: string | undefined, @Req() req: AuthedRequest) {
\t\treturn {
\t\t\tdata: await this.repo.listEstablishments(req.organizationId, enterpriseId),
\t\t};
\t}

\t@Post("establishments")
\t@RequirePermissions("eims-establishment:create")
\tasync createEstablishment(@Body() dto: CreateEimsEstablishmentDto, @Req() req: AuthedRequest) {
\t\treturn {
\t\t\tdata: await this.createEstablishmentHandler.execute(req.organizationId, dto),
\t\t};
\t}

\t@Get("sources")
\t@RequirePermissions("eims-source:read")
\tasync sourceSystems(@Query("establishmentId") establishmentId: string | undefined, @Req() req: AuthedRequest) {
\t\treturn {
\t\t\tdata: await this.repo.listSourceSystems(req.organizationId, establishmentId),
\t\t};
\t}

\t@Post("sources")
\t@RequirePermissions("eims-source:create")
\tasync createSourceSystem(@Body() dto: CreateEimsSourceSystemDto, @Req() req: AuthedRequest) {
\t\treturn {
\t\t\tdata: await this.createSourceSystemHandler.execute(req.organizationId, dto),
\t\t};
\t}
}
`,
	);
	await writeNew(
		path.join(base, "eims-setup.module.ts"),
		`import { Module } from "@nestjs/common";
import { PrismaModule } from "#shared/database/prisma.module";
import { CreateEimsEnterpriseHandler } from "./application/commands/create-enterprise.handler";
import { CreateEimsEstablishmentHandler } from "./application/commands/create-establishment.handler";
import { CreateEimsSourceSystemHandler } from "./application/commands/create-source-system.handler";
import { ListEimsSetupHandler } from "./application/queries/list-eims-setup.handler";
import { EimsSetupRepository } from "./domain/eims-setup.repository";
import { PrismaEimsSetupRepository } from "./infrastructure/repositories/prisma-eims-setup.repository";
import { EimsSetupController } from "./presentation/eims-setup.controller";

@Module({
\timports: [PrismaModule],
\tcontrollers: [EimsSetupController],
\tproviders: [
\t\t{ provide: EimsSetupRepository, useClass: PrismaEimsSetupRepository },
\t\tCreateEimsEnterpriseHandler,
\t\tCreateEimsEstablishmentHandler,
\t\tCreateEimsSourceSystemHandler,
\t\tListEimsSetupHandler,
\t],
\texports: [EimsSetupRepository],
})
export class EimsSetupModule {}
`,
	);
};

const writeEimsApiSkeleton = async (root) => {
	await writeNew(
		path.join(root, "apps/api/src/modules/invoicing/invoicing.module.ts"),
		`import { Module } from "@nestjs/common";
import { PrismaModule } from "#shared/database/prisma.module";

@Module({
\timports: [PrismaModule],
})
export class InvoicingModule {}
`,
	);
	await writeNew(
		path.join(
			root,
			"apps/api/src/modules/invoicing/domain/canonical-invoice.ts",
		),
		`export type CanonicalTransactionType = "B2B" | "B2C" | "B2G" | "G2B" | "G2C";
export type CanonicalDocumentType = "INV" | "CRE" | "DEB" | "INT" | "RTN" | "FIN" | "MIX" | "INC" | "PRF" | "OVD";

export interface CanonicalParty {
\ttin?: string | null;
\tsubTin?: string | null;
\tlegalName: string;
\ttradeName?: string | null;
\tvatNumber?: string | null;
\temail?: string | null;
\tphone?: string | null;
}

export interface CanonicalInvoiceLine {
\tlineNumber: number;
\tnatureOfSupplies: "Goods" | "Service" | string;
\titemCode?: string | null;
\tproductDescription: string;
\tunitPrice: string;
\tquantity: string;
\tunit: string;
\tpreTaxValue: string;
\ttaxCode: string;
\ttaxAmount: string;
\ttotalLineAmount: string;
}

export interface CanonicalInvoice {
\tid: string;
\torganizationId: string;
\tenterpriseId: string;
\testablishmentId: string;
\tsourceSystemId: string;
\ttransactionType: CanonicalTransactionType;
\tdocumentType: CanonicalDocumentType;
\tdocumentNumber: string;
\tmanualInvoiceNumber?: string | null;
\tdocumentDate: string;
\tinvoiceCurrency: string;
\texchangeRate?: string | null;
\tpreviousIrn?: string | null;
\trelatedDocument?: string | null;
\tseller: CanonicalParty;
\tbuyer?: CanonicalParty | null;
\tlines: CanonicalInvoiceLine[];
\tpayment: {
\t\tpaymentTerm: string;
\t\tmode: string;
\t};
\tvalueDetails: {
\t\ttotalValue: string;
\t\ttaxValue: string;
\t\tdiscount?: string | null;
\t\texciseValue?: string | null;
\t\ttransactionWithholdValue?: string | null;
\t\tincomeWithholdValue?: string | null;
\t};
\tcashierName?: string | null;
\tsourceBusinessEvent?: string | null;
}
`,
	);
	await writeNew(
		path.join(
			root,
			"apps/api/src/modules/invoicing/domain/canonical-invoice.spec.ts",
		),
		`import type { CanonicalInvoice } from "./canonical-invoice";

describe("CanonicalInvoice contract", () => {
\tit("requires branch and source context", () => {
\t\tconst invoice = {
\t\t\torganizationId: "org_1",
\t\t\tenterpriseId: "ent_1",
\t\t\testablishmentId: "est_1",
\t\t\tsourceSystemId: "src_1",
\t\t} as CanonicalInvoice;

\t\texpect(invoice.enterpriseId).toBe("ent_1");
\t\texpect(invoice.establishmentId).toBe("est_1");
\t\texpect(invoice.sourceSystemId).toBe("src_1");
\t});
});
`,
	);
	await writeNew(
		path.join(root, "apps/api/src/modules/eims/eims.module.ts"),
		`import { Module } from "@nestjs/common";
import { EimsAdminModule } from "./admin/eims-admin.module";
import { EimsComplianceModule } from "./compliance/eims-compliance.module";
import { EimsReceiptsModule } from "./receipts/eims-receipts.module";
import { EimsSetupModule } from "./setup/eims-setup.module";
import { EimsSharedModule } from "./shared/eims-shared.module";
import { EimsSubmissionModule } from "./submission/eims-submission.module";

@Module({
\timports: [
\t\tEimsSharedModule,
\t\tEimsSetupModule,
\t\tEimsSubmissionModule,
\t\tEimsReceiptsModule,
\t\tEimsComplianceModule,
\t\tEimsAdminModule,
\t],
})
export class EimsModule {}
`,
	);
	await writeNew(
		path.join(root, "apps/api/src/modules/eims/shared/eims-shared.module.ts"),
		`import { Module } from "@nestjs/common";
import { EimsLookupController } from "./lookups/eims-lookup.controller";
import { EimsLookupService } from "./lookups/eims-lookup.service";
import { EimsMockService } from "./mock/eims-mock.service";

@Module({
\tcontrollers: [EimsLookupController],
\tproviders: [EimsLookupService, EimsMockService],
\texports: [EimsLookupService, EimsMockService],
})
export class EimsSharedModule {}
`,
	);
	await writeNew(
		path.join(
			root,
			"apps/api/src/modules/eims/shared/constants/eims-lookup-values.ts",
		),
		`export const DOCUMENT_TYPES = ["INV", "CRE", "DEB", "INT", "RTN", "FIN", "MIX", "INC", "PRF", "OVD"] as const;
export const TRANSACTION_TYPES = ["B2B", "B2C", "B2G", "G2B", "G2C"] as const;
export const SOURCE_SYSTEM_TYPES = ["POS", "ERP", "CRM", "SYS", "MAN", "EFD"] as const;
export const CANCELLATION_REASON_CODES = [
\t{ code: "1", label: "Duplicate", status: "confirmed" },
\t{ code: "2", label: "Data entry mistake", status: "confirmed" },
\t{ code: "3", label: "Order Cancelled", status: "confirmed" },
\t{ code: "4", label: "Others", status: "confirmed", requiresRemark: true },
\t{ code: "6", label: "Calculation Error", status: "mock_observed_unconfirmed" },
] as const;
export const TAX_CODE_PREFIXES = ["VAT", "TOT", "EXC"] as const;
export const PAYMENT_MODES = [
\t"CASH",
\t"CHEQUE",
\t"CPO",
\t"Local Bank Transfer",
\t"SWIFT",
\t"Wire Transfer",
\t"Letter of Credit",
\t"Card",
\t"Credit",
\t"Direct Transfer",
] as const;
export const UNITS_OF_MEASURE = [
\t"PCS",
\t"KG",
\t"G",
\t"L",
\t"ML",
\t"M",
\t"CM",
\t"M2",
\t"M3",
\t"BOX",
\t"CTN",
\t"DZ",
\t"PKT",
\t"ROLL",
\t"HR",
\t"DAY",
\t"MO",
\t"NT",
\t"PER",
\t"SVC",
] as const;
export const NATURE_OF_SUPPLY = ["Goods", "Service"] as const;
export const REGION_CODES = [
\t{ code: "1", label: "Tigray" },
\t{ code: "2", label: "Afar" },
\t{ code: "3", label: "Amhara" },
\t{ code: "4", label: "Oromia" },
\t{ code: "5", label: "Somali" },
\t{ code: "6", label: "Benishangul-Gumuz" },
\t{ code: "7", label: "SNNPR" },
\t{ code: "8", label: "Gambela" },
\t{ code: "9", label: "Harari" },
\t{ code: "11", label: "Sidama" },
\t{ code: "12", label: "South West Ethiopia Peoples" },
\t{ code: "14", label: "Addis Ababa" },
\t{ code: "15", label: "Dire Dawa" },
] as const;

export const isVatTaxCode = (code: string) => code.startsWith("VAT");
export const requiresBuyerTin = (transactionType: string) => !["B2C", "G2C"].includes(transactionType);
`,
	);
	await writeNew(
		path.join(
			root,
			"apps/api/src/modules/eims/shared/constants/eims-lookup-values.spec.ts",
		),
		`import { CANCELLATION_REASON_CODES, DOCUMENT_TYPES, isVatTaxCode, requiresBuyerTin } from "./eims-lookup-values";

describe("EIMS lookup values", () => {
\tit("keeps mock-observed cancellation code 6 unconfirmed", () => {
\t\texpect(CANCELLATION_REASON_CODES.find((r) => r.code === "6")?.status).toBe("mock_observed_unconfirmed");
\t});

\tit("includes the EIMS document types from the source docs", () => {
\t\texpect(DOCUMENT_TYPES).toEqual(expect.arrayContaining(["INV", "CRE", "DEB", "INT", "FIN"]));
\t});

\tit("detects VAT-prefixed tax codes", () => {
\t\texpect(isVatTaxCode("VAT15")).toBe(true);
\t\texpect(isVatTaxCode("TOT2")).toBe(false);
\t});

\tit("requires buyer TIN outside consumer transaction types", () => {
\t\texpect(requiresBuyerTin("B2B")).toBe(true);
\t\texpect(requiresBuyerTin("B2C")).toBe(false);
\t});
});
`,
	);
	await writeNew(
		path.join(
			root,
			"apps/api/src/modules/eims/shared/lookups/eims-lookup.service.ts",
		),
		`import { Injectable } from "@nestjs/common";
import {
\tCANCELLATION_REASON_CODES,
\tDOCUMENT_TYPES,
\tNATURE_OF_SUPPLY,
\tPAYMENT_MODES,
\tREGION_CODES,
\tSOURCE_SYSTEM_TYPES,
\tTAX_CODE_PREFIXES,
\tTRANSACTION_TYPES,
\tUNITS_OF_MEASURE,
} from "../constants/eims-lookup-values";

@Injectable()
export class EimsLookupService {
\tprivate readonly updatedAt = new Date().toISOString();
\tprivate readonly version = "phase0-seed-v1";

\tget(name: string) {
\t\tconst data = this.data()[name] ?? [];
\t\treturn { version: this.version, updatedAt: this.updatedAt, data };
\t}

\tprivate data(): Record<string, readonly unknown[]> {
\t\treturn {
\t\t\t"document-types": DOCUMENT_TYPES,
\t\t\t"transaction-types": TRANSACTION_TYPES,
\t\t\t"source-system-types": SOURCE_SYSTEM_TYPES,
\t\t\t"cancellation-reasons": CANCELLATION_REASON_CODES,
\t\t\t"tax-codes": TAX_CODE_PREFIXES,
\t\t\t"payment-modes": PAYMENT_MODES,
\t\t\tunits: UNITS_OF_MEASURE,
\t\t\t"nature-of-supply": NATURE_OF_SUPPLY,
\t\t\tregions: REGION_CODES,
\t\t};
\t}
}
`,
	);
	await writeNew(
		path.join(
			root,
			"apps/api/src/modules/eims/shared/lookups/eims-lookup.controller.ts",
		),
		`import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { EimsLookupService } from "./eims-lookup.service";

@Controller("eims/lookups")
@UseGuards(AuthGuard, PermissionsGuard)
export class EimsLookupController {
\tconstructor(private readonly lookups: EimsLookupService) {}

\t@Get(":name")
\t@RequirePermissions("eims-enterprise:read")
\tget(@Param("name") name: string) {
\t\treturn this.lookups.get(name);
\t}
}
`,
	);
	await writeNew(
		path.join(root, "apps/api/src/modules/eims/shared/mock/eims-mock.service.ts"),
		`import { Injectable } from "@nestjs/common";

export interface EimsMockSubmission {
\tid: string;
\tdocumentNumber: string;
\tdocumentType: string;
\ttransactionType: string;
\tstatus: "accepted" | "pending_offline" | "failed_retryable" | "unknown_submission";
\tirn: string | null;
\tsourceSystem: string;
\testablishment: string;
\ttotalValue: string;
\ttaxValue: string;
\tackDate: string | null;
\terrorCode?: string;
}

@Injectable()
export class EimsMockService {
\tprivate readonly now = new Date("2026-05-26T10:30:00.000+03:00").toISOString();

\ttenantOverview(organizationId: string) {
\t\tconst submissions = this.submissions(organizationId).data;
\t\treturn {
\t\t\tdata: {
\t\t\t\tmode: process.env.EIMS_MOCK_MODE === "false" ? "sandbox-ready" : "mock",
\t\t\t\tenvironment: process.env.EIMS_ENV ?? "sandbox",
\t\t\t\torganizationId,
\t\t\t\tsetupProgress: [
\t\t\t\t\t{ key: "twoFactor", label: "2FA enforced for EIMS users", status: "complete" },
\t\t\t\t\t{ key: "enterprise", label: "Enterprise profile", status: "complete" },
\t\t\t\t\t{ key: "establishment", label: "Primary establishment and sub-TIN", status: "complete" },
\t\t\t\t\t{ key: "source", label: "Source system approval", status: "attention" },
\t\t\t\t\t{ key: "certificate", label: "Sandbox certificate", status: "pending" },
\t\t\t\t\t{ key: "phase0", label: "Phase 0 Layer B sandbox verification", status: "blocked" },
\t\t\t\t],
\t\t\t\tstats: {
\t\t\t\t\tacceptedToday: submissions.filter((s) => s.status === "accepted").length,
\t\t\t\t\tpendingOffline: submissions.filter((s) => s.status === "pending_offline").length,
\t\t\t\t\tunknownSubmissions: submissions.filter((s) => s.status === "unknown_submission").length,
\t\t\t\t\tcertificatesExpiring: 1,
\t\t\t\t},
\t\t\t\thealth: [
\t\t\t\t\t{ label: "MoR sandbox", status: "mocked", detail: "Waiting for INSA sandbox credentials" },
\t\t\t\t\t{ label: "Vault signing", status: "local", detail: "Layer A uses local signing until Vault is configured" },
\t\t\t\t\t{ label: "Per-source queue", status: "ready", detail: "Mock flow serializes by source system" },
\t\t\t\t\t{ label: "Lookup registry", status: "ready", detail: "Seeded from V3 plan and configurable later" },
\t\t\t\t],
\t\t\t\tenterprises: [
\t\t\t\t\t{
\t\t\t\t\t\tid: "ent_mock_1",
\t\t\t\t\t\ttin: "0074136947",
\t\t\t\t\t\tlegalName: "Habesha Restaurant PLC",
\t\t\t\t\t\tvatNumber: "REGVAT123456789",
\t\t\t\t\t\tstatus: "active",
\t\t\t\t\t},
\t\t\t\t],
\t\t\t\testablishments: [
\t\t\t\t\t{
\t\t\t\t\t\tid: "est_mock_1",
\t\t\t\t\t\tname: "Bole Branch",
\t\t\t\t\t\tcode: "BOL",
\t\t\t\t\t\tsubTin: "0074136947-01",
\t\t\t\t\t\tstatus: "active",
\t\t\t\t\t\tcity: "Addis Ababa",
\t\t\t\t\t},
\t\t\t\t],
\t\t\t\tsourceSystems: [
\t\t\t\t\t{
\t\t\t\t\t\tid: "src_mock_1",
\t\t\t\t\t\tname: "Front POS",
\t\t\t\t\t\tsystemNumber: "329D03B6F0",
\t\t\t\t\t\tsystemType: "POS",
\t\t\t\t\t\tapprovalStatus: "approved",
\t\t\t\t\t\tlastAcceptedCounter: 128,
\t\t\t\t\t},
\t\t\t\t\t{
\t\t\t\t\t\tid: "src_mock_2",
\t\t\t\t\t\tname: "Bar POS",
\t\t\t\t\t\tsystemNumber: "PENDING",
\t\t\t\t\t\tsystemType: "POS",
\t\t\t\t\t\tapprovalStatus: "pending_mor_approval",
\t\t\t\t\t\tlastAcceptedCounter: 0,
\t\t\t\t\t},
\t\t\t\t],
\t\t\t\tblockers: [
\t\t\t\t\t"INSA sandbox credentials not yet received",
\t\t\t\t\t"Calculation Error cancellation reason code 6 still needs Phase 0 confirmation",
\t\t\t\t\t"Exact datetime format remains unlocked until sandbox acceptance",
\t\t\t\t],
\t\t\t\trecentSubmissions: submissions,
\t\t\t},
\t\t};
\t}

\tsubmissions(organizationId: string) {
\t\treturn {
\t\t\tdata: [
\t\t\t\t{
\t\t\t\t\tid: "sub_mock_1",
\t\t\t\t\tdocumentNumber: "INV-2026-000128",
\t\t\t\t\tdocumentType: "INV",
\t\t\t\t\ttransactionType: "B2C",
\t\t\t\t\tstatus: "accepted",
\t\t\t\t\tirn: "MOCK-IRN-51fa3144ae45d2a06873a1e81c59ab74",
\t\t\t\t\tsourceSystem: "Front POS",
\t\t\t\t\testablishment: "Bole Branch",
\t\t\t\t\ttotalValue: "517.50",
\t\t\t\t\ttaxValue: "67.50",
\t\t\t\t\tackDate: this.now,
\t\t\t\t},
\t\t\t\t{
\t\t\t\t\tid: "sub_mock_2",
\t\t\t\t\tdocumentNumber: "INV-2026-000129",
\t\t\t\t\tdocumentType: "INV",
\t\t\t\t\ttransactionType: "B2B",
\t\t\t\t\tstatus: "pending_offline",
\t\t\t\t\tirn: null,
\t\t\t\t\tsourceSystem: "Front POS",
\t\t\t\t\testablishment: "Bole Branch",
\t\t\t\t\ttotalValue: "3200.00",
\t\t\t\t\ttaxValue: "417.39",
\t\t\t\t\tackDate: null,
\t\t\t\t},
\t\t\t\t{
\t\t\t\t\tid: "sub_mock_3",
\t\t\t\t\tdocumentNumber: "INV-2026-000130",
\t\t\t\t\tdocumentType: "CRE",
\t\t\t\t\ttransactionType: "B2C",
\t\t\t\t\tstatus: "failed_retryable",
\t\t\t\t\tirn: null,
\t\t\t\t\tsourceSystem: "Front POS",
\t\t\t\t\testablishment: "Bole Branch",
\t\t\t\t\ttotalValue: "120.00",
\t\t\t\t\ttaxValue: "15.65",
\t\t\t\t\tackDate: null,
\t\t\t\t\terrorCode: "67005",
\t\t\t\t},
\t\t\t\t{
\t\t\t\t\tid: "sub_mock_4",
\t\t\t\t\tdocumentNumber: "INV-2026-000131",
\t\t\t\t\tdocumentType: "INV",
\t\t\t\t\ttransactionType: "B2C",
\t\t\t\t\tstatus: "unknown_submission",
\t\t\t\t\tirn: null,
\t\t\t\t\tsourceSystem: "Front POS",
\t\t\t\t\testablishment: "Bole Branch",
\t\t\t\t\ttotalValue: "780.00",
\t\t\t\t\ttaxValue: "101.74",
\t\t\t\t\tackDate: null,
\t\t\t\t\terrorCode: "timeout",
\t\t\t\t},
\t\t\t] satisfies EimsMockSubmission[],
\t\t\tmeta: { organizationId },
\t\t};
\t}

\tcreateMockSubmission(organizationId: string, documentNumber = "INV-MOCK-NEW") {
\t\tconst acceptedAt = new Date().toISOString();
\t\treturn {
\t\t\tdata: {
\t\t\t\tid: "sub_mock_new",
\t\t\t\tdocumentNumber,
\t\t\t\tdocumentType: "INV",
\t\t\t\ttransactionType: "B2C",
\t\t\t\tstatus: "accepted",
\t\t\t\tirn: \`MOCK-IRN-\${Date.now()}\`,
\t\t\t\tsourceSystem: "Front POS",
\t\t\t\testablishment: "Bole Branch",
\t\t\t\ttotalValue: "517.50",
\t\t\t\ttaxValue: "67.50",
\t\t\t\tackDate: acceptedAt,
\t\t\t\torganizationId,
\t\t\t},
\t\t};
\t}

\treceipts(organizationId: string) {
\t\treturn {
\t\t\tdata: [
\t\t\t\t{
\t\t\t\t\tid: "rec_mock_1",
\t\t\t\t\treceiptNumber: "RCPT-2026-00044",
\t\t\t\t\treceiptType: "sales",
\t\t\t\t\tstatus: "accepted",
\t\t\t\t\tinvoiceIrn: "MOCK-IRN-51fa3144ae45d2a06873a1e81c59ab74",
\t\t\t\t\trrn: "MOCK-RRN-00044",
\t\t\t\t\tpaymentMode: "CASH",
\t\t\t\t\tpaidAmount: "517.50",
\t\t\t\t},
\t\t\t\t{
\t\t\t\t\tid: "rec_mock_2",
\t\t\t\t\treceiptNumber: "WHT-2026-00002",
\t\t\t\t\treceiptType: "withholding",
\t\t\t\t\tstatus: "draft",
\t\t\t\t\tinvoiceIrn: "MOCK-IRN-B2B-0002",
\t\t\t\t\trrn: null,
\t\t\t\t\tpaymentMode: "Local Bank Transfer",
\t\t\t\t\tpaidAmount: "600.00",
\t\t\t\t},
\t\t\t],
\t\t\tmeta: { organizationId },
\t\t};
\t}

\tcomplianceEvidence(organizationId: string) {
\t\treturn {
\t\t\tdata: {
\t\t\t\torganizationId,
\t\t\t\tgeneratedAt: this.now,
\t\t\t\treadiness: 72,
\t\t\t\titems: [
\t\t\t\t\t{ key: "phase0-layer-a", label: "Phase 0 Layer A local report", status: "ready" },
\t\t\t\t\t{ key: "rls", label: "Targeted EIMS RLS policy export", status: "planned" },
\t\t\t\t\t{ key: "print", label: "Thermal and A4 print evidence", status: "mocked" },
\t\t\t\t\t{ key: "audit", label: "Tamper-evident audit hash-chain sample", status: "planned" },
\t\t\t\t\t{ key: "dr", label: "Quarterly DR drill report", status: "planned" },
\t\t\t\t],
\t\t\t},
\t\t};
\t}

\tadminOverview() {
\t\tconst tenants = this.adminTenants().data;
\t\treturn {
\t\t\tdata: {
\t\t\t\tmode: process.env.EIMS_MOCK_MODE === "false" ? "sandbox-ready" : "mock",
\t\t\t\ttenantsTotal: tenants.length,
\t\t\t\ttenantsBlocked: tenants.filter((tenant) => tenant.status !== "ready").length,
\t\t\t\tacceptedToday: 184,
\t\t\t\tpendingOffline: 7,
\t\t\t\tunknownSubmissions: 1,
\t\t\t\tcertificateAlerts: 2,
\t\t\t\tlatestFailures: this.adminFailures().data,
\t\t\t\ttenants,
\t\t\t},
\t\t};
\t}

\tadminTenants() {
\t\treturn {
\t\t\tdata: [
\t\t\t\t{
\t\t\t\t\tid: "org_mock_1",
\t\t\t\t\tname: "Habesha Restaurants",
\t\t\t\t\tstatus: "ready",
\t\t\t\t\tbranches: 2,
\t\t\t\t\tsources: 3,
\t\t\t\t\tacceptedToday: 96,
\t\t\t\t\tpendingOffline: 2,
\t\t\t\t},
\t\t\t\t{
\t\t\t\t\tid: "org_mock_2",
\t\t\t\t\tname: "Shoa Supermarket",
\t\t\t\t\tstatus: "blocked_sandbox",
\t\t\t\t\tbranches: 8,
\t\t\t\t\tsources: 32,
\t\t\t\t\tacceptedToday: 88,
\t\t\t\t\tpendingOffline: 5,
\t\t\t\t},
\t\t\t],
\t\t};
\t}

\tadminFailures() {
\t\treturn {
\t\t\tdata: [
\t\t\t\t{
\t\t\t\t\tid: "fail_mock_1",
\t\t\t\t\ttenant: "Shoa Supermarket",
\t\t\t\t\tsourceSystem: "Megenagna POS 04",
\t\t\t\t\terrorCode: "7015",
\t\t\t\t\tcategory: "rule_error",
\t\t\t\t\trecommendedAction: "Verify counter sequence and PreviousIrn chain",
\t\t\t\t},
\t\t\t\t{
\t\t\t\t\tid: "fail_mock_2",
\t\t\t\t\ttenant: "Habesha Restaurants",
\t\t\t\t\tsourceSystem: "Bar POS",
\t\t\t\t\terrorCode: "67005",
\t\t\t\t\tcategory: "retryable",
\t\t\t\t\trecommendedAction: "Retry after OCSP service recovery",
\t\t\t\t},
\t\t\t],
\t\t};
\t}

\tadminCertificates() {
\t\treturn {
\t\t\tdata: [
\t\t\t\t{ tenant: "Habesha Restaurants", sourceSystem: "Front POS", validTo: "2026-07-10", status: "expires_soon" },
\t\t\t\t{ tenant: "Shoa Supermarket", sourceSystem: "Piazza POS 01", validTo: "2027-02-01", status: "valid" },
\t\t\t],
\t\t};
\t}

\tadminResources() {
\t\treturn {
\t\t\tdata: {
\t\t\t\tqueues: [
\t\t\t\t\t{ name: "eims:submission:src_mock_1", depth: 0, status: "running" },
\t\t\t\t\t{ name: "eims:submission:src_mock_2", depth: 4, status: "paused_pending_approval" },
\t\t\t\t],
\t\t\t\tvault: { status: "mocked", provider: "local" },
\t\t\t\tmor: { sandbox: "mocked", production: "not_configured" },
\t\t\t},
\t\t};
\t}

\tadminCompliance() {
\t\treturn {
\t\t\tdata: {
\t\t\t\treadiness: 68,
\t\t\t\tmissing: ["Phase 0 Layer B sandbox report", "Bank guarantee scanned copy", "Data residency legal opinion"],
\t\t\t\tready: ["V3 architecture plan", "Layer A local test assets", "Tenant onboarding runbook"],
\t\t\t},
\t\t};
\t}
}
`,
	);
	await writeNew(
		path.join(root, "apps/api/src/modules/eims/submission/eims-submission.module.ts"),
		`import { Module } from "@nestjs/common";
import { EimsSharedModule } from "../shared/eims-shared.module";
import { EimsSubmissionController } from "./presentation/eims-submission.controller";

@Module({
\timports: [EimsSharedModule],
\tcontrollers: [EimsSubmissionController],
})
export class EimsSubmissionModule {}
`,
	);
	await writeNew(
		path.join(
			root,
			"apps/api/src/modules/eims/submission/presentation/eims-submission.controller.ts",
		),
		`import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { EimsMockService } from "../../shared/mock/eims-mock.service";

interface AuthedRequest {
\torganizationId: string;
}

@Controller("eims")
@UseGuards(AuthGuard, PermissionsGuard)
export class EimsSubmissionController {
\tconstructor(private readonly mock: EimsMockService) {}

\t@Get("overview")
\t@RequirePermissions("eims-submission:read")
\toverview(@Req() req: AuthedRequest) {
\t\treturn this.mock.tenantOverview(req.organizationId);
\t}

\t@Get("submissions")
\t@RequirePermissions("eims-submission:read")
\tsubmissions(@Req() req: AuthedRequest) {
\t\treturn this.mock.submissions(req.organizationId);
\t}

\t@Post("submissions/mock-submit")
\t@RequirePermissions("eims-submission:create")
\tcreateMockSubmission(@Req() req: AuthedRequest, @Body() body: { documentNumber?: string }) {
\t\treturn this.mock.createMockSubmission(req.organizationId, body.documentNumber);
\t}
}
`,
	);
	await writeNew(
		path.join(root, "apps/api/src/modules/eims/receipts/eims-receipts.module.ts"),
		`import { Module } from "@nestjs/common";
import { EimsSharedModule } from "../shared/eims-shared.module";
import { EimsReceiptsController } from "./presentation/eims-receipts.controller";

@Module({
\timports: [EimsSharedModule],
\tcontrollers: [EimsReceiptsController],
})
export class EimsReceiptsModule {}
`,
	);
	await writeNew(
		path.join(root, "apps/api/src/modules/eims/receipts/presentation/eims-receipts.controller.ts"),
		`import { Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { EimsMockService } from "../../shared/mock/eims-mock.service";

interface AuthedRequest {
\torganizationId: string;
}

@Controller("eims/receipts")
@UseGuards(AuthGuard, PermissionsGuard)
export class EimsReceiptsController {
\tconstructor(private readonly mock: EimsMockService) {}

\t@Get()
\t@RequirePermissions("receipt:read")
\tlist(@Req() req: AuthedRequest) {
\t\treturn this.mock.receipts(req.organizationId);
\t}

\t@Post("mock-submit")
\t@RequirePermissions("receipt:submit")
\tcreateMockReceipt(@Req() req: AuthedRequest) {
\t\treturn this.mock.receipts(req.organizationId);
\t}
}
`,
	);
	await writeNew(
		path.join(root, "apps/api/src/modules/eims/compliance/eims-compliance.module.ts"),
		`import { Module } from "@nestjs/common";
import { EimsSharedModule } from "../shared/eims-shared.module";
import { EimsComplianceController } from "./presentation/eims-compliance.controller";

@Module({
\timports: [EimsSharedModule],
\tcontrollers: [EimsComplianceController],
})
export class EimsComplianceModule {}
`,
	);
	await writeNew(
		path.join(root, "apps/api/src/modules/eims/compliance/presentation/eims-compliance.controller.ts"),
		`import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { EimsMockService } from "../../shared/mock/eims-mock.service";

interface AuthedRequest {
\torganizationId: string;
}

@Controller("eims/compliance")
@UseGuards(AuthGuard, PermissionsGuard)
export class EimsComplianceController {
\tconstructor(private readonly mock: EimsMockService) {}

\t@Get("evidence")
\t@RequirePermissions("eims-compliance:read")
\tevidence(@Req() req: AuthedRequest) {
\t\treturn this.mock.complianceEvidence(req.organizationId);
\t}
}
`,
	);
	await writeNew(
		path.join(root, "apps/api/src/modules/eims/admin/eims-admin.module.ts"),
		`import { Module } from "@nestjs/common";
import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";
import { EimsSharedModule } from "../shared/eims-shared.module";
import { EimsAdminController } from "./presentation/eims-admin.controller";

@Module({
\timports: [EimsSharedModule],
\tcontrollers: [EimsAdminController],
\tproviders: [SuperAdminGuard],
})
export class EimsAdminModule {}
`,
	);
	await writeNew(
		path.join(root, "apps/api/src/modules/eims/admin/presentation/eims-admin.controller.ts"),
		`import { Controller, Get, UseGuards } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { SuperAdminGuard } from "#modules/admin/guards/super-admin.guard";
import { EimsMockService } from "../../shared/mock/eims-mock.service";

@Controller("admin/eims")
@AllowAnonymous()
@UseGuards(SuperAdminGuard)
export class EimsAdminController {
\tconstructor(private readonly mock: EimsMockService) {}

\t@Get("overview")
\toverview() {
\t\treturn this.mock.adminOverview();
\t}

\t@Get("tenants")
\ttenants() {
\t\treturn this.mock.adminTenants();
\t}

\t@Get("failures")
\tfailures() {
\t\treturn this.mock.adminFailures();
\t}

\t@Get("certificates")
\tcertificates() {
\t\treturn this.mock.adminCertificates();
\t}

\t@Get("resources")
\tresources() {
\t\treturn this.mock.adminResources();
\t}

\t@Get("compliance")
\tcompliance() {
\t\treturn this.mock.adminCompliance();
\t}
}
`,
	);
};

const writeEimsWebSkeleton = async (root) => {
	await writeNew(
		path.join(root, "apps/web/src/features/invoicing/index.ts"),
		`export const invoicingFeatureStatus = "scaffolded";
`,
	);
	await writeNew(
		path.join(root, "apps/web/src/features/eims/api/eims.hooks.ts"),
		`import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface EimsLookupResponse<T = unknown> {
\tversion: string;
\tupdatedAt: string;
\tdata: T[];
}

export interface SetupProgressItem {
\tkey: string;
\tlabel: string;
\tstatus: "complete" | "attention" | "pending" | "blocked" | string;
}

export interface EimsSubmission {
\tid: string;
\tdocumentNumber: string;
\tdocumentType: string;
\ttransactionType: string;
\tstatus: "accepted" | "pending_offline" | "failed_retryable" | "unknown_submission" | string;
\tirn: string | null;
\tsourceSystem: string;
\testablishment: string;
\ttotalValue: string;
\ttaxValue: string;
\tackDate: string | null;
\terrorCode?: string;
}

export interface EimsOverview {
\tmode: string;
\tenvironment: string;
\torganizationId: string;
\tsetupProgress: SetupProgressItem[];
\tstats: {
\t\tacceptedToday: number;
\t\tpendingOffline: number;
\t\tunknownSubmissions: number;
\t\tcertificatesExpiring: number;
\t};
\thealth: Array<{ label: string; status: string; detail: string }>;
\tenterprises: Array<{ id: string; tin: string; legalName: string; vatNumber: string; status: string }>;
\testablishments: Array<{ id: string; name: string; code: string; subTin: string; status: string; city: string }>;
\tsourceSystems: Array<{
\t\tid: string;
\t\tname: string;
\t\tsystemNumber: string;
\t\tsystemType: string;
\t\tapprovalStatus: string;
\t\tlastAcceptedCounter: number;
\t}>;
\tblockers: string[];
\trecentSubmissions: EimsSubmission[];
}

export interface EimsReceipt {
\tid: string;
\treceiptNumber: string;
\treceiptType: string;
\tstatus: string;
\tinvoiceIrn: string;
\trrn: string | null;
\tpaymentMode: string;
\tpaidAmount: string;
}

export interface EimsComplianceEvidence {
\torganizationId: string;
\tgeneratedAt: string;
\treadiness: number;
\titems: Array<{ key: string; label: string; status: string }>;
}

export interface AdminEimsOverview {
\tmode: string;
\ttenantsTotal: number;
\ttenantsBlocked: number;
\tacceptedToday: number;
\tpendingOffline: number;
\tunknownSubmissions: number;
\tcertificateAlerts: number;
\tlatestFailures: AdminEimsFailure[];
\ttenants: AdminEimsTenant[];
}

export interface AdminEimsTenant {
\tid: string;
\tname: string;
\tstatus: string;
\tbranches: number;
\tsources: number;
\tacceptedToday: number;
\tpendingOffline: number;
}

export interface AdminEimsFailure {
\tid: string;
\ttenant: string;
\tsourceSystem: string;
\terrorCode: string;
\tcategory: string;
\trecommendedAction: string;
}

export interface AdminEimsCertificate {
\ttenant: string;
\tsourceSystem: string;
\tvalidTo: string;
\tstatus: string;
}

export interface AdminEimsResources {
\tqueues: Array<{ name: string; depth: number; status: string }>;
\tvault: { status: string; provider: string };
\tmor: { sandbox: string; production: string };
}

export interface AdminEimsCompliance {
\treadiness: number;
\tmissing: string[];
\tready: string[];
}

export const useEimsLookup = <T = unknown>(name: string) =>
\tuseQuery({
\t\tqueryKey: ["eims", "lookup", name],
\t\tqueryFn: () => api.get<EimsLookupResponse<T>>(\`/eims/lookups/\${name}\`),
\t});

export const useEimsOverview = () =>
\tuseQuery({
\t\tqueryKey: ["eims", "overview"],
\t\tqueryFn: () => api.get<{ data: EimsOverview }>("/eims/overview"),
\t});

export const useEimsSubmissions = () =>
\tuseQuery({
\t\tqueryKey: ["eims", "submissions"],
\t\tqueryFn: () => api.get<{ data: EimsSubmission[] }>("/eims/submissions"),
\t});

export const useCreateMockEimsSubmission = () => {
\tconst queryClient = useQueryClient();
\treturn useMutation({
\t\tmutationFn: (documentNumber: string) =>
\t\t\tapi.post<{ data: EimsSubmission }>("/eims/submissions/mock-submit", { documentNumber }),
\t\tonSuccess: () => {
\t\t\tvoid queryClient.invalidateQueries({ queryKey: ["eims"] });
\t\t},
\t});
};

export const useEimsReceipts = () =>
\tuseQuery({
\t\tqueryKey: ["eims", "receipts"],
\t\tqueryFn: () => api.get<{ data: EimsReceipt[] }>("/eims/receipts"),
\t});

export const useEimsComplianceEvidence = () =>
\tuseQuery({
\t\tqueryKey: ["eims", "compliance", "evidence"],
\t\tqueryFn: () => api.get<{ data: EimsComplianceEvidence }>("/eims/compliance/evidence"),
\t});

export const useAdminEimsOverview = () =>
\tuseQuery({
\t\tqueryKey: ["admin", "eims", "overview"],
\t\tqueryFn: () => api.get<{ data: AdminEimsOverview }>("/admin/eims/overview"),
\t});

export const useAdminEimsTenants = () =>
\tuseQuery({
\t\tqueryKey: ["admin", "eims", "tenants"],
\t\tqueryFn: () => api.get<{ data: AdminEimsTenant[] }>("/admin/eims/tenants"),
\t});

export const useAdminEimsFailures = () =>
\tuseQuery({
\t\tqueryKey: ["admin", "eims", "failures"],
\t\tqueryFn: () => api.get<{ data: AdminEimsFailure[] }>("/admin/eims/failures"),
\t});

export const useAdminEimsCertificates = () =>
\tuseQuery({
\t\tqueryKey: ["admin", "eims", "certificates"],
\t\tqueryFn: () => api.get<{ data: AdminEimsCertificate[] }>("/admin/eims/certificates"),
\t});

export const useAdminEimsResources = () =>
\tuseQuery({
\t\tqueryKey: ["admin", "eims", "resources"],
\t\tqueryFn: () => api.get<{ data: AdminEimsResources }>("/admin/eims/resources"),
\t});

export const useAdminEimsCompliance = () =>
\tuseQuery({
\t\tqueryKey: ["admin", "eims", "compliance"],
\t\tqueryFn: () => api.get<{ data: AdminEimsCompliance }>("/admin/eims/compliance"),
\t});
`,
	);
	await writeNew(
		path.join(root, "apps/web/src/features/eims/components/eims-tenant-pages.reference.txt"),
		`import React from "react";
import {
\tuseCreateMockEimsSubmission,
\tuseEimsComplianceEvidence,
\tuseEimsOverview,
\tuseEimsReceipts,
\tuseEimsSubmissions,
\ttype EimsOverview,
} from "#features/eims/api/eims.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";
type DirectoryKind = "enterprises" | "establishments" | "sources";

const statusVariant = (status: string): BadgeVariant => {
\tif (["accepted", "active", "approved", "complete", "ready"].includes(status)) return "default";
\tif (["failed_retryable", "blocked", "blocked_sandbox", "unknown_submission"].includes(status)) return "destructive";
\tif (["pending", "pending_offline", "attention", "mocked", "sandbox-ready"].includes(status)) return "secondary";
\treturn "outline";
};

function StatusBadge({ status }: { readonly status: string }) {
\treturn <Badge variant={statusVariant(status)}>{status.replace(/_/g, " ")}</Badge>;
}

function LoadingPanel() {
\treturn (
\t\t<div className="space-y-4">
\t\t\t<Skeleton className="h-9 w-72" />
\t\t\t<Skeleton className="h-32 w-full" />
\t\t\t<Skeleton className="h-48 w-full" />
\t\t</div>
\t);
}

function PageHeader({
\ttitle,
\tdescription,
\tmode,
}: {
\treadonly title: string;
\treadonly description: string;
\treadonly mode?: string;
}) {
\treturn (
\t\t<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
\t\t\t<div>
\t\t\t\t<h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
\t\t\t\t<p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
\t\t\t</div>
\t\t\t{mode ? <StatusBadge status={mode === "mock" ? "Mock Mode" : mode} /> : null}
\t\t</div>
\t);
}

function StatCards({ overview }: { readonly overview: EimsOverview }) {
\tconst stats = [
\t\t["Accepted Today", overview.stats.acceptedToday],
\t\t["Pending Offline", overview.stats.pendingOffline],
\t\t["Unknown", overview.stats.unknownSubmissions],
\t\t["Cert Alerts", overview.stats.certificatesExpiring],
\t] as const;
\treturn (
\t\t<div className="grid gap-3 md:grid-cols-4">
\t\t\t{stats.map(([label, value]) => (
\t\t\t\t<Card key={label}>
\t\t\t\t\t<CardContent className="p-4">
\t\t\t\t\t\t<p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
\t\t\t\t\t\t<p className="mt-2 text-2xl font-semibold">{value}</p>
\t\t\t\t\t</CardContent>
\t\t\t\t</Card>
\t\t\t))}
\t\t</div>
\t);
}

function SetupProgress({ overview }: { readonly overview: EimsOverview }) {
\treturn (
\t\t<Card>
\t\t\t<CardHeader>
\t\t\t\t<CardTitle className="text-base">EIMS setup path</CardTitle>
\t\t\t</CardHeader>
\t\t\t<CardContent>
\t\t\t\t<div className="grid gap-2 md:grid-cols-2">
\t\t\t\t\t{overview.setupProgress.map((step) => (
\t\t\t\t\t\t<div key={step.key} className="flex items-center justify-between gap-3 rounded-md border p-3">
\t\t\t\t\t\t\t<span className="text-sm font-medium">{step.label}</span>
\t\t\t\t\t\t\t<StatusBadge status={step.status} />
\t\t\t\t\t\t</div>
\t\t\t\t\t))}
\t\t\t\t</div>
\t\t\t</CardContent>
\t\t</Card>
\t);
}

function SubmissionTable({ rows }: { readonly rows: EimsOverview["recentSubmissions"] }) {
\treturn (
\t\t<Table>
\t\t\t<TableHeader>
\t\t\t\t<TableRow>
\t\t\t\t\t<TableHead>Document</TableHead>
\t\t\t\t\t<TableHead>Type</TableHead>
\t\t\t\t\t<TableHead>Status</TableHead>
\t\t\t\t\t<TableHead>Source</TableHead>
\t\t\t\t\t<TableHead>Total</TableHead>
\t\t\t\t\t<TableHead>IRN</TableHead>
\t\t\t\t</TableRow>
\t\t\t</TableHeader>
\t\t\t<TableBody>
\t\t\t\t{rows.map((row) => (
\t\t\t\t\t<TableRow key={row.id}>
\t\t\t\t\t\t<TableCell className="font-medium">{row.documentNumber}</TableCell>
\t\t\t\t\t\t<TableCell>{row.documentType} / {row.transactionType}</TableCell>
\t\t\t\t\t\t<TableCell><StatusBadge status={row.status} /></TableCell>
\t\t\t\t\t\t<TableCell>{row.sourceSystem}</TableCell>
\t\t\t\t\t\t<TableCell>{row.totalValue} ETB</TableCell>
\t\t\t\t\t\t<TableCell className="max-w-[260px] truncate">{row.irn ?? "Pending EIMS acceptance"}</TableCell>
\t\t\t\t\t</TableRow>
\t\t\t\t))}
\t\t\t</TableBody>
\t\t</Table>
\t);
}

export function EimsOverviewPage() {
\tconst { data, isLoading } = useEimsOverview();
\tif (isLoading || !data) return <LoadingPanel />;
\tconst overview = data.data;
\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader
\t\t\t\ttitle="Ethiopia tax workspace"
\t\t\t\tdescription="Daily operator console for MoR source approval, INSA certificate readiness, EIMS submissions, receipts, and audit evidence."
\t\t\t\tmode={overview.mode}
\t\t\t/>
\t\t\t<StatCards overview={overview} />
\t\t\t<div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
\t\t\t\t<SetupProgress overview={overview} />
\t\t\t\t<Card>
\t\t\t\t\t<CardHeader>
\t\t\t\t\t\t<CardTitle className="text-base">Health</CardTitle>
\t\t\t\t\t</CardHeader>
\t\t\t\t\t<CardContent className="space-y-3">
\t\t\t\t\t\t{overview.health.map((item) => (
\t\t\t\t\t\t\t<div key={item.label} className="space-y-1 rounded-md border p-3">
\t\t\t\t\t\t\t\t<div className="flex items-center justify-between gap-3">
\t\t\t\t\t\t\t\t\t<span className="text-sm font-medium">{item.label}</span>
\t\t\t\t\t\t\t\t\t<StatusBadge status={item.status} />
\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t<p className="text-xs text-muted-foreground">{item.detail}</p>
\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t))}
\t\t\t\t\t</CardContent>
\t\t\t\t</Card>
\t\t\t</div>
\t\t\t<Card>
\t\t\t\t<CardHeader>
\t\t\t\t\t<CardTitle className="text-base">Recent Submissions</CardTitle>
\t\t\t\t</CardHeader>
\t\t\t\t<CardContent>
\t\t\t\t\t<SubmissionTable rows={overview.recentSubmissions} />
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}

export function EimsSetupPage() {
\tconst { data, isLoading } = useEimsOverview();
\tif (isLoading || !data) return <LoadingPanel />;
\tconst overview = data.data;
\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader title="EIMS Setup" description="Track onboarding gates before production invoice submission is enabled." mode={overview.mode} />
\t\t\t<SetupProgress overview={overview} />
\t\t\t<Card>
\t\t\t\t<CardHeader>
\t\t\t\t\t<CardTitle className="text-base">Current Blockers</CardTitle>
\t\t\t\t</CardHeader>
\t\t\t\t<CardContent className="space-y-2">
\t\t\t\t\t{overview.blockers.map((blocker) => (
\t\t\t\t\t\t<div key={blocker} className="rounded-md border border-border p-3 text-sm">{blocker}</div>
\t\t\t\t\t))}
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}

export function EimsDirectoryPage({ kind }: { readonly kind: DirectoryKind }) {
\tconst { data, isLoading } = useEimsOverview();
\tif (isLoading || !data) return <LoadingPanel />;
\tconst overview = data.data;
\tif (kind === "enterprises") {
\t\treturn (
\t\t\t<div className="space-y-5">
\t\t\t\t<PageHeader title="EIMS Enterprises" description="Legal taxpayer identities linked to this SaaS tenant." />
\t\t\t\t<Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Legal Name</TableHead><TableHead>TIN</TableHead><TableHead>VAT</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{overview.enterprises.map((row) => <TableRow key={row.id}><TableCell>{row.legalName}</TableCell><TableCell>{row.tin}</TableCell><TableCell>{row.vatNumber}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
\t\t\t</div>
\t\t);
\t}
\tif (kind === "establishments") {
\t\treturn (
\t\t\t<div className="space-y-5">
\t\t\t\t<PageHeader title="EIMS Establishments" description="Registered branch and sub-TIN context for invoice source resolution." />
\t\t\t\t<Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Sub-TIN</TableHead><TableHead>City</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{overview.establishments.map((row) => <TableRow key={row.id}><TableCell>{row.name}</TableCell><TableCell>{row.code}</TableCell><TableCell>{row.subTin}</TableCell><TableCell>{row.city}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
\t\t\t</div>
\t\t);
\t}
\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader title="EIMS Source Systems" description="POS, ERP, and source systems that own counters, certificates, credentials, and PreviousIrn chains." />
\t\t\t<Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>System Number</TableHead><TableHead>Type</TableHead><TableHead>Approval</TableHead><TableHead>Counter</TableHead></TableRow></TableHeader><TableBody>{overview.sourceSystems.map((row) => <TableRow key={row.id}><TableCell>{row.name}</TableCell><TableCell>{row.systemNumber}</TableCell><TableCell>{row.systemType}</TableCell><TableCell><StatusBadge status={row.approvalStatus} /></TableCell><TableCell>{row.lastAcceptedCounter}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
\t\t</div>
\t);
}

export function EimsCredentialsPage() {
\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader title="EIMS Credentials" description="Credential storage is backend-only and envelope-encrypted; this mock surface verifies lifecycle visibility." />
\t\t\t<Card><CardContent className="grid gap-3 p-4 md:grid-cols-3"><div><p className="text-xs uppercase text-muted-foreground">Lifecycle</p><p className="mt-1 font-medium">initial_setup -> tested -> active -> rotated</p></div><div><p className="text-xs uppercase text-muted-foreground">Secrets</p><p className="mt-1 font-medium">API key, password, refresh token encrypted</p></div><div><p className="text-xs uppercase text-muted-foreground">Token cache</p><p className="mt-1 font-medium">Access token stays in Redis TTL</p></div></CardContent></Card>
\t\t</div>
\t);
}

export function EimsCertificatesPage() {
\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader title="EIMS Certificates" description="Certificate metadata, CSR flow, expiry windows, and signing key version tracking." />
\t\t\t<Card><CardContent className="grid gap-3 p-4 md:grid-cols-4"><div><p className="text-xs uppercase text-muted-foreground">Provider</p><p className="mt-1 font-medium">Vault Transit</p></div><div><p className="text-xs uppercase text-muted-foreground">Expiry alert</p><p className="mt-1 font-medium">90 / 60 / 30 / 7 days</p></div><div><p className="text-xs uppercase text-muted-foreground">Historical verify</p><p className="mt-1 font-medium">Key version retained</p></div><div><p className="text-xs uppercase text-muted-foreground">Sandbox</p><p className="mt-1 font-medium">Waiting for INSA</p></div></CardContent></Card>
\t\t</div>
\t);
}

export function EimsSubmissionsPage() {
\tconst { data, isLoading } = useEimsSubmissions();
\tconst mutation = useCreateMockEimsSubmission();
\tconst [lastIrn, setLastIrn] = React.useState<string | null>(null);
\tconst createMock = React.useCallback(async () => {
\t\tconst result = await mutation.mutateAsync("INV-MOCK-" + Date.now());
\t\tsetLastIrn(result.data.irn);
\t}, [mutation]);
\tif (isLoading || !data) return <LoadingPanel />;
\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader title="EIMS Submissions" description="Mocked accepted, offline, retryable, and unknown states for source-counter flow testing." />
\t\t\t<div className="flex flex-wrap items-center gap-3"><Button type="button" onClick={createMock} disabled={mutation.isPending}>Create mock accepted invoice</Button>{lastIrn ? <Badge variant="secondary">{lastIrn}</Badge> : null}</div>
\t\t\t<Card><CardContent className="p-0"><SubmissionTable rows={data.data} /></CardContent></Card>
\t\t</div>
\t);
}

export function EimsReceiptsPage() {
\tconst { data, isLoading } = useEimsReceipts();
\tif (isLoading || !data) return <LoadingPanel />;
\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader title="EIMS Receipts" description="Sales and withholding receipt states linked to accepted invoice IRNs." />
\t\t\t<Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Payment</TableHead><TableHead>Amount</TableHead><TableHead>RRN</TableHead></TableRow></TableHeader><TableBody>{data.data.map((row) => <TableRow key={row.id}><TableCell>{row.receiptNumber}</TableCell><TableCell>{row.receiptType}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell>{row.paymentMode}</TableCell><TableCell>{row.paidAmount}</TableCell><TableCell>{row.rrn ?? "Pending"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
\t\t</div>
\t);
}

export function EimsBulkPage() {
\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader title="EIMS Bulk" description="Signed callbacks, encrypted receipt persistence, and reconciliation checks are ready for SDK sandbox wiring." />
\t\t\t<Card><CardContent className="grid gap-3 p-4 md:grid-cols-3"><div><p className="text-xs uppercase text-muted-foreground">Endpoint</p><p className="mt-1 font-medium">Phase 0 confirms /bulkInvoice vs /bulk/register</p></div><div><p className="text-xs uppercase text-muted-foreground">Callback</p><p className="mt-1 font-medium">HMAC verified and tenant-known</p></div><div><p className="text-xs uppercase text-muted-foreground">Receipts</p><p className="mt-1 font-medium">Encrypted by idempotency key</p></div></CardContent></Card>
\t\t</div>
\t);
}

export function EimsCompliancePage() {
\tconst { data, isLoading } = useEimsComplianceEvidence();
\tif (isLoading || !data) return <LoadingPanel />;
\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader title="EIMS Compliance" description="Continuously generated evidence package readiness against V3 controls." />
\t\t\t<Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Readiness</p><p className="mt-1 text-3xl font-semibold">{data.data.readiness}%</p></CardContent></Card>
\t\t\t<Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Evidence</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{data.data.items.map((item) => <TableRow key={item.key}><TableCell>{item.label}</TableCell><TableCell><StatusBadge status={item.status} /></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
\t\t</div>
\t);
}
`,
	);
	await writeNew(
		path.join(root, "apps/web/src/features/eims/components/eims-admin-pages.reference.txt"),
		`import {
\tuseAdminEimsCertificates,
\tuseAdminEimsCompliance,
\tuseAdminEimsFailures,
\tuseAdminEimsOverview,
\tuseAdminEimsResources,
\tuseAdminEimsTenants,
} from "#features/eims/api/eims.hooks";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const statusVariant = (status: string): BadgeVariant => {
\tif (["ready", "valid", "running"].includes(status)) return "default";
\tif (["blocked_sandbox", "expires_soon", "paused_pending_approval", "rule_error"].includes(status)) return "destructive";
\tif (["mock", "mocked", "retryable"].includes(status)) return "secondary";
\treturn "outline";
};

function StatusBadge({ status }: { readonly status: string }) {
\treturn <Badge variant={statusVariant(status)}>{status.replace(/_/g, " ")}</Badge>;
}

function LoadingPanel() {
\treturn (
\t\t<div className="space-y-4">
\t\t\t<Skeleton className="h-9 w-72" />
\t\t\t<Skeleton className="h-40 w-full" />
\t\t</div>
\t);
}

function PageHeader({ title, description }: { readonly title: string; readonly description: string }) {
\treturn (
\t\t<div>
\t\t\t<h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
\t\t\t<p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
\t\t</div>
\t);
}

export function AdminEimsOverviewPage() {
\tconst { data, isLoading } = useAdminEimsOverview();
\tif (isLoading || !data) return <LoadingPanel />;
\tconst overview = data.data;
\tconst stats = [
\t\t["Tenants", overview.tenantsTotal],
\t\t["Blocked", overview.tenantsBlocked],
\t\t["Accepted Today", overview.acceptedToday],
\t\t["Pending Offline", overview.pendingOffline],
\t\t["Unknown", overview.unknownSubmissions],
\t\t["Cert Alerts", overview.certificateAlerts],
\t] as const;
\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader title="Platform EIMS Operations" description="Super-admin view across tenants, source queues, certificate risks, and mock EIMS failures." />
\t\t\t<div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{stats.map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></CardContent></Card>)}</div>
\t\t\t<Card><CardHeader><CardTitle className="text-base">Latest Failures</CardTitle></CardHeader><CardContent className="p-0"><AdminFailuresTable rows={overview.latestFailures} /></CardContent></Card>
\t\t</div>
\t);
}

function AdminFailuresTable({ rows }: { readonly rows: Array<{ id: string; tenant: string; sourceSystem: string; errorCode: string; category: string; recommendedAction: string }> }) {
\treturn (
\t\t<Table><TableHeader><TableRow><TableHead>Tenant</TableHead><TableHead>Source</TableHead><TableHead>Error</TableHead><TableHead>Category</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell>{row.tenant}</TableCell><TableCell>{row.sourceSystem}</TableCell><TableCell>{row.errorCode}</TableCell><TableCell><StatusBadge status={row.category} /></TableCell><TableCell className="max-w-md whitespace-normal">{row.recommendedAction}</TableCell></TableRow>)}</TableBody></Table>
\t);
}

export function AdminEimsTenantsPage() {
\tconst { data, isLoading } = useAdminEimsTenants();
\tif (isLoading || !data) return <LoadingPanel />;
\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader title="EIMS Tenants" description="Tenant readiness and throughput by branch/source footprint." />
\t\t\t<Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Tenant</TableHead><TableHead>Status</TableHead><TableHead>Branches</TableHead><TableHead>Sources</TableHead><TableHead>Accepted</TableHead><TableHead>Pending</TableHead></TableRow></TableHeader><TableBody>{data.data.map((row) => <TableRow key={row.id}><TableCell>{row.name}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell>{row.branches}</TableCell><TableCell>{row.sources}</TableCell><TableCell>{row.acceptedToday}</TableCell><TableCell>{row.pendingOffline}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
\t\t</div>
\t);
}

export function AdminEimsFailuresPage() {
\tconst { data, isLoading } = useAdminEimsFailures();
\tif (isLoading || !data) return <LoadingPanel />;
\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader title="EIMS Failures" description="Error classification and operator action list for retryable, rule, and manual-intervention failures." />
\t\t\t<Card><CardContent className="p-0"><AdminFailuresTable rows={data.data} /></CardContent></Card>
\t\t</div>
\t);
}

export function AdminEimsCertificatesPage() {
\tconst { data, isLoading } = useAdminEimsCertificates();
\tif (isLoading || !data) return <LoadingPanel />;
\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader title="EIMS Certificates" description="Platform certificate expiry and revocation watchlist." />
\t\t\t<Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Tenant</TableHead><TableHead>Source</TableHead><TableHead>Valid To</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{data.data.map((row) => <TableRow key={row.tenant + row.sourceSystem}><TableCell>{row.tenant}</TableCell><TableCell>{row.sourceSystem}</TableCell><TableCell>{row.validTo}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
\t\t</div>
\t);
}

export function AdminEimsResourcesPage() {
\tconst { data, isLoading } = useAdminEimsResources();
\tif (isLoading || !data) return <LoadingPanel />;
\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader title="EIMS Resources" description="Queue, signing provider, Vault, and MoR endpoint status for operations." />
\t\t\t<div className="grid gap-4 xl:grid-cols-[1fr_0.6fr]"><Card><CardHeader><CardTitle className="text-base">Queues</CardTitle></CardHeader><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Depth</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{data.data.queues.map((row) => <TableRow key={row.name}><TableCell>{row.name}</TableCell><TableCell>{row.depth}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell></TableRow>)}</TableBody></Table></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Dependencies</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-center justify-between"><span>Vault</span><StatusBadge status={data.data.vault.status} /></div><div className="flex items-center justify-between"><span>MoR sandbox</span><StatusBadge status={data.data.mor.sandbox} /></div><div className="flex items-center justify-between"><span>MoR production</span><StatusBadge status={data.data.mor.production} /></div></CardContent></Card></div>
\t\t</div>
\t);
}

export function AdminEimsCompliancePage() {
\tconst { data, isLoading } = useAdminEimsCompliance();
\tif (isLoading || !data) return <LoadingPanel />;
\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader
\t\t\t\ttitle="EIMS Compliance"
\t\t\t\tdescription="Platform evidence readiness for INSA/MoR paperwork and audits."
\t\t\t/>
\t\t\t<Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Readiness</p><p className="mt-1 text-3xl font-semibold">{data.data.readiness}%</p></CardContent></Card>
\t\t\t<div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Ready</CardTitle></CardHeader><CardContent className="space-y-2">{data.data.ready.map((item) => <div key={item} className="rounded-md border p-3 text-sm">{item}</div>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Missing</CardTitle></CardHeader><CardContent className="space-y-2">{data.data.missing.map((item) => <div key={item} className="rounded-md border p-3 text-sm">{item}</div>)}</CardContent></Card></div>
\t\t</div>
\t);
}
`,
	);

	await writeNew(
		path.join(root, "apps/web/src/features/eims/components/eims-tenant-pages.tsx"),
		`import React from "react";
import {
\ttype EimsOverview,
\tuseCreateMockEimsSubmission,
\tuseEimsComplianceEvidence,
\tuseEimsOverview,
\tuseEimsReceipts,
\tuseEimsSubmissions,
} from "#features/eims/api/eims.hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DirectoryKind = "enterprises" | "establishments" | "sources";
type TableRows = readonly (readonly string[])[];

const badgeVariant = (status: string) => {
\tif (["accepted", "active", "approved", "complete", "ready"].includes(status)) return "default";
\tif (["failed_retryable", "blocked", "unknown_submission"].includes(status)) return "destructive";
\tif (["pending", "pending_offline", "attention", "mocked"].includes(status)) return "secondary";
\treturn "outline";
};

function StatusBadge({ status }: { readonly status: string }) {
\treturn <Badge variant={badgeVariant(status)}>{status.replace(/_/g, " ")}</Badge>;
}

function LoadingPanel() {
\treturn (
\t\t<div className="space-y-4">
\t\t\t<Skeleton className="h-9 w-72" />
\t\t\t<Skeleton className="h-36 w-full" />
\t\t\t<Skeleton className="h-48 w-full" />
\t\t</div>
\t);
}

function PageHeader({
\ttitle,
\tdescription,
\tmode,
}: {
\treadonly title: string;
\treadonly description: string;
\treadonly mode?: string;
}) {
\treturn (
\t\t<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
\t\t\t<div>
\t\t\t\t<h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
\t\t\t\t<p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
\t\t\t</div>
\t\t\t{mode ? <StatusBadge status={mode === "mock" ? "Mock Mode" : mode} /> : null}
\t\t</div>
\t);
}

function DataTable({ headers, rows }: { readonly headers: readonly string[]; readonly rows: TableRows }) {
\treturn (
\t\t<Table>
\t\t\t<TableHeader>
\t\t\t\t<TableRow>
\t\t\t\t\t{headers.map((header) => (
\t\t\t\t\t\t<TableHead key={header}>{header}</TableHead>
\t\t\t\t\t))}
\t\t\t\t</TableRow>
\t\t\t</TableHeader>
\t\t\t<TableBody>
\t\t\t\t{rows.map((row) => (
\t\t\t\t\t<TableRow key={row.join("|")}>
\t\t\t\t\t\t{row.map((cell, index) => (
\t\t\t\t\t\t\t<TableCell key={String(index)} className={index === row.length - 1 ? "max-w-md truncate" : undefined}>
\t\t\t\t\t\t\t\t{cell}
\t\t\t\t\t\t\t</TableCell>
\t\t\t\t\t\t))}
\t\t\t\t\t</TableRow>
\t\t\t\t))}
\t\t\t</TableBody>
\t\t</Table>
\t);
}

function StatCards({ overview }: { readonly overview: EimsOverview }) {
\tconst stats = [
\t\t["Accepted Today", String(overview.stats.acceptedToday)],
\t\t["Pending Offline", String(overview.stats.pendingOffline)],
\t\t["Unknown", String(overview.stats.unknownSubmissions)],
\t\t["Cert Alerts", String(overview.stats.certificatesExpiring)],
\t] as const;

\treturn (
\t\t<div className="grid gap-3 md:grid-cols-4">
\t\t\t{stats.map(([label, value]) => (
\t\t\t\t<Card key={label}>
\t\t\t\t\t<CardContent className="p-4">
\t\t\t\t\t\t<p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
\t\t\t\t\t\t<p className="mt-2 text-2xl font-semibold">{value}</p>
\t\t\t\t\t</CardContent>
\t\t\t\t</Card>
\t\t\t))}
\t\t</div>
\t);
}

function SetupProgress({ overview }: { readonly overview: EimsOverview }) {
\treturn (
\t\t<Card>
\t\t\t<CardHeader>
\t\t\t\t<CardTitle className="text-base">EIMS setup path</CardTitle>
\t\t\t</CardHeader>
\t\t\t<CardContent className="grid gap-2 md:grid-cols-2">
\t\t\t\t{overview.setupProgress.map((step) => (
\t\t\t\t\t<div key={step.key} className="flex items-center justify-between gap-3 rounded-md border p-3">
\t\t\t\t\t\t<span className="text-sm font-medium">{step.label}</span>
\t\t\t\t\t\t<StatusBadge status={step.status} />
\t\t\t\t\t</div>
\t\t\t\t))}
\t\t\t</CardContent>
\t\t</Card>
\t);
}

const submissionRows = (rows: EimsOverview["recentSubmissions"]) =>
\trows.map((row) => [
\t\trow.documentNumber,
\t\t\`\${row.documentType} / \${row.transactionType}\`,
\t\trow.status,
\t\trow.sourceSystem,
\t\t\`\${row.totalValue} ETB\`,
\t\trow.irn ?? "Pending EIMS acceptance",
\t]);

export function EimsOverviewPage() {
\tconst { data, isLoading } = useEimsOverview();
\tif (isLoading || !data) return <LoadingPanel />;
\tconst overview = data.data;

\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader
\t\t\t\ttitle="Ethiopia tax workspace"
\t\t\t\tdescription="Daily operator console for MoR source approval, INSA certificate readiness, EIMS submissions, receipts, and audit evidence."
\t\t\t\tmode={overview.mode}
\t\t\t/>
\t\t\t<StatCards overview={overview} />
\t\t\t<SetupProgress overview={overview} />
\t\t\t<Card>
\t\t\t\t<CardHeader>
\t\t\t\t\t<CardTitle className="text-base">Recent Submissions</CardTitle>
\t\t\t\t</CardHeader>
\t\t\t\t<CardContent className="p-0">
\t\t\t\t\t<DataTable
\t\t\t\t\t\theaders={["Document", "Type", "Status", "Source", "Total", "IRN"]}
\t\t\t\t\t\trows={submissionRows(overview.recentSubmissions)}
\t\t\t\t\t/>
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}

export function EimsSetupPage() {
\tconst { data, isLoading } = useEimsOverview();
\tif (isLoading || !data) return <LoadingPanel />;
\tconst overview = data.data;

\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader
\t\t\t\ttitle="EIMS Setup"
\t\t\t\tdescription="Track onboarding gates before production invoice submission is enabled."
\t\t\t\tmode={overview.mode}
\t\t\t/>
\t\t\t<SetupProgress overview={overview} />
\t\t\t<Card>
\t\t\t\t<CardHeader>
\t\t\t\t\t<CardTitle className="text-base">Current Blockers</CardTitle>
\t\t\t\t</CardHeader>
\t\t\t\t<CardContent className="space-y-2">
\t\t\t\t\t{overview.blockers.map((blocker) => (
\t\t\t\t\t\t<div key={blocker} className="rounded-md border border-border p-3 text-sm">
\t\t\t\t\t\t\t{blocker}
\t\t\t\t\t\t</div>
\t\t\t\t\t))}
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}

export function EimsDirectoryPage({ kind }: { readonly kind: DirectoryKind }) {
\tconst { data, isLoading } = useEimsOverview();
\tif (isLoading || !data) return <LoadingPanel />;
\tconst overview = data.data;

\tif (kind === "enterprises") {
\t\treturn (
\t\t\t<div className="space-y-5">
\t\t\t\t<PageHeader title="EIMS Enterprises" description="Legal taxpayer identities linked to this SaaS tenant." />
\t\t\t\t<Card>
\t\t\t\t\t<CardContent className="p-0">
\t\t\t\t\t\t<DataTable
\t\t\t\t\t\t\theaders={["Legal Name", "TIN", "VAT", "Status"]}
\t\t\t\t\t\t\trows={overview.enterprises.map((row) => [row.legalName, row.tin, row.vatNumber, row.status])}
\t\t\t\t\t\t/>
\t\t\t\t\t</CardContent>
\t\t\t\t</Card>
\t\t\t</div>
\t\t);
\t}

\tif (kind === "establishments") {
\t\treturn (
\t\t\t<div className="space-y-5">
\t\t\t\t<PageHeader
\t\t\t\t\ttitle="EIMS Establishments"
\t\t\t\t\tdescription="Registered branch and sub-TIN context for invoice source resolution."
\t\t\t\t/>
\t\t\t\t<Card>
\t\t\t\t\t<CardContent className="p-0">
\t\t\t\t\t\t<DataTable
\t\t\t\t\t\t\theaders={["Name", "Code", "Sub-TIN", "City", "Status"]}
\t\t\t\t\t\t\trows={overview.establishments.map((row) => [row.name, row.code, row.subTin, row.city, row.status])}
\t\t\t\t\t\t/>
\t\t\t\t\t</CardContent>
\t\t\t\t</Card>
\t\t\t</div>
\t\t);
\t}

\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader
\t\t\t\ttitle="EIMS Source Systems"
\t\t\t\tdescription="POS, ERP, and source systems that own counters, certificates, credentials, and PreviousIrn chains."
\t\t\t/>
\t\t\t<Card>
\t\t\t\t<CardContent className="p-0">
\t\t\t\t\t<DataTable
\t\t\t\t\t\theaders={["Name", "System Number", "Type", "Approval", "Counter"]}
\t\t\t\t\t\trows={overview.sourceSystems.map((row) => [
\t\t\t\t\t\t\trow.name,
\t\t\t\t\t\t\trow.systemNumber,
\t\t\t\t\t\t\trow.systemType,
\t\t\t\t\t\t\trow.approvalStatus,
\t\t\t\t\t\t\tString(row.lastAcceptedCounter),
\t\t\t\t\t\t])}
\t\t\t\t\t/>
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}

export function EimsCredentialsPage() {
\tconst rows = [
\t\t["Lifecycle", "initial_setup to tested to active to rotated"],
\t\t["Secrets", "API key, password, client secret, and refresh token are encrypted"],
\t\t["Token cache", "Access tokens stay in Redis with TTL"],
\t];

\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader
\t\t\t\ttitle="EIMS Credentials"
\t\t\t\tdescription="Credential storage is backend-only and envelope-encrypted; this mock surface verifies lifecycle visibility."
\t\t\t/>
\t\t\t<Card>
\t\t\t\t<CardContent className="p-0">
\t\t\t\t\t<DataTable headers={["Control", "Mock state"]} rows={rows} />
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}

export function EimsCertificatesPage() {
\tconst rows = [
\t\t["Provider", "Vault Transit"],
\t\t["Expiry alert", "90 / 60 / 30 / 7 days"],
\t\t["Historical verify", "Key version retained"],
\t\t["Sandbox", "Waiting for INSA"],
\t];

\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader
\t\t\t\ttitle="EIMS Certificates"
\t\t\t\tdescription="Certificate metadata, CSR flow, expiry windows, and signing key version tracking."
\t\t\t/>
\t\t\t<Card>
\t\t\t\t<CardContent className="p-0">
\t\t\t\t\t<DataTable headers={["Control", "Mock state"]} rows={rows} />
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}

export function EimsSubmissionsPage() {
\tconst { data, isLoading } = useEimsSubmissions();
\tconst mutation = useCreateMockEimsSubmission();
\tconst [lastIrn, setLastIrn] = React.useState<string | null>(null);
\tconst createMock = React.useCallback(async () => {
\t\tconst result = await mutation.mutateAsync(\`INV-MOCK-\${Date.now()}\`);
\t\tsetLastIrn(result.data.irn);
\t}, [mutation]);
\tif (isLoading || !data) return <LoadingPanel />;

\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader
\t\t\t\ttitle="EIMS Submissions"
\t\t\t\tdescription="Mocked accepted, offline, retryable, and unknown states for source-counter flow testing."
\t\t\t/>
\t\t\t<div className="flex flex-wrap items-center gap-3">
\t\t\t\t<Button type="button" onClick={createMock} disabled={mutation.isPending}>
\t\t\t\t\tCreate mock accepted invoice
\t\t\t\t</Button>
\t\t\t\t{lastIrn ? <Badge variant="secondary">{lastIrn}</Badge> : null}
\t\t\t</div>
\t\t\t<Card>
\t\t\t\t<CardContent className="p-0">
\t\t\t\t\t<DataTable
\t\t\t\t\t\theaders={["Document", "Type", "Status", "Source", "Total", "IRN"]}
\t\t\t\t\t\trows={submissionRows(data.data)}
\t\t\t\t\t/>
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}

export function EimsReceiptsPage() {
\tconst { data, isLoading } = useEimsReceipts();
\tif (isLoading || !data) return <LoadingPanel />;

\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader
\t\t\t\ttitle="EIMS Receipts"
\t\t\t\tdescription="Sales and withholding receipt states linked to accepted invoice IRNs."
\t\t\t/>
\t\t\t<Card>
\t\t\t\t<CardContent className="p-0">
\t\t\t\t\t<DataTable
\t\t\t\t\t\theaders={["Receipt", "Type", "Status", "Payment", "Amount", "RRN"]}
\t\t\t\t\t\trows={data.data.map((row) => [
\t\t\t\t\t\t\trow.receiptNumber,
\t\t\t\t\t\t\trow.receiptType,
\t\t\t\t\t\t\trow.status,
\t\t\t\t\t\t\trow.paymentMode,
\t\t\t\t\t\t\trow.paidAmount,
\t\t\t\t\t\t\trow.rrn ?? "Pending",
\t\t\t\t\t\t])}
\t\t\t\t\t/>
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}

export function EimsBulkPage() {
\tconst rows = [
\t\t["Endpoint", "Phase 0 confirms /bulkInvoice vs /bulk/register"],
\t\t["Callback", "HMAC verified and tenant-known"],
\t\t["Receipts", "Encrypted by idempotency key"],
\t\t["Reconciliation", "Failures and pending rows ready for polling worker"],
\t];

\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader
\t\t\t\ttitle="EIMS Bulk"
\t\t\t\tdescription="Signed callbacks, encrypted receipt persistence, and reconciliation checks are ready for SDK sandbox wiring."
\t\t\t/>
\t\t\t<Card>
\t\t\t\t<CardContent className="p-0">
\t\t\t\t\t<DataTable headers={["Control", "Mock state"]} rows={rows} />
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}

export function EimsCompliancePage() {
\tconst { data, isLoading } = useEimsComplianceEvidence();
\tif (isLoading || !data) return <LoadingPanel />;

\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader
\t\t\t\ttitle="EIMS Compliance"
\t\t\t\tdescription="Continuously generated evidence package readiness against V3 controls."
\t\t\t/>
\t\t\t<Card>
\t\t\t\t<CardContent className="p-4">
\t\t\t\t\t<p className="text-sm text-muted-foreground">Readiness</p>
\t\t\t\t\t<p className="mt-1 text-3xl font-semibold">{data.data.readiness}%</p>
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t\t<Card>
\t\t\t\t<CardContent className="p-0">
\t\t\t\t\t<DataTable headers={["Evidence", "Status"]} rows={data.data.items.map((item) => [item.label, item.status])} />
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}
`,
	);
	await writeNew(
		path.join(root, "apps/web/src/features/eims/components/eims-admin-pages.tsx"),
		`import {
\tuseAdminEimsCertificates,
\tuseAdminEimsCompliance,
\tuseAdminEimsFailures,
\tuseAdminEimsOverview,
\tuseAdminEimsResources,
\tuseAdminEimsTenants,
} from "#features/eims/api/eims.hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TableRows = readonly (readonly string[])[];

function LoadingPanel() {
\treturn (
\t\t<div className="space-y-4">
\t\t\t<Skeleton className="h-9 w-72" />
\t\t\t<Skeleton className="h-40 w-full" />
\t\t</div>
\t);
}

function PageHeader({ title, description }: { readonly title: string; readonly description: string }) {
\treturn (
\t\t<div>
\t\t\t<h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
\t\t\t<p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
\t\t</div>
\t);
}

function DataTable({ headers, rows }: { readonly headers: readonly string[]; readonly rows: TableRows }) {
\treturn (
\t\t<Table>
\t\t\t<TableHeader>
\t\t\t\t<TableRow>
\t\t\t\t\t{headers.map((header) => (
\t\t\t\t\t\t<TableHead key={header}>{header}</TableHead>
\t\t\t\t\t))}
\t\t\t\t</TableRow>
\t\t\t</TableHeader>
\t\t\t<TableBody>
\t\t\t\t{rows.map((row) => (
\t\t\t\t\t<TableRow key={row.join("|")}>
\t\t\t\t\t\t{row.map((cell, index) => (
\t\t\t\t\t\t\t<TableCell
\t\t\t\t\t\t\t\tkey={String(index)}
\t\t\t\t\t\t\t\tclassName={index === row.length - 1 ? "max-w-md whitespace-normal" : undefined}
\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t{cell}
\t\t\t\t\t\t\t</TableCell>
\t\t\t\t\t\t))}
\t\t\t\t\t</TableRow>
\t\t\t\t))}
\t\t\t</TableBody>
\t\t</Table>
\t);
}

export function AdminEimsOverviewPage() {
\tconst { data, isLoading } = useAdminEimsOverview();
\tif (isLoading || !data) return <LoadingPanel />;
\tconst overview = data.data;
\tconst stats = [
\t\t["Tenants", String(overview.tenantsTotal)],
\t\t["Blocked", String(overview.tenantsBlocked)],
\t\t["Accepted Today", String(overview.acceptedToday)],
\t\t["Pending Offline", String(overview.pendingOffline)],
\t\t["Unknown", String(overview.unknownSubmissions)],
\t\t["Cert Alerts", String(overview.certificateAlerts)],
\t] as const;

\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader
\t\t\t\ttitle="Platform EIMS Operations"
\t\t\t\tdescription="Super-admin view across tenants, source queues, certificate risks, and mock EIMS failures."
\t\t\t/>
\t\t\t<div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
\t\t\t\t{stats.map(([label, value]) => (
\t\t\t\t\t<Card key={label}>
\t\t\t\t\t\t<CardContent className="p-4">
\t\t\t\t\t\t\t<p className="text-xs uppercase text-muted-foreground">{label}</p>
\t\t\t\t\t\t\t<p className="mt-2 text-2xl font-semibold">{value}</p>
\t\t\t\t\t\t</CardContent>
\t\t\t\t\t</Card>
\t\t\t\t))}
\t\t\t</div>
\t\t\t<Card>
\t\t\t\t<CardHeader>
\t\t\t\t\t<CardTitle className="text-base">Latest Failures</CardTitle>
\t\t\t\t</CardHeader>
\t\t\t\t<CardContent className="p-0">
\t\t\t\t\t<DataTable
\t\t\t\t\t\theaders={["Tenant", "Source", "Error", "Category", "Action"]}
\t\t\t\t\t\trows={overview.latestFailures.map((row) => [
\t\t\t\t\t\t\trow.tenant,
\t\t\t\t\t\t\trow.sourceSystem,
\t\t\t\t\t\t\trow.errorCode,
\t\t\t\t\t\t\trow.category,
\t\t\t\t\t\t\trow.recommendedAction,
\t\t\t\t\t\t])}
\t\t\t\t\t/>
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}

export function AdminEimsTenantsPage() {
\tconst { data, isLoading } = useAdminEimsTenants();
\tif (isLoading || !data) return <LoadingPanel />;

\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader title="EIMS Tenants" description="Tenant readiness and throughput by branch/source footprint." />
\t\t\t<Card>
\t\t\t\t<CardContent className="p-0">
\t\t\t\t\t<DataTable
\t\t\t\t\t\theaders={["Tenant", "Status", "Branches", "Sources", "Accepted", "Pending"]}
\t\t\t\t\t\trows={data.data.map((row) => [
\t\t\t\t\t\t\trow.name,
\t\t\t\t\t\t\trow.status,
\t\t\t\t\t\t\tString(row.branches),
\t\t\t\t\t\t\tString(row.sources),
\t\t\t\t\t\t\tString(row.acceptedToday),
\t\t\t\t\t\t\tString(row.pendingOffline),
\t\t\t\t\t\t])}
\t\t\t\t\t/>
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}

export function AdminEimsFailuresPage() {
\tconst { data, isLoading } = useAdminEimsFailures();
\tif (isLoading || !data) return <LoadingPanel />;

\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader
\t\t\t\ttitle="EIMS Failures"
\t\t\t\tdescription="Error classification and operator action list for retryable, rule, and manual-intervention failures."
\t\t\t/>
\t\t\t<Card>
\t\t\t\t<CardContent className="p-0">
\t\t\t\t\t<DataTable
\t\t\t\t\t\theaders={["Tenant", "Source", "Error", "Category", "Action"]}
\t\t\t\t\t\trows={data.data.map((row) => [
\t\t\t\t\t\t\trow.tenant,
\t\t\t\t\t\t\trow.sourceSystem,
\t\t\t\t\t\t\trow.errorCode,
\t\t\t\t\t\t\trow.category,
\t\t\t\t\t\t\trow.recommendedAction,
\t\t\t\t\t\t])}
\t\t\t\t\t/>
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}

export function AdminEimsCertificatesPage() {
\tconst { data, isLoading } = useAdminEimsCertificates();
\tif (isLoading || !data) return <LoadingPanel />;

\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader title="EIMS Certificates" description="Platform certificate expiry and revocation watchlist." />
\t\t\t<Card>
\t\t\t\t<CardContent className="p-0">
\t\t\t\t\t<DataTable
\t\t\t\t\t\theaders={["Tenant", "Source", "Valid To", "Status"]}
\t\t\t\t\t\trows={data.data.map((row) => [row.tenant, row.sourceSystem, row.validTo, row.status])}
\t\t\t\t\t/>
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}

export function AdminEimsResourcesPage() {
\tconst { data, isLoading } = useAdminEimsResources();
\tif (isLoading || !data) return <LoadingPanel />;

\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader
\t\t\t\ttitle="EIMS Resources"
\t\t\t\tdescription="Queue, signing provider, Vault, and MoR endpoint status for operations."
\t\t\t/>
\t\t\t<Card>
\t\t\t\t<CardHeader>
\t\t\t\t\t<CardTitle className="text-base">Queues</CardTitle>
\t\t\t\t</CardHeader>
\t\t\t\t<CardContent className="p-0">
\t\t\t\t\t<DataTable
\t\t\t\t\t\theaders={["Name", "Depth", "Status"]}
\t\t\t\t\t\trows={data.data.queues.map((row) => [row.name, String(row.depth), row.status])}
\t\t\t\t\t/>
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}

export function AdminEimsCompliancePage() {
\tconst { data, isLoading } = useAdminEimsCompliance();
\tif (isLoading || !data) return <LoadingPanel />;
\tconst rows = [
\t\t...data.data.ready.map((item) => [item, "ready"]),
\t\t...data.data.missing.map((item) => [item, "missing"]),
\t];

\treturn (
\t\t<div className="space-y-5">
\t\t\t<PageHeader
\t\t\t\ttitle="EIMS Compliance"
\t\t\t\tdescription="Platform evidence readiness for INSA/MoR paperwork and audits."
\t\t\t/>
\t\t\t<Card>
\t\t\t\t<CardContent className="p-4">
\t\t\t\t\t<p className="text-sm text-muted-foreground">Readiness</p>
\t\t\t\t\t<p className="mt-1 text-3xl font-semibold">{data.data.readiness}%</p>
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t\t<Card>
\t\t\t\t<CardContent className="p-0">
\t\t\t\t\t<DataTable headers={["Evidence", "Status"]} rows={rows} />
\t\t\t\t</CardContent>
\t\t\t</Card>
\t\t</div>
\t);
}
`,
	);

	const routePages = [
		[
			"index",
			"/_authenticated/eims/",
			"import { EimsOverviewPage } from \"#features/eims/components/eims-tenant-pages\";",
			"EimsOverviewPage",
		],
		[
			"setup",
			"/_authenticated/eims/setup",
			"import { EimsSetupPage } from \"#features/eims/components/eims-tenant-pages\";",
			"EimsSetupPage",
		],
		[
			"enterprises",
			"/_authenticated/eims/enterprises",
			"import { EimsDirectoryPage } from \"#features/eims/components/eims-tenant-pages\";",
			`() => <EimsDirectoryPage kind="enterprises" />`,
		],
		[
			"establishments",
			"/_authenticated/eims/establishments",
			"import { EimsDirectoryPage } from \"#features/eims/components/eims-tenant-pages\";",
			`() => <EimsDirectoryPage kind="establishments" />`,
		],
		[
			"sources",
			"/_authenticated/eims/sources",
			"import { EimsDirectoryPage } from \"#features/eims/components/eims-tenant-pages\";",
			`() => <EimsDirectoryPage kind="sources" />`,
		],
		[
			"credentials",
			"/_authenticated/eims/credentials",
			"import { EimsCredentialsPage } from \"#features/eims/components/eims-tenant-pages\";",
			"EimsCredentialsPage",
		],
		[
			"certificates",
			"/_authenticated/eims/certificates",
			"import { EimsCertificatesPage } from \"#features/eims/components/eims-tenant-pages\";",
			"EimsCertificatesPage",
		],
		[
			"submissions",
			"/_authenticated/eims/submissions",
			"import { EimsSubmissionsPage } from \"#features/eims/components/eims-tenant-pages\";",
			"EimsSubmissionsPage",
		],
		[
			"receipts",
			"/_authenticated/eims/receipts",
			"import { EimsReceiptsPage } from \"#features/eims/components/eims-tenant-pages\";",
			"EimsReceiptsPage",
		],
		[
			"bulk",
			"/_authenticated/eims/bulk",
			"import { EimsBulkPage } from \"#features/eims/components/eims-tenant-pages\";",
			"EimsBulkPage",
		],
		[
			"compliance",
			"/_authenticated/eims/compliance",
			"import { EimsCompliancePage } from \"#features/eims/components/eims-tenant-pages\";",
			"EimsCompliancePage",
		],
	];
	for (const [fileName, routePath, importLine, component] of routePages) {
		await writeNew(
			path.join(
				root,
				`apps/web/src/routes/_authenticated/eims/${fileName}.tsx`,
			),
			`import { createFileRoute } from "@tanstack/react-router";
${importLine}

export const Route = createFileRoute("${routePath}")({
\tcomponent: ${component},
});
`,
		);
	}

	const adminPages = [
		["index", "/admin/eims/", "AdminEimsOverviewPage"],
		["tenants", "/admin/eims/tenants", "AdminEimsTenantsPage"],
		["failures", "/admin/eims/failures", "AdminEimsFailuresPage"],
		["certificates", "/admin/eims/certificates", "AdminEimsCertificatesPage"],
		["resources", "/admin/eims/resources", "AdminEimsResourcesPage"],
		["compliance", "/admin/eims/compliance", "AdminEimsCompliancePage"],
	];
	for (const [fileName, routePath, component] of adminPages) {
		await writeNew(
			path.join(root, `apps/web/src/routes/admin/eims/${fileName}.tsx`),
			`import { createFileRoute } from "@tanstack/react-router";
import { ${component} } from "#features/eims/components/eims-admin-pages";

export const Route = createFileRoute("${routePath}")({
\tcomponent: ${component},
});
`,
		);
	}
	await writeNew(
		path.join(root, "apps/e2e/tests/eims-mock.reference.txt"),
		`import { expect, test, type Page } from "@playwright/test";

const tenantOverview = {
\tdata: {
\t\tmode: "mock",
\t\tenvironment: "sandbox",
\t\torganizationId: "org_1",
\t\tsetupProgress: [
\t\t\t{ key: "twoFactor", label: "2FA enforced for EIMS users", status: "complete" },
\t\t\t{ key: "source", label: "Source system approval", status: "attention" },
\t\t],
\t\tstats: { acceptedToday: 1, pendingOffline: 1, unknownSubmissions: 0, certificatesExpiring: 1 },
\t\thealth: [{ label: "MoR sandbox", status: "mocked", detail: "Waiting for INSA sandbox credentials" }],
\t\tenterprises: [{ id: "ent_1", tin: "0074136947", legalName: "Habesha Restaurant PLC", vatNumber: "REGVAT123456789", status: "active" }],
\t\testablishments: [{ id: "est_1", name: "Bole Branch", code: "BOL", subTin: "0074136947-01", status: "active", city: "Addis Ababa" }],
\t\tsourceSystems: [{ id: "src_1", name: "Front POS", systemNumber: "329D03B6F0", systemType: "POS", approvalStatus: "approved", lastAcceptedCounter: 128 }],
\t\tblockers: ["INSA sandbox credentials not yet received"],
\t\trecentSubmissions: [
\t\t\t{
\t\t\t\tid: "sub_1",
\t\t\t\tdocumentNumber: "INV-2026-000128",
\t\t\t\tdocumentType: "INV",
\t\t\t\ttransactionType: "B2C",
\t\t\t\tstatus: "accepted",
\t\t\t\tirn: "MOCK-IRN-51fa3144",
\t\t\t\tsourceSystem: "Front POS",
\t\t\t\testablishment: "Bole Branch",
\t\t\t\ttotalValue: "517.50",
\t\t\t\ttaxValue: "67.50",
\t\t\t\tackDate: "2026-05-26T10:30:00.000Z",
\t\t\t},
\t\t],
\t},
};

const submissions = { data: tenantOverview.data.recentSubmissions };
const receipts = {
\tdata: [{ id: "rec_1", receiptNumber: "RCPT-2026-00044", receiptType: "sales", status: "accepted", invoiceIrn: "MOCK-IRN-51fa3144", rrn: "MOCK-RRN-00044", paymentMode: "CASH", paidAmount: "517.50" }],
};
const evidence = { data: { organizationId: "org_1", generatedAt: "2026-05-26T10:30:00.000Z", readiness: 72, items: [{ key: "phase0", label: "Phase 0 Layer A local report", status: "ready" }] } };

async function mockTenantSession(page: Page) {
\tawait page.route("**/api/auth/**", async (route) => {
\t\tconst url = new URL(route.request().url());
\t\tif (url.pathname.endsWith("/get-session")) {
\t\t\tawait route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "user_1", name: "Owner", email: "owner@example.com" }, session: { id: "sess_1", activeOrganizationId: "org_1" } }) });
\t\t\treturn;
\t\t}
\t\tawait route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
\t});
\tawait page.route("**/api/v1/billing/**", async (route) => {
\t\tawait route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { lifecycle: null, entitlements: {} } }) });
\t});
\tawait page.route("**/api/v1/eims/overview", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tenantOverview) }));
\tawait page.route("**/api/v1/eims/submissions", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(submissions) }));
\tawait page.route("**/api/v1/eims/submissions/mock-submit", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { ...submissions.data[0], id: "sub_new", documentNumber: "INV-MOCK-NEW", irn: "MOCK-IRN-NEW" } }) }));
\tawait page.route("**/api/v1/eims/receipts", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(receipts) }));
\tawait page.route("**/api/v1/eims/compliance/evidence", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(evidence) }));
}

async function mockAdminSession(page: Page) {
\tawait page.route("**/api/v1/admin/auth/me", async (route) => {
\t\tawait route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { user: { id: "admin_1", email: "admin@example.com", name: "Super Admin" }, session: { id: "admin_sess", expiresAt: "2027-01-01T00:00:00.000Z" } } }) });
\t});
\tawait page.route("**/api/v1/admin/eims/overview", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { mode: "mock", tenantsTotal: 2, tenantsBlocked: 1, acceptedToday: 184, pendingOffline: 7, unknownSubmissions: 1, certificateAlerts: 2, latestFailures: [{ id: "fail_1", tenant: "Shoa Supermarket", sourceSystem: "Megenagna POS 04", errorCode: "7015", category: "rule_error", recommendedAction: "Verify counter sequence" }], tenants: [] } }) }));
\tawait page.route("**/api/v1/admin/eims/tenants", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [{ id: "org_1", name: "Habesha Restaurants", status: "ready", branches: 2, sources: 3, acceptedToday: 96, pendingOffline: 2 }] }) }));
\tawait page.route("**/api/v1/admin/eims/failures", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [{ id: "fail_1", tenant: "Shoa Supermarket", sourceSystem: "Megenagna POS 04", errorCode: "7015", category: "rule_error", recommendedAction: "Verify counter sequence" }] }) }));
\tawait page.route("**/api/v1/admin/eims/certificates", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [{ tenant: "Habesha Restaurants", sourceSystem: "Front POS", validTo: "2026-07-10", status: "expires_soon" }] }) }));
\tawait page.route("**/api/v1/admin/eims/resources", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { queues: [{ name: "eims:submission:src_1", depth: 0, status: "running" }], vault: { status: "mocked", provider: "local" }, mor: { sandbox: "mocked", production: "not_configured" } } }) }));
\tawait page.route("**/api/v1/admin/eims/compliance", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { readiness: 68, missing: ["Phase 0 Layer B sandbox report"], ready: ["V3 architecture plan"] } }) }));
}

test("tenant EIMS mock flow is usable before sandbox access", async ({ page }) => {
\tawait mockTenantSession(page);
\tawait page.goto("/eims", { waitUntil: "domcontentloaded" });
\tawait expect(page.getByRole("heading", { name: "Ethiopia tax workspace" })).toBeVisible();
\tawait expect(page.getByText("Mock Mode")).toBeVisible();
\tawait expect(page.getByText("EIMS setup path")).toBeVisible();
\tawait expect(page.getByText("INV-2026-000128")).toBeVisible();

\tawait page.goto("/eims/submissions", { waitUntil: "domcontentloaded" });
\tawait page.getByRole("button", { name: "Create mock accepted invoice" }).click();
\tawait expect(page.getByText("MOCK-IRN-NEW")).toBeVisible();
});

test("super-admin EIMS mock flow is usable before sandbox access", async ({ page }) => {
\tawait mockAdminSession(page);
\tawait page.goto("/admin/eims", { waitUntil: "domcontentloaded" });
\tawait expect(page.getByRole("heading", { name: "Platform EIMS Operations" })).toBeVisible();
\tawait expect(page.getByText("Latest Failures")).toBeVisible();
\tawait expect(page.getByText("Shoa Supermarket")).toBeVisible();

\tawait page.goto("/admin/eims/resources", { waitUntil: "domcontentloaded" });
\tawait expect(page.getByRole("heading", { name: "EIMS Resources" })).toBeVisible();
\tawait expect(page.getByText("eims:submission:src_1")).toBeVisible();
});
`,
	);
	await writeNew(
		path.join(root, "apps/e2e/tests/eims-mock.spec.ts"),
		`import { expect, type Page, type Route, test } from "@playwright/test";

const fulfillJson = async (route: Route, body: unknown) => {
\tawait route.fulfill({
\t\tstatus: 200,
\t\tcontentType: "application/json",
\t\tbody: JSON.stringify(body),
\t});
};

const acceptedSubmission = {
\tid: "sub_1",
\tdocumentNumber: "INV-2026-000128",
\tdocumentType: "INV",
\ttransactionType: "B2C",
\tstatus: "accepted",
\tirn: "MOCK-IRN-51fa3144",
\tsourceSystem: "Front POS",
\testablishment: "Bole Branch",
\ttotalValue: "517.50",
\ttaxValue: "67.50",
\tackDate: "2026-05-26T10:30:00.000Z",
};

const tenantOverview = {
\tdata: {
\t\tmode: "mock",
\t\tenvironment: "sandbox",
\t\torganizationId: "org_1",
\t\tsetupProgress: [
\t\t\t{ key: "twoFactor", label: "2FA enforced for EIMS users", status: "complete" },
\t\t\t{ key: "source", label: "Source system approval", status: "attention" },
\t\t],
\t\tstats: {
\t\t\tacceptedToday: 1,
\t\t\tpendingOffline: 1,
\t\t\tunknownSubmissions: 0,
\t\t\tcertificatesExpiring: 1,
\t\t},
\t\thealth: [{ label: "MoR sandbox", status: "mocked", detail: "Waiting for INSA sandbox credentials" }],
\t\tenterprises: [
\t\t\t{
\t\t\t\tid: "ent_1",
\t\t\t\ttin: "0074136947",
\t\t\t\tlegalName: "Habesha Restaurant PLC",
\t\t\t\tvatNumber: "REGVAT123456789",
\t\t\t\tstatus: "active",
\t\t\t},
\t\t],
\t\testablishments: [
\t\t\t{ id: "est_1", name: "Bole Branch", code: "BOL", subTin: "0074136947-01", status: "active", city: "Addis Ababa" },
\t\t],
\t\tsourceSystems: [
\t\t\t{
\t\t\t\tid: "src_1",
\t\t\t\tname: "Front POS",
\t\t\t\tsystemNumber: "329D03B6F0",
\t\t\t\tsystemType: "POS",
\t\t\t\tapprovalStatus: "approved",
\t\t\t\tlastAcceptedCounter: 128,
\t\t\t},
\t\t],
\t\tblockers: ["INSA sandbox credentials not yet received"],
\t\trecentSubmissions: [acceptedSubmission],
\t},
};

async function mockTenantSession(page: Page) {
\tawait page.route("**/api/auth/**", async (route) => {
\t\tconst url = new URL(route.request().url());
\t\tif (url.pathname.endsWith("/get-session")) {
\t\t\tawait fulfillJson(route, {
\t\t\t\tuser: { id: "user_1", name: "Owner", email: "owner@example.com" },
\t\t\t\tsession: { id: "sess_1", activeOrganizationId: "org_1" },
\t\t\t});
\t\t\treturn;
\t\t}
\t\tawait fulfillJson(route, []);
\t});
\tawait page.route("**/api/v1/billing/**", async (route) => {
\t\tawait fulfillJson(route, { data: { lifecycle: null, entitlements: {} } });
\t});
\tawait page.route("**/api/v1/eims/overview", async (route) => fulfillJson(route, tenantOverview));
\tawait page.route("**/api/v1/eims/submissions", async (route) => fulfillJson(route, { data: [acceptedSubmission] }));
\tawait page.route("**/api/v1/eims/submissions/mock-submit", async (route) => {
\t\tawait fulfillJson(route, { data: { ...acceptedSubmission, id: "sub_new", irn: "MOCK-IRN-NEW" } });
\t});
\tawait page.route("**/api/v1/eims/receipts", async (route) => {
\t\tawait fulfillJson(route, {
\t\t\tdata: [
\t\t\t\t{
\t\t\t\t\tid: "rec_1",
\t\t\t\t\treceiptNumber: "RCPT-2026-00044",
\t\t\t\t\treceiptType: "sales",
\t\t\t\t\tstatus: "accepted",
\t\t\t\t\tinvoiceIrn: "MOCK-IRN-51fa3144",
\t\t\t\t\trrn: "MOCK-RRN-00044",
\t\t\t\t\tpaymentMode: "CASH",
\t\t\t\t\tpaidAmount: "517.50",
\t\t\t\t},
\t\t\t],
\t\t});
\t});
\tawait page.route("**/api/v1/eims/compliance/evidence", async (route) => {
\t\tawait fulfillJson(route, {
\t\t\tdata: {
\t\t\t\torganizationId: "org_1",
\t\t\t\tgeneratedAt: "2026-05-26T10:30:00.000Z",
\t\t\t\treadiness: 72,
\t\t\t\titems: [{ key: "phase0", label: "Phase 0 Layer A local report", status: "ready" }],
\t\t\t},
\t\t});
\t});
}

async function mockAdminSession(page: Page) {
\tawait page.route("**/api/v1/admin/auth/me", async (route) => {
\t\tawait fulfillJson(route, {
\t\t\tdata: {
\t\t\t\tuser: { id: "admin_1", email: "admin@example.com", name: "Super Admin" },
\t\t\t\tsession: { id: "admin_sess", expiresAt: "2027-01-01T00:00:00.000Z" },
\t\t\t},
\t\t});
\t});
\tawait page.route("**/api/v1/admin/eims/overview", async (route) => {
\t\tawait fulfillJson(route, {
\t\t\tdata: {
\t\t\t\tmode: "mock",
\t\t\t\ttenantsTotal: 2,
\t\t\t\ttenantsBlocked: 1,
\t\t\t\tacceptedToday: 184,
\t\t\t\tpendingOffline: 7,
\t\t\t\tunknownSubmissions: 1,
\t\t\t\tcertificateAlerts: 2,
\t\t\t\tlatestFailures: [
\t\t\t\t\t{
\t\t\t\t\t\tid: "fail_1",
\t\t\t\t\t\ttenant: "Shoa Supermarket",
\t\t\t\t\t\tsourceSystem: "Megenagna POS 04",
\t\t\t\t\t\terrorCode: "7015",
\t\t\t\t\t\tcategory: "rule_error",
\t\t\t\t\t\trecommendedAction: "Verify counter sequence",
\t\t\t\t\t},
\t\t\t\t],
\t\t\t\ttenants: [],
\t\t\t},
\t\t});
\t});
\tawait page.route("**/api/v1/admin/eims/resources", async (route) => {
\t\tawait fulfillJson(route, {
\t\t\tdata: {
\t\t\t\tqueues: [{ name: "eims:submission:src_1", depth: 0, status: "running" }],
\t\t\t\tvault: { status: "mocked", provider: "local" },
\t\t\t\tmor: { sandbox: "mocked", production: "not_configured" },
\t\t\t},
\t\t});
\t});
}

test("tenant EIMS mock flow is usable before sandbox access", async ({ page }) => {
\tawait mockTenantSession(page);
\tawait page.goto("/eims", { waitUntil: "domcontentloaded" });
\tawait expect(page.getByRole("heading", { name: "Ethiopia tax workspace" })).toBeVisible();
\tawait expect(page.getByText("Mock Mode")).toBeVisible();
\tawait expect(page.getByText("EIMS setup path")).toBeVisible();
\tawait expect(page.getByText("INV-2026-000128")).toBeVisible();

\tawait page.goto("/eims/submissions", { waitUntil: "domcontentloaded" });
\tawait page.getByRole("button", { name: "Create mock accepted invoice" }).click();
\tawait expect(page.getByText("MOCK-IRN-NEW")).toBeVisible();
});

test("super-admin EIMS mock flow is usable before sandbox access", async ({ page }) => {
\tawait mockAdminSession(page);
\tawait page.goto("/admin/eims", { waitUntil: "domcontentloaded" });
\tawait expect(page.getByRole("heading", { name: "Platform EIMS Operations" })).toBeVisible();
\tawait expect(page.getByText("Latest Failures")).toBeVisible();
\tawait expect(page.getByText("Shoa Supermarket")).toBeVisible();

\tawait page.goto("/admin/eims/resources", { waitUntil: "domcontentloaded" });
\tawait expect(page.getByRole("heading", { name: "EIMS Resources" })).toBeVisible();
\tawait expect(page.getByText("eims:submission:src_1")).toBeVisible();
});
`,
	);
	await writeNew(
		path.join(root, "apps/e2e/playwright.eims.config.ts"),
		`import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

const eimsBaseUrl = "http://localhost:5179";
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
\t...baseConfig,
\ttimeout: 90_000,
\texpect: {
\t\t...(baseConfig.expect ?? {}),
\t\ttimeout: 10_000,
\t},
\tuse: {
\t\t...(baseConfig.use ?? {}),
\t\tbaseURL: eimsBaseUrl,
\t},
\twebServer: {
\t\tcommand:
\t\t\t"node apps/web/node_modules/vite/bin/vite.js apps/web --host 127.0.0.1 --port 5179 --strictPort --config apps/web/vite.config.ts",
\t\tcwd: workspaceRoot,
\t\turl: eimsBaseUrl,
\t\treuseExistingServer: false,
\t\ttimeout: 120_000,
\t},
});
`,
	);
	await patchJsonFile(path.join(root, "apps/e2e/package.json"), (json) => {
		json.scripts ??= {};
		json.scripts["test:eims"] ??=
			"playwright test -c playwright.eims.config.ts tests/eims-mock.spec.ts";
		return json;
	});
};

const patchEimsRouteTree = async (root) => {
	const file = path.join(root, "apps/web/src/routeTree.gen.ts");
	if (!(await fs.pathExists(file))) return false;
	let text = await fs.readFile(file, "utf8");

	const tenantRoutes = [
		["AuthenticatedEimsIndexRoute", "AuthenticatedEimsIndexRouteImport", "./routes/_authenticated/eims/index", "/eims/", "/eims/"],
		["AuthenticatedEimsSetupRoute", "AuthenticatedEimsSetupRouteImport", "./routes/_authenticated/eims/setup", "/eims/setup", "/eims/setup"],
		[
			"AuthenticatedEimsEnterprisesRoute",
			"AuthenticatedEimsEnterprisesRouteImport",
			"./routes/_authenticated/eims/enterprises",
			"/eims/enterprises",
			"/eims/enterprises",
		],
		[
			"AuthenticatedEimsEstablishmentsRoute",
			"AuthenticatedEimsEstablishmentsRouteImport",
			"./routes/_authenticated/eims/establishments",
			"/eims/establishments",
			"/eims/establishments",
		],
		["AuthenticatedEimsSourcesRoute", "AuthenticatedEimsSourcesRouteImport", "./routes/_authenticated/eims/sources", "/eims/sources", "/eims/sources"],
		[
			"AuthenticatedEimsCredentialsRoute",
			"AuthenticatedEimsCredentialsRouteImport",
			"./routes/_authenticated/eims/credentials",
			"/eims/credentials",
			"/eims/credentials",
		],
		[
			"AuthenticatedEimsCertificatesRoute",
			"AuthenticatedEimsCertificatesRouteImport",
			"./routes/_authenticated/eims/certificates",
			"/eims/certificates",
			"/eims/certificates",
		],
		[
			"AuthenticatedEimsSubmissionsRoute",
			"AuthenticatedEimsSubmissionsRouteImport",
			"./routes/_authenticated/eims/submissions",
			"/eims/submissions",
			"/eims/submissions",
		],
		["AuthenticatedEimsReceiptsRoute", "AuthenticatedEimsReceiptsRouteImport", "./routes/_authenticated/eims/receipts", "/eims/receipts", "/eims/receipts"],
		["AuthenticatedEimsBulkRoute", "AuthenticatedEimsBulkRouteImport", "./routes/_authenticated/eims/bulk", "/eims/bulk", "/eims/bulk"],
		[
			"AuthenticatedEimsComplianceRoute",
			"AuthenticatedEimsComplianceRouteImport",
			"./routes/_authenticated/eims/compliance",
			"/eims/compliance",
			"/eims/compliance",
		],
	];
	const adminRoutes = [
		["AdminEimsIndexRoute", "AdminEimsIndexRouteImport", "./routes/admin/eims/index", "/eims/", "/eims/"],
		["AdminEimsTenantsRoute", "AdminEimsTenantsRouteImport", "./routes/admin/eims/tenants", "/eims/tenants", "/eims/tenants"],
		["AdminEimsFailuresRoute", "AdminEimsFailuresRouteImport", "./routes/admin/eims/failures", "/eims/failures", "/eims/failures"],
		[
			"AdminEimsCertificatesRoute",
			"AdminEimsCertificatesRouteImport",
			"./routes/admin/eims/certificates",
			"/eims/certificates",
			"/eims/certificates",
		],
		["AdminEimsResourcesRoute", "AdminEimsResourcesRouteImport", "./routes/admin/eims/resources", "/eims/resources", "/eims/resources"],
		["AdminEimsComplianceRoute", "AdminEimsComplianceRouteImport", "./routes/admin/eims/compliance", "/eims/compliance", "/eims/compliance"],
	];
	const routes = [...tenantRoutes, ...adminRoutes];

	if (!text.includes("AuthenticatedEimsIndexRouteImport")) {
		const imports = routes
			.map(([, importName, importPath]) => `import { Route as ${importName} } from '${importPath}'`)
			.join("\n");
		text = text.replace(
			"import { Route as AuthenticatedReportsDashboardMainRouteImport } from './routes/_authenticated/reports/dashboard.main'",
			`import { Route as AuthenticatedReportsDashboardMainRouteImport } from './routes/_authenticated/reports/dashboard.main'\n${imports}`,
		);
	}

	if (!text.includes("const AuthenticatedEimsIndexRoute =")) {
		const routeConstants = [
			...tenantRoutes.map(
				([routeName, importName, , id, routePath]) =>
					`const ${routeName} = ${importName}.update({\n  id: '${id}',\n  path: '${routePath}',\n  getParentRoute: () => AuthenticatedRoute,\n} as any)`,
			),
			...adminRoutes.map(
				([routeName, importName, , id, routePath]) =>
					`const ${routeName} = ${importName}.update({\n  id: '${id}',\n  path: '${routePath}',\n  getParentRoute: () => AdminRoute,\n} as any)`,
			),
		].join("\n");
		text = text.replace("\nexport interface FileRoutesByFullPath {", `\n${routeConstants}\n\nexport interface FileRoutesByFullPath {`);
	}

	const tenantInterface = tenantRoutes.map(([routeName]) => `  ${routeName}: typeof ${routeName}`).join("\n");
	const tenantChildren = tenantRoutes.map(([routeName]) => `  ${routeName}: ${routeName},`).join("\n");
	const adminInterface = adminRoutes.map(([routeName]) => `  ${routeName}: typeof ${routeName}`).join("\n");
	const adminChildren = adminRoutes.map(([routeName]) => `  ${routeName}: ${routeName},`).join("\n");

	if (!text.includes("AuthenticatedEimsIndexRoute: typeof AuthenticatedEimsIndexRoute")) {
		text = text.replace("interface AuthenticatedRouteChildren {\n", `interface AuthenticatedRouteChildren {\n${tenantInterface}\n`);
		text = text.replace(
			"const AuthenticatedRouteChildren: AuthenticatedRouteChildren = {\n",
			`const AuthenticatedRouteChildren: AuthenticatedRouteChildren = {\n${tenantChildren}\n`,
		);
	}

	if (!text.includes("AdminEimsIndexRoute: typeof AdminEimsIndexRoute")) {
		text = text.replace("interface AdminRouteChildren {\n", `interface AdminRouteChildren {\n${adminInterface}\n`);
		text = text.replace("const AdminRouteChildren: AdminRouteChildren = {\n", `const AdminRouteChildren: AdminRouteChildren = {\n${adminChildren}\n`);
	}

	await fs.writeFile(file, text, "utf8");
	return true;
};

const writeEimsPhase0Assets = async (root) => {
	await writeNew(
		path.join(root, "apps/api/prisma/eims-rls-policies.sql"),
		`-- EIMS tenant isolation policies.
-- Apply after Prisma migrations in PostgreSQL environments.

CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.current_organization_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
	SELECT NULLIF(current_setting('app.current_organization_id', true), '');
$$;

CREATE OR REPLACE FUNCTION app_private.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
	SELECT COALESCE(NULLIF(current_setting('app.is_platform_admin', true), ''), 'false')::boolean;
$$;

CREATE OR REPLACE FUNCTION app_private.eims_tenant_visible(row_organization_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
	SELECT app_private.is_platform_admin()
		OR row_organization_id = app_private.current_organization_id();
$$;

ALTER TABLE eims_enterprise ENABLE ROW LEVEL SECURITY;
ALTER TABLE eims_enterprise FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eims_enterprise_tenant_isolation ON eims_enterprise;
CREATE POLICY eims_enterprise_tenant_isolation ON eims_enterprise
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE eims_establishment ENABLE ROW LEVEL SECURITY;
ALTER TABLE eims_establishment FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eims_establishment_tenant_isolation ON eims_establishment;
CREATE POLICY eims_establishment_tenant_isolation ON eims_establishment
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE eims_source_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE eims_source_system FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eims_source_system_tenant_isolation ON eims_source_system;
CREATE POLICY eims_source_system_tenant_isolation ON eims_source_system
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE eims_credential ENABLE ROW LEVEL SECURITY;
ALTER TABLE eims_credential FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eims_credential_tenant_isolation ON eims_credential;
CREATE POLICY eims_credential_tenant_isolation ON eims_credential
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE eims_certificate ENABLE ROW LEVEL SECURITY;
ALTER TABLE eims_certificate FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eims_certificate_tenant_isolation ON eims_certificate;
CREATE POLICY eims_certificate_tenant_isolation ON eims_certificate
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE eims_source_system_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE eims_source_system_counter FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eims_source_system_counter_tenant_isolation ON eims_source_system_counter;
CREATE POLICY eims_source_system_counter_tenant_isolation ON eims_source_system_counter
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE eims_counter_reservation ENABLE ROW LEVEL SECURITY;
ALTER TABLE eims_counter_reservation FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eims_counter_reservation_tenant_isolation ON eims_counter_reservation;
CREATE POLICY eims_counter_reservation_tenant_isolation ON eims_counter_reservation
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE user_establishment_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_establishment_assignment FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_establishment_assignment_tenant_isolation ON user_establishment_assignment;
CREATE POLICY user_establishment_assignment_tenant_isolation ON user_establishment_assignment
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE user_source_system_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_source_system_assignment FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_source_system_assignment_tenant_isolation ON user_source_system_assignment;
CREATE POLICY user_source_system_assignment_tenant_isolation ON user_source_system_assignment
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE tenant_buyer ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_buyer FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_buyer_tenant_isolation ON tenant_buyer;
CREATE POLICY tenant_buyer_tenant_isolation ON tenant_buyer
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE tax_invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_invoice FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tax_invoice_tenant_isolation ON tax_invoice;
CREATE POLICY tax_invoice_tenant_isolation ON tax_invoice
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE tax_invoice_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_invoice_line FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tax_invoice_line_tenant_isolation ON tax_invoice_line;
CREATE POLICY tax_invoice_line_tenant_isolation ON tax_invoice_line
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE eims_submission ENABLE ROW LEVEL SECURITY;
ALTER TABLE eims_submission FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eims_submission_tenant_isolation ON eims_submission;
CREATE POLICY eims_submission_tenant_isolation ON eims_submission
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE eims_offline_pending_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE eims_offline_pending_sync FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eims_offline_pending_sync_tenant_isolation ON eims_offline_pending_sync;
CREATE POLICY eims_offline_pending_sync_tenant_isolation ON eims_offline_pending_sync
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE eims_bulk_callback_receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE eims_bulk_callback_receipt FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eims_bulk_callback_receipt_tenant_isolation ON eims_bulk_callback_receipt;
CREATE POLICY eims_bulk_callback_receipt_tenant_isolation ON eims_bulk_callback_receipt
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE eims_receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE eims_receipt FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eims_receipt_tenant_isolation ON eims_receipt;
CREATE POLICY eims_receipt_tenant_isolation ON eims_receipt
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE eims_cancellation ENABLE ROW LEVEL SECURITY;
ALTER TABLE eims_cancellation FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eims_cancellation_tenant_isolation ON eims_cancellation;
CREATE POLICY eims_cancellation_tenant_isolation ON eims_cancellation
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE eims_audit_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE eims_audit_event FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eims_audit_event_tenant_isolation ON eims_audit_event;
CREATE POLICY eims_audit_event_tenant_isolation ON eims_audit_event
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));

ALTER TABLE eims_notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE eims_notification_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eims_notification_log_tenant_isolation ON eims_notification_log;
CREATE POLICY eims_notification_log_tenant_isolation ON eims_notification_log
	USING (app_private.eims_tenant_visible("organizationId"))
	WITH CHECK (app_private.eims_tenant_visible("organizationId"));
`,
	);
	await writeNew(
		path.join(root, "apps/api/prisma/eims-audit-hash-chain.sql"),
		`-- EIMS append-only audit hash chain.
-- Apply after Prisma migrations in PostgreSQL environments.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.eims_set_audit_hash()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	previous_hash text;
BEGIN
	IF NEW."createdAt" IS NULL THEN
		NEW."createdAt" := now();
	END IF;

	SELECT "hash"
	INTO previous_hash
	FROM eims_audit_event
	WHERE "organizationId" = NEW."organizationId"
	ORDER BY "createdAt" DESC, id DESC
	LIMIT 1
	FOR UPDATE;

	NEW."prevHash" := previous_hash;
	NEW."hash" := encode(
		digest(
			concat_ws(
				'|',
				NEW."organizationId",
				COALESCE(previous_hash, ''),
				NEW."eventType",
				NEW."payloadJson"::text,
				NEW."createdAt"::text
			),
			'sha256'
		),
		'hex'
	);

	RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.eims_prevent_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'EIMS audit events are append-only and cannot be updated or deleted';
END;
$$;

DROP TRIGGER IF EXISTS trg_eims_audit_hash_chain ON eims_audit_event;
CREATE TRIGGER trg_eims_audit_hash_chain
	BEFORE INSERT ON eims_audit_event
	FOR EACH ROW
	EXECUTE FUNCTION app_private.eims_set_audit_hash();

DROP TRIGGER IF EXISTS trg_eims_audit_prevent_update ON eims_audit_event;
CREATE TRIGGER trg_eims_audit_prevent_update
	BEFORE UPDATE ON eims_audit_event
	FOR EACH ROW
	EXECUTE FUNCTION app_private.eims_prevent_audit_mutation();

DROP TRIGGER IF EXISTS trg_eims_audit_prevent_delete ON eims_audit_event;
CREATE TRIGGER trg_eims_audit_prevent_delete
	BEFORE DELETE ON eims_audit_event
	FOR EACH ROW
	EXECUTE FUNCTION app_private.eims_prevent_audit_mutation();
`,
	);
	await writeNew(
		path.join(root, "apps/api/scripts/phase0/layer-a/run-all.ts"),
		`import { createHash, createSign, generateKeyPairSync } from "node:crypto";

const payload = {
\tdocumentType: "INV",
\ttransactionType: "B2C",
\tdocumentNumber: "PHASE0-LOCAL-1",
\tdocumentDate: "2026-05-26T10:00:00+03:00",
};

const canonicalJson = JSON.stringify(payload);
const { privateKey } = generateKeyPairSync("rsa", {
\tmodulusLength: 2048,
\tprivateKeyEncoding: { type: "pkcs8", format: "pem" },
\tpublicKeyEncoding: { type: "spki", format: "pem" },
});

const signer = createSign("SHA512");
signer.update(canonicalJson, "utf8");
const signature = signer.sign(privateKey, "base64");
const payloadHash = createHash("sha256").update(canonicalJson).digest("hex");

console.log(JSON.stringify({ ok: true, canonicalJson, payloadHash, signatureLength: signature.length }, null, 2));
`,
	);
	await writeNew(
		path.join(root, "apps/api/scripts/eims-sdk-contract.ts"),
		`import {
\tbuildEimsSdkOptions,
\tcreateEimsSdkClientFromModule,
\tDEFAULT_EIMS_SDK_PACKAGE_NAME,
\tgetEimsSdkPackageName,
} from "../src/modules/eims/shared/client/eims-sdk-client.provider";

const placeholderPattern = /change-me|replace-with|example|yourcompany/i;

const config = {
\tget: <T = string>(key: string, fallback?: T) => {
\t\tconst value = process.env[key];
\t\treturn (value === undefined || value === "" ? fallback : value) as T;
\t},
};

const packageName = getEimsSdkPackageName(config);
if (packageName === DEFAULT_EIMS_SDK_PACKAGE_NAME || placeholderPattern.test(packageName)) {
\tconsole.error(
\t\tJSON.stringify(
\t\t\t{
\t\t\t\tok: false,
\t\t\t\tpackageName,
\t\t\t\terror: "Set EIMS_SDK_PACKAGE_NAME to the published SDK package before running the contract check.",
\t\t\t},
\t\t\tnull,
\t\t\t2,
\t\t),
\t);
\tprocess.exit(1);
}

const main = async () => {
\tconst options = buildEimsSdkOptions(config);
\tconst sdkModule = await import(packageName);
\tconst client = await createEimsSdkClientFromModule(sdkModule, options);
\tconst capabilities = {
\t\tregisterInvoice: typeof client.registerInvoice === "function",
\t\tregisterReceipt: typeof client.registerReceipt === "function",
\t\tverifyIrn: typeof client.verifyIrn === "function",
\t\tsubmitBulk:
\t\t\ttypeof client.submitBulk === "function" ||
\t\t\ttypeof client.submitBulkInvoices === "function" ||
\t\t\ttypeof client.registerBulkInvoices === "function" ||
\t\t\ttypeof client.submitBulkDocuments === "function",
\t\tpollBulkStatus:
\t\t\ttypeof client.pollBulkStatus === "function" ||
\t\t\ttypeof client.pollBulkConversation === "function" ||
\t\t\ttypeof client.getBulkStatus === "function" ||
\t\t\ttypeof client.getBulkConversationStatus === "function",
\t\tcancelInvoice:
\t\t\ttypeof client.cancelInvoice === "function" ||
\t\t\ttypeof client.cancelDocument === "function" ||
\t\t\ttypeof client.cancelTaxInvoice === "function" ||
\t\t\ttypeof client.submitCancellation === "function",
\t\tvalidateCredential:
\t\t\ttypeof client.validateCredential === "function" || typeof client.validateCredentials === "function",
\t};
\tconst missingCapabilities = Object.entries(capabilities)
\t\t.filter(([, available]) => !available)
\t\t.map(([capability]) => capability);
\tif (missingCapabilities.length > 0) {
\t\tthrow new Error(\`SDK client is missing required capabilities: \${missingCapabilities.join(", ")}\`);
\t}

\tconsole.log(
\t\tJSON.stringify(
\t\t\t{
\t\t\t\tok: true,
\t\t\t\tpackageName,
\t\t\t\toptions: {
\t\t\t\t\tenvironment: options.environment,
\t\t\t\t\tapiUrlConfigured: Boolean(options.apiUrl),
\t\t\t\t\tbaseUrlConfigured: Boolean(options.baseUrl),
\t\t\t\t\tbulkUrlConfigured: Boolean(options.bulkUrl),
\t\t\t\t\tcallbackPublicUrlConfigured: Boolean(options.callbackPublicUrl),
\t\t\t\t\ttimeoutMs: options.timeoutMs,
\t\t\t\t\tmaxRetries: options.maxRetries,
\t\t\t\t\tqueuePrefix: options.queuePrefix,
\t\t\t\t},
\t\t\t\tcapabilities,
\t\t\t},
\t\t\tnull,
\t\t\t2,
\t\t),
\t);
};

main().catch((error) => {
\tconsole.error(
\t\tJSON.stringify(
\t\t\t{
\t\t\t\tok: false,
\t\t\t\tpackageName,
\t\t\t\terror: error instanceof Error ? error.message : "EIMS SDK contract check failed",
\t\t\t},
\t\t\tnull,
\t\t\t2,
\t\t),
\t);
\tprocess.exit(1);
});
`,
	);
	await writeIfMissing(
		path.join(root, "apps/api-tests/bruno/EIMS-Phase0/collection.bru"),
		`meta {
  name: EIMS Phase 0
  type: collection
}
`,
	);
	await writeIfMissing(
		path.join(
			root,
			"apps/api-tests/bruno/EIMS-Phase0/environments/sandbox.example.env",
		),
		`# Copy these values into your Bruno environment after INSA sandbox onboarding.
EIMS_SANDBOX_URL=
EIMS_TIN=
EIMS_CLIENT_ID=
EIMS_CLIENT_SECRET=
EIMS_API_KEY=
`,
	);
	await writeNew(
		path.join(root, "apps/acceptance/features/eims.feature"),
		`Feature: EIMS compliance scaffold
  Scenario: Tenant configures source before invoice submission
    Given an organization has an EIMS enterprise
    And an establishment exists
    And a source system is approved
    When an invoice is submitted
    Then the invoice uses the source system counter and previous IRN chain
`,
	);
	await writeNew(
		path.join(root, "apps/acceptance/steps/eims.steps.mjs"),
		`import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";

const state = (world) => {
\tworld.eims ??= {};
\treturn world.eims;
};

Given("an organization has an EIMS enterprise", function () {
\tconst eims = state(this);
\teims.enterprise = {
\t\tid: "ent_acceptance",
\t\torganizationId: "org_acceptance",
\t\ttin: "0074136947",
\t\tlegalName: "Acceptance Restaurant PLC",
\t};
});

Given("an establishment exists", function () {
\tconst eims = state(this);
\tassert.ok(eims.enterprise, "EIMS enterprise must be configured before adding an establishment");
\teims.establishment = {
\t\tid: "est_acceptance",
\t\tenterpriseId: eims.enterprise.id,
\t\tsubTin: \`\${eims.enterprise.tin}-01\`,
\t\tname: "Bole Branch",
\t};
});

Given("a source system is approved", function () {
\tconst eims = state(this);
\tassert.ok(eims.establishment, "EIMS establishment must exist before source approval");
\teims.source = {
\t\tid: "src_acceptance",
\t\testablishmentId: eims.establishment.id,
\t\tapprovalStatus: "approved",
\t\tlastAcceptedCounter: 128,
\t\tlastIrn: "ACCEPTANCE-IRN-000128",
\t};
});

When("an invoice is submitted", function () {
\tconst eims = state(this);
\tassert.equal(eims.source?.approvalStatus, "approved", "source system must be approved before submission");
\teims.submission = {
\t\tdocumentNumber: "ACC-INV-000129",
\t\tsourceSystemId: eims.source.id,
\t\tcounter: eims.source.lastAcceptedCounter + 1,
\t\tpreviousIrn: eims.source.lastIrn,
\t\tstatus: "accepted",
\t\tirn: "ACCEPTANCE-IRN-000129",
\t};
});

Then("the invoice uses the source system counter and previous IRN chain", function () {
\tconst eims = state(this);
\tassert.equal(eims.submission?.sourceSystemId, eims.source?.id);
\tassert.equal(eims.submission?.counter, 129);
\tassert.equal(eims.submission?.previousIrn, "ACCEPTANCE-IRN-000128");
\tassert.equal(eims.submission?.status, "accepted");
});
`,
	);
	await writeNew(
		path.join(root, "apps/performance/k6/eims-submit.js"),
		`import { check } from "k6";
import http from "k6/http";

export const options = {
\tvus: Number(__ENV.K6_VUS || 2),
\tduration: __ENV.K6_DURATION || "10s",
\tthresholds: {
\t\thttp_req_failed: ["rate<0.01"],
\t\thttp_req_duration: ["p(95)<1000"],
\t},
};

const baseUrl = __ENV.K6_TARGET || __ENV.API_BASE_URL || "http://127.0.0.1:3000";
const endpoints = [
\t"/api/v1/eims/overview",
\t"/api/v1/eims/workspace",
\t"/api/v1/eims/submissions",
\t"/api/v1/eims/bulk",
\t"/api/v1/eims/compliance/evidence",
\t"/api/v1/admin/eims/overview",
];

export default function () {
\tfor (const endpoint of endpoints) {
\t\tconst res = http.get(\`\${baseUrl}\${endpoint}\`);
\t\tcheck(res, {
\t\t\t[\`\${endpoint} responds\`]: (r) => r.status >= 200 && r.status < 500,
\t\t\t[\`\${endpoint} returns json\`]: (r) => String(r.headers["Content-Type"] || "").includes("application/json"),
\t\t});
\t}
}
`,
	);
	await writeNew(
		path.join(root, "apps/performance/scripts/eims-mock-load.mjs"),
		`import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "../../..");
const mockServerPath = path.join(workspaceRoot, "apps/api-tests/scripts/eims-mock-api-server.mjs");
const port = Number(process.env.EIMS_PERFORMANCE_MOCK_PORT || 4317);
const baseUrl = process.env.EIMS_PERFORMANCE_BASE_URL || \`http://127.0.0.1:\${port}\`;
const requestCount = Number(process.env.EIMS_PERFORMANCE_REQUESTS || 48);
const concurrency = Math.max(1, Number(process.env.EIMS_PERFORMANCE_CONCURRENCY || 8));
const p95ThresholdMs = Number(process.env.EIMS_PERFORMANCE_P95_MS || 1000);
const maxErrorRate = Number(process.env.EIMS_PERFORMANCE_MAX_ERROR_RATE || 0.01);

let serverProcess = null;

const percentile = (values, targetPercentile) => {
\tif (values.length === 0) return 0;
\tconst sorted = [...values].sort((a, b) => a - b);
\tconst index = Math.ceil((targetPercentile / 100) * sorted.length) - 1;
\treturn sorted[Math.max(0, Math.min(sorted.length - 1, index))];
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const startMockServer = async () => {
\tif (process.env.EIMS_PERFORMANCE_BASE_URL) return;
\tif (!existsSync(mockServerPath)) {
\t\tthrow new Error(\`EIMS mock API server is missing at \${mockServerPath}\`);
\t}
\tserverProcess = spawn(process.execPath, [mockServerPath], {
\t\tcwd: workspaceRoot,
\t\tstdio: ["ignore", "pipe", "pipe"],
\t\tenv: { ...process.env, MOCK_API_PORT: String(port) },
\t});
\tserverProcess.stdout.on("data", (chunk) => process.stdout.write(chunk));
\tserverProcess.stderr.on("data", (chunk) => process.stderr.write(chunk));
};

const waitForServer = async () => {
\tfor (let attempt = 0; attempt < 40; attempt += 1) {
\t\ttry {
\t\t\tconst response = await fetch(\`\${baseUrl}/api/v1/eims/overview\`);
\t\t\tif (response.ok) return;
\t\t} catch {
\t\t\t// keep waiting for the local mock server
\t\t}
\t\tawait sleep(100);
\t}
\tthrow new Error(\`EIMS mock API did not become ready at \${baseUrl}\`);
};

const scenarios = [
\t{
\t\tmethod: "GET",
\t\tpath: "/api/v1/eims/overview",
\t\tassert: (body) => typeof body.data?.stats?.pendingOffline === "number",
\t},
\t{
\t\tmethod: "GET",
\t\tpath: "/api/v1/eims/workspace",
\t\tassert: (body) => Array.isArray(body.data?.readiness?.steps),
\t},
\t{
\t\tmethod: "GET",
\t\tpath: "/api/v1/eims/submissions",
\t\tassert: (body) => Array.isArray(body.data) && body.data.some((row) => row.documentNumber),
\t},
\t{
\t\tmethod: "POST",
\t\tpath: "/api/v1/eims/submissions",
\t\tbody: { documentNumber: "PERF-MOCK-001", sourceSystemId: "src_mock_1", payload: { total: "100.00" } },
\t\tassert: (body) => Boolean(body.data?.irn) && body.data?.status === "accepted",
\t},
\t{
\t\tmethod: "GET",
\t\tpath: "/api/v1/eims/bulk",
\t\tassert: (body) =>
\t\t\tArray.isArray(body.data) &&
\t\t\tbody.data[0].submitted === body.data[0].accepted + body.data[0].failed + body.data[0].pending,
\t},
\t{
\t\tmethod: "POST",
\t\tpath: "/api/v1/eims/bulk/reconcile",
\t\tbody: { conversationId: "TEST-CONV-20260526-001" },
\t\tassert: (body) => body.data?.status === "scheduled" && body.data?.reference === "TEST-CONV-20260526-001",
\t},
\t{
\t\tmethod: "GET",
\t\tpath: "/api/v1/eims/compliance/evidence",
\t\tassert: (body) => Number(body.data?.readiness ?? -1) >= 0 && Array.isArray(body.data?.items),
\t},
\t{
\t\tmethod: "GET",
\t\tpath: "/api/v1/admin/eims/overview",
\t\tassert: (body) => (body.data?.tenantsTotal ?? 0) >= 1 && Array.isArray(body.data?.latestFailures),
\t},
];

const requestScenario = async (scenario) => {
\tconst startedAt = performance.now();
\tconst response = await fetch(\`\${baseUrl}\${scenario.path}\`, {
\t\tmethod: scenario.method,
\t\theaders: scenario.body ? { "content-type": "application/json" } : undefined,
\t\tbody: scenario.body ? JSON.stringify(scenario.body) : undefined,
\t});
\tconst text = await response.text();
\tlet body = {};
\ttry {
\t\tbody = text ? JSON.parse(text) : {};
\t} catch {
\t\tthrow new Error(\`\${scenario.method} \${scenario.path} returned non-JSON response\`);
\t}
\tif (response.status < 200 || response.status >= 500) {
\t\tthrow new Error(\`\${scenario.method} \${scenario.path} returned \${response.status}\`);
\t}
\tif (!scenario.assert(body)) {
\t\tthrow new Error(\`\${scenario.method} \${scenario.path} returned unexpected payload\`);
\t}
\treturn performance.now() - startedAt;
};

const runLoad = async () => {
\tconst latencies = [];
\tlet failed = 0;
\tlet cursor = 0;

\tconst worker = async () => {
\t\twhile (cursor < requestCount) {
\t\t\tconst index = cursor;
\t\t\tcursor += 1;
\t\t\tconst scenario = scenarios[index % scenarios.length];
\t\t\ttry {
\t\t\t\tlatencies.push(await requestScenario(scenario));
\t\t\t} catch (error) {
\t\t\t\tfailed += 1;
\t\t\t\tconsole.error(error instanceof Error ? error.message : String(error));
\t\t\t}
\t\t}
\t};

\tawait Promise.all(Array.from({ length: Math.min(concurrency, requestCount) }, () => worker()));
\tconst p95 = percentile(latencies, 95);
\tconst errorRate = requestCount === 0 ? 1 : failed / requestCount;
\tconsole.log(
\t\t\`EIMS performance smoke: requests=\${requestCount} failed=\${failed} errorRate=\${errorRate.toFixed(3)} p95=\${p95.toFixed(1)}ms\`,
\t);
\tif (errorRate >= maxErrorRate) {
\t\tthrow new Error(\`error rate \${errorRate.toFixed(3)} exceeded max \${maxErrorRate}\`);
\t}
\tif (p95 >= p95ThresholdMs) {
\t\tthrow new Error(\`p95 \${p95.toFixed(1)}ms exceeded threshold \${p95ThresholdMs}ms\`);
\t}
};

try {
\tawait startMockServer();
\tawait waitForServer();
\tawait runLoad();
} finally {
\tif (serverProcess) serverProcess.kill();
}
`,
	);
	await writeNew(
		path.join(root, "apps/security/scripts/eims-security-smoke.mjs"),
		`import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { repoRoot } from "./lib.mjs";

const failures = [];
const eimsRoot = path.join(repoRoot, "apps/api/src/modules/eims");

const fail = (message) => failures.push(message);
const rel = (fullPath) => path.relative(repoRoot, fullPath).replaceAll("\\\\", "/");
const read = (relPath) => readFileSync(path.join(repoRoot, relPath), "utf8");

const assertIncludes = (text, needle, message) => {
\tif (!text.includes(needle)) fail(message);
};

const walkFiles = (dir, predicate, out = []) => {
\tif (!existsSync(dir)) return out;
\tfor (const entry of readdirSync(dir)) {
\t\tconst fullPath = path.join(dir, entry);
\t\tconst stat = statSync(fullPath);
\t\tif (stat.isDirectory()) {
\t\t\tif (["node_modules", "dist", "coverage", "generated"].includes(entry)) continue;
\t\t\twalkFiles(fullPath, predicate, out);
\t\t} else if (predicate(fullPath)) {
\t\t\tout.push(fullPath);
\t\t}
\t}
\treturn out;
};

if (!existsSync(eimsRoot)) {
\tconsole.log("EIMS security smoke skipped because the EIMS starter is not installed.");
\tprocess.exit(0);
}

const controllerFiles = walkFiles(eimsRoot, (file) => file.endsWith(".controller.ts"));
for (const file of controllerFiles) {
\tconst relative = rel(file);
\tconst text = readFileSync(file, "utf8");
\tconst isAdminController =
\t\trelative.includes("/admin/") || relative.includes("/compliance/presentation/eims-acceptance");
\tconst isAuthorityCallbackController = relative.includes("/shared/callbacks/");

\tif (isAuthorityCallbackController) {
\t\tassertIncludes(text, 'Headers("x-eims-signature")', \`\${relative} must verify callback signatures\`);
\t\tassertIncludes(text, 'Headers("x-eims-timestamp")', \`\${relative} must verify callback timestamps\`);
\t\tassertIncludes(text, "knownConversationIds", \`\${relative} must bind callbacks to known conversations\`);
\t} else if (isAdminController) {
\t\tassertIncludes(text, "SuperAdminGuard", \`\${relative} must require the platform super-admin guard\`);
\t\tassertIncludes(text, "@UseGuards(SuperAdminGuard)", \`\${relative} must bind the platform super-admin guard\`);
\t} else {
\t\tassertIncludes(text, "AuthGuard", \`\${relative} must require tenant authentication\`);
\t\tassertIncludes(text, "PermissionsGuard", \`\${relative} must require tenant permission checks\`);
\t\tassertIncludes(text, "@UseGuards(AuthGuard, PermissionsGuard)", \`\${relative} must bind auth and permission guards\`);
\t\tconst endpoints = text.match(/@(Get|Post|Put|Patch|Delete)\\(/g) ?? [];
\t\tconst permissions = text.match(/@RequirePermissions\\(/g) ?? [];
\t\tif (permissions.length < endpoints.length) {
\t\t\tfail(\`\${relative} has EIMS endpoints without matching @RequirePermissions decorators\`);
\t\t}
\t}
}

const supportingController = read(
\t"apps/api/src/modules/eims/shared/presentation/eims-supporting-resources.controller.ts",
);
for (const [needle, message] of [
\t['@RequirePermissions("eims-credential:read")', "EIMS credential reads must be permission protected"],
\t['@RequirePermissions("eims-credential:create")', "EIMS credential writes/tests must be permission protected"],
\t['@RequirePermissions("eims-credential:rotate")', "EIMS credential rotation must require rotate permission"],
\t['@RequirePermissions("eims-certificate:read")', "EIMS certificate reads must be permission protected"],
\t['@RequirePermissions("eims-certificate:import")', "EIMS certificate import/CSR must be permission protected"],
\t['@RequirePermissions("eims-bulk:create")', "EIMS bulk submission must be permission protected"],
\t['@RequirePermissions("eims-bulk:retry")', "EIMS bulk reconcile must require retry permission"],
\t['@RequirePermissions("eims-compliance:export")', "EIMS compliance evidence export must be permission protected"],
]) {
\tassertIncludes(supportingController, needle, message);
}

const mockService = read("apps/api/src/modules/eims/shared/mock/eims-mock.service.ts");
assertIncludes(
\tmockService,
\t"secretsReturned: false",
\t"EIMS credential APIs must explicitly report secrets as redacted",
);
assertIncludes(
\tmockService,
\t"apiKeyConfigured",
\t"EIMS credential APIs should expose configured flags instead of API keys",
);
assertIncludes(
\tmockService,
\t"clientSecretConfigured",
\t"EIMS credential APIs should expose configured flags instead of client secrets",
);
assertIncludes(
\tmockService,
\t"refreshTokenConfigured",
\t"EIMS credential APIs should expose configured flags instead of refresh tokens",
);
for (const secretField of ["apiKey", "password", "clientSecret", "refreshToken", "privateKey"]) {
\tconst rawSecretProperty = new RegExp(\`\\\\b\${secretField}\\\\s*:\`);
\tif (rawSecretProperty.test(mockService)) {
\t\tfail(\`EIMS mock responses must not expose raw \${secretField} properties\`);
\t}
}

const credentialPersistence = read("apps/api/src/modules/eims/shared/crypto/eims-credential-persistence.service.ts");
const credentialValidation = read("apps/api/src/modules/eims/shared/crypto/eims-credential-validation.service.ts");
assertIncludes(credentialPersistence, "PrismaService", "EIMS credentials must persist through Prisma");
assertIncludes(credentialPersistence, "eimsCredential.create", "EIMS credential persistence must create durable rows");
assertIncludes(credentialPersistence, "eimsCredential.update", "EIMS credential persistence must update durable rows");
assertIncludes(
\tcredentialPersistence,
\t"Buffer.from(encrypted",
\t"EIMS credential persistence must store encrypted bytes",
);
assertIncludes(
\tcredentialPersistence,
\t"secretsReturned: false",
\t"EIMS credential persistence must redact secret responses",
);
assertIncludes(
\tcredentialPersistence,
\t"credentialForValidation",
\t"EIMS credentials must expose SDK validation material",
);
assertIncludes(
\tcredentialPersistence,
\t"this.cipher.decrypt",
\t"EIMS credential validation must decrypt only inside the API",
);
assertIncludes(
\tcredentialValidation,
\t"EIMS_EXTERNAL_CLIENT",
\t"EIMS credential validation must use the SDK client boundary",
);
assertIncludes(credentialValidation, "validateCredential", "EIMS credential validation must delegate to the SDK");
assertIncludes(
\tsupportingController,
\t"credentialValidation.testCredential",
\t"EIMS credential test endpoint must use SDK-bound credential validation",
);

const apiMockTests = read("apps/api-tests/tests/eims-v3-mock.spec.ts");
for (const secretField of ["apiKey", "password", "clientSecret", "refreshToken"]) {
\tassertIncludes(
\t\tapiMockTests,
\t\t\`not.toHaveProperty("\${secretField}")\`,
\t\t\`EIMS API mock tests must prove \${secretField} is not returned\`,
\t);
}
assertIncludes(apiMockTests, "secretsReturned: false", "EIMS API mock tests must prove credential redaction status");
assertIncludes(
\tapiMockTests,
\t"/api/v1/eims/bulk/reconcile",
\t"EIMS API mock tests must cover bulk callback reconciliation flow",
);

const callbackService = read("apps/api/src/modules/eims/shared/callbacks/eims-bulk-callback.service.ts");
assertIncludes(callbackService, "timingSafeEqual", "EIMS bulk callbacks must use constant-time signature checks");
assertIncludes(callbackService, "EIMS_CALLBACK_HMAC_SECRET", "EIMS bulk callbacks must require an HMAC secret");
assertIncludes(callbackService, "outside the allowed skew", "EIMS bulk callbacks must enforce replay windows");

const bulkSubmission = read("apps/api/src/modules/eims/shared/bulk/eims-bulk-submission.service.ts");
const callbackPersistence = read(
\t"apps/api/src/modules/eims/shared/callbacks/eims-bulk-callback-persistence.service.ts",
);
const callbackPolling = read("apps/api/src/modules/eims/shared/callbacks/eims-bulk-reconciliation-polling.service.ts");
const callbackScheduler = read(
\t"apps/api/src/modules/eims/shared/callbacks/eims-bulk-reconciliation-scheduler.service.ts",
);
const bulkReconciliationQueue = read(
\t"apps/api/src/modules/eims/shared/queues/eims-bulk-reconciliation-queue.service.ts",
);
const cancellationService = read("apps/api/src/modules/eims/shared/cancellations/eims-cancellation.service.ts");
assertIncludes(callbackPersistence, "PrismaService", "EIMS bulk callback receipts must use durable Prisma persistence");
assertIncludes(
\tcallbackPersistence,
\t"eimsBulkCallbackReceipt.create",
\t"EIMS bulk callback receipts must create durable rows",
);
assertIncludes(
\tcallbackPersistence,
\t"Buffer.from(this.cipher.encrypt",
\t"EIMS bulk callback receipts must store encrypted payload bytes",
);
assertIncludes(
\tcallbackPersistence,
\t"duplicateCount: { increment: 1 }",
\t"EIMS bulk callback receipts must persist duplicate retry counts",
);
assertIncludes(
\tcallbackPersistence,
\t"storePolledReconciliation",
\t"EIMS bulk callback receipts must store SDK-polled reconciliation rows",
);
assertIncludes(
\tcallbackPersistence,
\t"storeSubmittedBatch",
\t"EIMS bulk submission must seed durable polling conversations",
);
assertIncludes(
\tcallbackPersistence,
\t"listPendingPollingConversations",
\t"EIMS bulk polling scheduler must scan durable pending conversations",
);
assertIncludes(callbackPolling, "EIMS_EXTERNAL_CLIENT", "EIMS bulk polling must use the SDK adapter boundary");
assertIncludes(callbackPolling, "pollBulkStatus", "EIMS bulk polling must call SDK bulk status capability");
assertIncludes(
\tcallbackPolling,
\t"storePolledReconciliation",
\t"EIMS bulk polling must persist durable reconciliation receipts",
);
assertIncludes(bulkSubmission, "EIMS_EXTERNAL_CLIENT", "EIMS bulk submission must use the SDK adapter boundary");
assertIncludes(bulkSubmission, "submitBulk", "EIMS bulk submission must call SDK bulk submit capability");
assertIncludes(bulkSubmission, "storeSubmittedBatch", "EIMS bulk submission must create a durable polling seed");
assertIncludes(callbackScheduler, "@Cron", "EIMS bulk reconciliation scheduler must have scheduled cadence");
assertIncludes(
\tcallbackScheduler,
\t"EIMS_BULK_RECONCILIATION_SCHEDULER_ENABLED",
\t"EIMS bulk reconciliation scheduler must be explicitly enabled",
);
assertIncludes(
\tcallbackScheduler,
\t"enqueueReconciliation",
\t"EIMS bulk reconciliation scheduler must enqueue worker jobs",
);
assertIncludes(bulkReconciliationQueue, "Worker", "EIMS bulk reconciliation queue must register a BullMQ worker");
assertIncludes(
\tbulkReconciliationQueue,
\t"pollConversation",
\t"EIMS bulk reconciliation queue must process jobs through SDK-bound polling",
);
assertIncludes(cancellationService, "EIMS_EXTERNAL_CLIENT", "EIMS cancellation must use the SDK adapter boundary");
assertIncludes(cancellationService, "cancelInvoice", "EIMS cancellation must call SDK cancellation capability");
assertIncludes(
\tcancellationService,
\t"Reason code 4 requires a remark",
\t"EIMS cancellation must validate reason-code remarks before SDK dispatch",
);

const offlinePersistence = read(
\t"apps/api/src/modules/eims/shared/offline/eims-offline-pending-sync-persistence.service.ts",
);
assertIncludes(offlinePersistence, "PrismaService", "EIMS offline pending sync must use durable Prisma persistence");
assertIncludes(
\tofflinePersistence,
\t"eimsOfflinePendingSync.upsert",
\t"EIMS offline pending sync must upsert durable encrypted rows",
);
assertIncludes(
\tofflinePersistence,
\t"Buffer.from(this.cipher.encrypt",
\t"EIMS offline pending sync must store encrypted payload bytes",
);
assertIncludes(
\tofflinePersistence,
\t'syncStatus: "poisoned"',
\t"EIMS offline pending sync must poison durable tampered payloads",
);

const offlineReplay = read("apps/api/src/modules/eims/shared/offline/eims-offline-replay.service.ts");
const offlineReplayScheduler = read(
	"apps/api/src/modules/eims/shared/offline/eims-offline-replay-scheduler.service.ts",
);
assertIncludes(
\tofflineReplay,
\t"EIMS_EXTERNAL_CLIENT",
\t"EIMS offline replay must dispatch through the SDK adapter boundary",
);
assertIncludes(offlineReplay, "claimForSync", "EIMS offline replay must claim durable pending rows before dispatch");
assertIncludes(offlineReplay, "registerInvoice", "EIMS offline replay must submit claimed invoices through the client");
assertIncludes(offlineReplay, "markSynced", "EIMS offline replay must mark accepted offline invoices synced");
assertIncludes(offlineReplay, "markRetryableFailure", "EIMS offline replay must preserve failed rows for retry");
assertIncludes(offlineReplayScheduler, "@Cron", "EIMS offline replay must have scheduled replay cadence");
assertIncludes(
	offlineReplayScheduler,
	"EIMS_OFFLINE_REPLAY_SCHEDULER_ENABLED",
	"EIMS offline replay scheduler must be explicitly enabled",
);
assertIncludes(
	offlineReplayScheduler,
	"listPendingOrganizations",
	"EIMS offline replay scheduler must scan durable pending organizations",
);
assertIncludes(
	offlineReplayScheduler,
	"enqueueReplay",
	"EIMS offline replay scheduler must enqueue worker jobs instead of direct authority calls",
);

const queuePersistence = read("apps/api/src/modules/eims/shared/queues/eims-submission-queue-persistence.service.ts");
const sourceLock = read("apps/api/src/modules/eims/shared/queues/eims-submission-source-lock.service.ts");
const offlineReplayQueue = read("apps/api/src/modules/eims/shared/queues/eims-offline-replay-queue.service.ts");
assertIncludes(queuePersistence, "PrismaService", "EIMS queue reservations must use durable Prisma persistence");
assertIncludes(
	queuePersistence,
	"eimsSourceSystemCounter.upsert",
	"EIMS source counter state must be persisted durably",
);
assertIncludes(
	queuePersistence,
	"eimsCounterReservation.upsert",
	"EIMS queue reservations must be persisted before SDK dispatch",
);
assertIncludes(
	queuePersistence,
	"loadSourceState",
	"EIMS queues must hydrate counters from durable state after restart",
);
assertIncludes(sourceLock, "IORedis", "EIMS submission source locks must use Redis for multi-node safety");
assertIncludes(
	sourceLock,
	"EIMS_SUBMISSION_DISTRIBUTED_LOCKS",
	"EIMS distributed source locks must be explicitly enabled",
);
assertIncludes(sourceLock, '"PX"', "EIMS distributed source locks must use bounded Redis TTLs");
assertIncludes(sourceLock, '"NX"', "EIMS distributed source locks must use exclusive Redis acquisition");
assertIncludes(sourceLock, "pexpire", "EIMS distributed source locks must renew long SDK dispatches");

const submissionQueue = read("apps/api/src/modules/eims/shared/queues/eims-submission-queue.service.ts");
assertIncludes(
	submissionQueue,
	"withSourceLock",
	"EIMS submission queue must wrap reservations and SDK dispatch in the source lock",
);
assertIncludes(
	submissionQueue,
	"recordReservation",
	"EIMS submission queue must record reservations before SDK dispatch",
);
assertIncludes(submissionQueue, "markAccepted", "EIMS submission queue must persist accepted counter outcomes");
assertIncludes(
	submissionQueue,
	"persistenceStatus",
	"EIMS submission metadata must report durable reservation outcome status",
);
assertIncludes(offlineReplayQueue, "Worker", "EIMS offline replay must register a BullMQ worker");
assertIncludes(offlineReplayQueue, "EIMS_WORKERS_ENABLED", "EIMS offline replay workers must be explicitly enabled");
assertIncludes(
	offlineReplayQueue,
	"processReplayJob",
	"EIMS offline replay queue must process jobs through the replay service",
);

const sdkExternalClient = read("apps/api/src/modules/eims/shared/client/eims-sdk-external.client.ts");
const sdkClientProvider = read("apps/api/src/modules/eims/shared/client/eims-sdk-client.provider.ts");
assertIncludes(
\tsdkExternalClient,
\t"EIMS_SDK_CLIENT",
\t"EIMS production integration must use the EIMS SDK injection token",
);
assertIncludes(sdkClientProvider, "EIMS_SDK_PACKAGE_NAME", "EIMS SDK provider must load the configured SDK package");
assertIncludes(sdkClientProvider, "createEimsSdkClientFromModule", "EIMS SDK provider must validate SDK module shape");
assertIncludes(
\tsdkClientProvider,
\t"registerInvoice/registerReceipt/verifyIrn/validateCredential/submitBulk/pollBulkStatus/cancelInvoice-capable",
\t"EIMS SDK provider must fail closed for incompatible SDK clients",
);
assertIncludes(sdkExternalClient, "registerInvoice", "EIMS SDK adapter must submit invoices through the SDK");
assertIncludes(sdkExternalClient, "registerReceipt", "EIMS SDK adapter must submit receipts through the SDK");
assertIncludes(sdkExternalClient, "verifyIrn", "EIMS SDK adapter must verify IRNs through the SDK");
assertIncludes(sdkExternalClient, "validateCredential", "EIMS SDK adapter must validate credentials through the SDK");
assertIncludes(sdkExternalClient, "submitBulk", "EIMS SDK adapter must submit bulk invoices through the SDK");
assertIncludes(sdkExternalClient, "pollBulkStatus", "EIMS SDK adapter must poll bulk status through the SDK");
assertIncludes(sdkExternalClient, "cancelInvoice", "EIMS SDK adapter must cancel invoices through the SDK");
assertIncludes(
\tsdkExternalClient,
\t"ServiceUnavailableException",
\t"EIMS SDK adapter must fail closed when SDK wiring is missing",
);

const rlsPolicies = read("apps/api/prisma/eims-rls-policies.sql");
for (const table of [
\t"eims_enterprise",
\t"eims_establishment",
\t"eims_source_system",
\t"eims_credential",
\t"eims_certificate",
\t"eims_source_system_counter",
\t"eims_counter_reservation",
\t"user_establishment_assignment",
\t"user_source_system_assignment",
\t"tenant_buyer",
\t"tax_invoice",
\t"tax_invoice_line",
\t"eims_submission",
\t"eims_offline_pending_sync",
\t"eims_bulk_callback_receipt",
\t"eims_receipt",
\t"eims_cancellation",
\t"eims_audit_event",
\t"eims_notification_log",
]) {
\tassertIncludes(rlsPolicies, \`ALTER TABLE \${table} ENABLE ROW LEVEL SECURITY\`, \`\${table} must enable RLS\`);
\tassertIncludes(rlsPolicies, \`ALTER TABLE \${table} FORCE ROW LEVEL SECURITY\`, \`\${table} must force RLS\`);
}
assertIncludes(rlsPolicies, "app.current_organization_id", "EIMS RLS policies must bind to tenant context");
assertIncludes(rlsPolicies, "WITH CHECK", "EIMS RLS policies must protect writes as well as reads");

const auditHashChain = read("apps/api/prisma/eims-audit-hash-chain.sql");
assertIncludes(auditHashChain, "CREATE EXTENSION IF NOT EXISTS pgcrypto", "EIMS audit hash chain must use pgcrypto");
assertIncludes(auditHashChain, "trg_eims_audit_hash_chain", "EIMS audit hash chain trigger must be installed");
assertIncludes(auditHashChain, "BEFORE INSERT ON eims_audit_event", "EIMS audit hash must be assigned before insert");
assertIncludes(auditHashChain, "FOR UPDATE", "EIMS audit hash chain must lock previous event while linking hashes");
assertIncludes(auditHashChain, "BEFORE UPDATE ON eims_audit_event", "EIMS audit events must block updates");
assertIncludes(auditHashChain, "BEFORE DELETE ON eims_audit_event", "EIMS audit events must block deletes");

const acceptanceTests = read("apps/api-tests/tests/eims-acceptance.spec.ts");
assertIncludes(
\tacceptanceTests,
\t'"/api/v1/eims/acceptance/cases"',
\t"EIMS acceptance cases must stay admin-only in API tests",
);
assertIncludes(
\tacceptanceTests,
\t"expect(tenantResponse.status()).toBe(404)",
\t"Tenant routes must not expose admin acceptance cases",
);

if (failures.length > 0) {
\tconsole.error("EIMS security smoke failed:");
\tfor (const failure of failures) console.error(\`- \${failure}\`);
\tprocess.exit(1);
}

console.log("EIMS security smoke passed");
`,
	);
};

const writeEimsDocs = async (root) => {
	const docs = {
		"EIMS_SETUP_GUIDE.md": `# EIMS Setup Guide

This project includes the EIMS starter scaffold. Use docs/EIMS_FINAL_AGREED_SAAS_ARCHITECTURE_PLAN_V3.md as the controlling architecture reference.

Start with Phase 0 Layer A before implementing real MoR/EIMS calls.
`,
		"EIMS_PHASE0_RUNBOOK.md": `# EIMS Phase 0 Runbook

Layer A runs locally and proves signing, canonicalization, date, decimal, lookup, and counter assumptions without INSA sandbox credentials.

Layer B runs against INSA/MoR sandbox after credentials and certificates are available.

After publishing or linking the real SDK package, set \`EIMS_SDK_PACKAGE_NAME\`
and run \`pnpm test:eims:sdk-contract\`. This imports the SDK package, builds the
same options used by the Nest provider, and verifies the package exposes the
\`registerInvoice\`, \`registerReceipt\`, \`verifyIrn\`, bulk submission, bulk-status polling, invoice cancellation, and credential validation
methods consumed by the SaaS adapter before sandbox credentials are exercised.

Invoice submission lanes persist counter reservations before SDK dispatch and
hydrate source counter state from durable rows after restart. Multi-node
production deployments must run Redis-backed workers and source locks with the
same reservation contract.

Bulk callback handling is SaaS-side, but batch submission and delayed callback
reconciliation must still go through the SDK. The \`/eims/bulk\` endpoint calls
the SDK bulk submission capability and stores a durable processing conversation.
\`/eims/bulk/reconcile\` and the scheduled \`eims-bulk-callback\` worker call
the SDK bulk-status capability and store the polled result as a durable callback
receipt for audit and operator review.

Cancellation requests are validated by the SaaS layer for tenant input shape and
then submitted through the SDK cancellation capability. The generated app does
not embed authority cancellation protocol details.

Before production go-live, run \`pnpm doctor:production\`. The doctor blocks launch if EIMS is still in mock mode, lacks production MoR URLs, lacks an HTTPS callback URL, uses local signing, or has Phase 0 strict mode disabled.
`,
		"EIMS_VAULT_RUNBOOK.md": `# EIMS Vault Runbook

Vault Transit is the production signing boundary. Do not expose private keys to controllers, frontend code, or logs.
`,
		"EIMS_COMPLIANCE_EVIDENCE.md": `# EIMS Compliance Evidence

Collect architecture diagrams, schema exports, RLS policies, audit hash-chain samples, Vault audit logs, test results, and DR drill reports continuously.
`,
		"EIMS_TENANT_ONBOARDING.md": `# EIMS Tenant Onboarding

Onboarding follows: 2FA setup, enterprise, establishment, source system, MoR approval, CSR/certificate, credentials, sandbox test, production switch.

The concierge launch console is the primary UI for staff-assisted EIMS launches. EIMS tax operations remain available under \`/eims\`, but production approval should happen from the onboarding task after evidence, certificate, and first live invoice checks are complete.
`,
		"EIMS_DR_RUNBOOK.md": `# EIMS DR Runbook

Document VPS, PostgreSQL, Vault, certificate revocation, MoR API change, and tenant dispute response procedures before production rollout.

The starter registers \`eims-submission-retry\`, \`eims-bulk-callback\`, and
\`eims-offline-replay\` in \`BULLMQ_QUEUES\` so \`/admin/jobs\` can monitor
worker depth and retry failed jobs when Redis is configured.
`,
	};
	for (const [name, content] of Object.entries(docs)) {
		await writeNew(path.join(root, "docs", name), content);
	}
	await writeNew(
		path.join(root, "apps/api/prisma/seed-eims-entitlements.ts"),
		`import "dotenv/config";
import { prisma } from "../src/shared/database/prisma-instance";

const ENTITLEMENTS: Record<string, Array<{ featureKey: string; enabled: boolean; limit?: number | null }>> = {
\tfree: [{ featureKey: "eims.enabled", enabled: false }],
\tpro: [
\t\t{ featureKey: "eims.enabled", enabled: true },
\t\t{ featureKey: "eims.enterprises", enabled: true, limit: 1 },
\t\t{ featureKey: "eims.establishments", enabled: true, limit: 1 },
\t\t{ featureKey: "eims.source-systems", enabled: true, limit: 3 },
\t\t{ featureKey: "eims.monthly-invoices", enabled: true, limit: 1000 },
\t\t{ featureKey: "eims.bulk-registration", enabled: false },
\t\t{ featureKey: "eims.offline-mode", enabled: true },
\t\t{ featureKey: "eims.compliance-export", enabled: true },
\t\t{ featureKey: "eims.api-requests-per-minute", enabled: true, limit: 30 },
\t],
\tenterprise: [
\t\t{ featureKey: "eims.enabled", enabled: true },
\t\t{ featureKey: "eims.enterprises", enabled: true },
\t\t{ featureKey: "eims.establishments", enabled: true },
\t\t{ featureKey: "eims.source-systems", enabled: true },
\t\t{ featureKey: "eims.monthly-invoices", enabled: true },
\t\t{ featureKey: "eims.bulk-registration", enabled: true },
\t\t{ featureKey: "eims.offline-mode", enabled: true },
\t\t{ featureKey: "eims.compliance-export", enabled: true },
\t\t{ featureKey: "eims.api-requests-per-minute", enabled: true, limit: 300 },
\t\t{ featureKey: "eims.retention-months", enabled: true, limit: 120 },
\t],
};

async function main() {
\tfor (const [slug, entitlements] of Object.entries(ENTITLEMENTS)) {
\t\tconst plan = await prisma.plan.findUnique({ where: { slug } });
\t\tif (!plan) continue;
\t\tfor (const e of entitlements) {
\t\t\tawait prisma.featureEntitlement.upsert({
\t\t\t\twhere: { planId_featureKey: { planId: plan.id, featureKey: e.featureKey } },
\t\t\t\tupdate: { enabled: e.enabled, limit: e.limit ?? null },
\t\t\t\tcreate: { planId: plan.id, featureKey: e.featureKey, enabled: e.enabled, limit: e.limit ?? null },
\t\t\t});
\t\t}
\t}
\tconsole.log("EIMS entitlements seeded.");
}

main()
\t.catch((error) => {
\t\tconsole.error(error);
\t\tprocess.exit(1);
\t})
\t.finally(() => prisma.$disconnect());
`,
	);
	await writeNew(
		path.join(root, "apps/api/prisma/seed-eims-onboarding-template.ts"),
		`import "dotenv/config";
import { prisma } from "../src/shared/database/prisma-instance";

const EIMS_ONBOARDING_TEMPLATE_KEY = "eims-restaurant";

const EIMS_ONBOARDING_STEPS = [
\t{
\t\tkey: "tenant-intake",
\t\tstepOrder: 1,
\t\ttitle: "Confirm tenant intake",
\t\tdescription: "Collect legal name, trade name, TIN, VAT status, business address, owner, and manager contacts.",
\t\tcategory: "setup",
\t\tassigneeType: "STAFF",
\t\tcanBeSelfService: true,
\t},
\t{
\t\tkey: "subscription-payment",
\t\tstepOrder: 2,
\t\ttitle: "Confirm subscription and payment",
\t\tdescription: "Record plan, payment method, reference, amount, and receipt evidence before setup work starts.",
\t\tcategory: "billing",
\t\tassigneeType: "STAFF",
\t\tcanBeSelfService: false,
\t},
\t{
\t\tkey: "workspace-created",
\t\tstepOrder: 3,
\t\ttitle: "Create tenant workspace",
\t\tdescription: "Create organization, owner account, roles, and initial staff access for the restaurant.",
\t\tcategory: "setup",
\t\tassigneeType: "STAFF",
\t\tcanBeSelfService: false,
\t},
\t{
\t\tkey: "mor-portal-signup",
\t\tstepOrder: 4,
\t\ttitle: "Complete MoR portal signup",
\t\tdescription: "Use the tenant TIN and phone handoff to register or verify the MoR portal account.",
\t\tcategory: "mor-portal",
\t\tassigneeType: "STAFF",
\t\tcanBeSelfService: false,
\t},
\t{
\t\tkey: "mor-password-2fa",
\t\tstepOrder: 5,
\t\ttitle: "Secure MoR portal access",
\t\tdescription:
\t\t\t"Complete forced password change, TOTP setup, and backup-code capture in the encrypted credential store.",
\t\tcategory: "mor-portal",
\t\tassigneeType: "STAFF",
\t\tcanBeSelfService: false,
\t},
\t{
\t\tkey: "source-registration",
\t\tstepOrder: 6,
\t\ttitle: "Register source system",
\t\tdescription: "Register POS or ERP source details, branch, system type, and expected counter sequence.",
\t\tcategory: "mor-portal",
\t\tassigneeType: "STAFF",
\t\tcanBeSelfService: false,
\t},
\t{
\t\tkey: "source-approval",
\t\tstepOrder: 7,
\t\ttitle: "Wait for MoR source approval",
\t\tdescription: "Track approval status and follow up before credentials or certificates are connected.",
\t\tcategory: "mor-portal",
\t\tassigneeType: "STAFF",
\t\tcanBeSelfService: false,
\t},
\t{
\t\tkey: "credentials-capture",
\t\tstepOrder: 8,
\t\ttitle: "Capture EIMS credentials",
\t\tdescription:
\t\t\t"Store client ID, client secret, API key, system number, and source identifiers through encrypted backend APIs.",
\t\tcategory: "credentials",
\t\tassigneeType: "STAFF",
\t\tcanBeSelfService: false,
\t},
\t{
\t\tkey: "generate-csr",
\t\tstepOrder: 9,
\t\ttitle: "Generate certificate request",
\t\tdescription:
\t\t\t"Generate the CSR server-side with the configured signing provider and prepare the INSA request package.",
\t\tcategory: "insa-cert",
\t\tassigneeType: "STAFF",
\t\tcanBeSelfService: false,
\t},
\t{
\t\tkey: "insa-email",
\t\tstepOrder: 10,
\t\ttitle: "Send INSA certificate email",
\t\tdescription: "Send CSR, forms, and supporting documents to INSA and track expected response window.",
\t\tcategory: "insa-cert",
\t\tassigneeType: "STAFF",
\t\tcanBeSelfService: false,
\t},
\t{
\t\tkey: "certificate-upload",
\t\tstepOrder: 11,
\t\ttitle: "Upload issued certificate",
\t\tdescription: "Import the INSA-issued certificate, validate key match, expiry, key size, and subject data.",
\t\tcategory: "insa-cert",
\t\tassigneeType: "STAFF",
\t\tcanBeSelfService: false,
\t},
\t{
\t\tkey: "sandbox-test",
\t\tstepOrder: 12,
\t\ttitle: "Run sandbox invoice test",
\t\tdescription: "Submit a minimal invoice to sandbox and capture IRN or the actionable EIMS error response.",
\t\tcategory: "verification",
\t\tassigneeType: "STAFF",
\t\tcanBeSelfService: false,
\t},
\t{
\t\tkey: "tenant-notification",
\t\tstepOrder: 13,
\t\ttitle: "Notify tenant",
\t\tdescription: "Send SMS, email, or WhatsApp-ready message explaining readiness, next steps, and support contacts.",
\t\tcategory: "training",
\t\tassigneeType: "STAFF",
\t\tcanBeSelfService: true,
\t},
\t{
\t\tkey: "staff-training",
\t\tstepOrder: 14,
\t\ttitle: "Complete staff training",
\t\tdescription:
\t\t\t"Train owner, manager, and cashiers on invoice issue, receipt print, cancellation, and support escalation.",
\t\tcategory: "training",
\t\tassigneeType: "STAFF",
\t\tcanBeSelfService: false,
\t},
\t{
\t\tkey: "production-ready",
\t\tstepOrder: 15,
\t\ttitle: "Mark production ready",
\t\tdescription:
\t\t\t"Confirm live endpoint, credentials, certificate, printer layout, and first production invoice readiness.",
\t\tcategory: "launch",
\t\tassigneeType: "STAFF",
\t\tcanBeSelfService: false,
\t},
] as const;

async function main() {
\tawait prisma.onboardingTaskTemplate.upsert({
\t\twhere: { key: EIMS_ONBOARDING_TEMPLATE_KEY },
\t\tupdate: {
\t\t\tname: "EIMS restaurant onboarding",
\t\t\tdescription:
\t\t\t\t"Concierge workflow for Ethiopian restaurants to complete MoR portal setup, INSA certificate issuance, EIMS credentials, sandbox testing, and production launch.",
\t\t\tvertical: "restaurant",
\t\t\testimatedDays: 10,
\t\t\tstepDefinitions: EIMS_ONBOARDING_STEPS as never,
\t\t\tcreatedByPack: "eims",
\t\t\tisActive: true,
\t\t},
\t\tcreate: {
\t\t\tkey: EIMS_ONBOARDING_TEMPLATE_KEY,
\t\t\tname: "EIMS restaurant onboarding",
\t\t\tdescription:
\t\t\t\t"Concierge workflow for Ethiopian restaurants to complete MoR portal setup, INSA certificate issuance, EIMS credentials, sandbox testing, and production launch.",
\t\t\tvertical: "restaurant",
\t\t\testimatedDays: 10,
\t\t\tstepDefinitions: EIMS_ONBOARDING_STEPS as never,
\t\t\tcreatedByPack: "eims",
\t\t},
\t});

\tconsole.log("EIMS onboarding task template seeded.");
}

main()
\t.catch((error) => {
\t\tconsole.error(error);
\t\tprocess.exit(1);
\t})
\t.finally(() => prisma.$disconnect());
`,
	);
};

const patchEimsSeedScript = async (root) =>
	patchJsonFile(path.join(root, "apps/api/package.json"), (json) => {
		let seed = json.scripts?.["db:seed"];
		if (seed) {
			for (const script of ["seed-eims-entitlements.ts", "seed-eims-onboarding-template.ts"]) {
				if (!seed.includes(script)) {
					seed = `${seed} && tsx prisma/${script}`;
				}
			}
			json.scripts["db:seed"] = seed;
		}
		return json;
	});

const assertEimsCanBeCreated = async (cwd) => {
	const existing = [];
	for (const target of [
		"apps/api/src/modules/eims",
		"apps/api/src/modules/invoicing",
		"apps/web/src/features/eims",
		"apps/web/src/features/invoicing",
		"apps/web/src/routes/_authenticated/eims",
	]) {
		if (await fs.pathExists(path.join(cwd, target))) existing.push(target);
	}
	if (existing.length > 0) {
		throw new Error(
			`Refusing to overwrite existing EIMS starter files:\n${existing.map((p) => `- ${p}`).join("\n")}`,
		);
	}
};

const copyEimsStarterArtifacts = async (root, { refresh = false } = {}) => {
	for (const relPath of EIMS_STARTER_ARTIFACTS) {
		if (refresh && !EIMS_REFRESHABLE_ARTIFACTS.has(relPath)) continue;
		const source = path.join(EIMS_STARTER_ARTIFACTS_DIR, relPath);
		const target = path.join(root, relPath);
		if (!(await fs.pathExists(source))) {
			throw new Error(`EIMS starter source artifact is missing: ${source}`);
		}
		const canOverwrite = EIMS_REPLACEABLE_ARTIFACTS.has(relPath) || (refresh && EIMS_REFRESHABLE_ARTIFACTS.has(relPath));
		if ((await fs.pathExists(target)) && !canOverwrite) {
			throw new Error(`Refusing to overwrite existing EIMS starter artifact: ${target}`);
		}
		await fs.copy(source, target, {
			overwrite: canOverwrite,
			errorOnExist: !canOverwrite,
		});
	}
};

const ensureEimsDirectorySkeleton = async (root) => {
	for (const dir of EIMS_DIRECTORY_SKELETON) {
		await fs.ensureDir(path.join(root, dir));
	}
};

const writeEimsSupplementalFiles = async (root) => {
	await writeNew(
		path.join(root, "apps/web/src/features/invoicing/index.ts"),
		`export const invoicingFeatureStatus = "scaffolded";
`,
	);
};

const addEimsStarterPack = async ({ cwd }) => {
	await assertEimsCanBeCreated(cwd);
	console.log(pc.bold("Scaffolding EIMS/EIRMS e-invoicing starter pack"));
	await copyEimsStarterArtifacts(cwd);
	await ensureEimsDirectorySkeleton(cwd);
	await patchEimsPrismaSchema(cwd);
	await writeEimsSupplementalFiles(cwd);
	await patchEimsRouteTree(cwd);
	await patchEimsLandingRoute(cwd);
	await writeEimsPhase0Assets(cwd);
	await writeEimsDocs(cwd);
	await patchAppModule(cwd, "invoicing", "Invoicing");
	await patchAppModule(cwd, "eims", "Eims");
	await patchEimsPermissions(cwd);
	await patchEimsFeatureKeys(cwd);
	await patchEimsPackageScripts(cwd);
	await patchEimsSeedScript(cwd);
	await patchEimsEnvExamples(cwd);
	await patchSidebar(cwd, "eims", "EIMS", "eims");
	console.log(pc.green("EIMS starter pack scaffolded."));
	console.log(
		pc.dim(
			"Next: run pnpm db:generate, pnpm typecheck, and pnpm test:eims:local.",
		),
	);
};

const refreshEimsStarterPack = async ({ cwd }) => {
	console.log(pc.bold("Refreshing EIMS/EIRMS starter-owned UI and verification files"));
	await copyEimsStarterArtifacts(cwd, { refresh: true });
	await patchEimsRouteTree(cwd);
	await patchEimsLandingRoute(cwd);
	await patchEimsPackageScripts(cwd);
	await patchEimsSeedScript(cwd);
	await patchEimsEnvExamples(cwd);
	await patchSidebar(cwd, "eims", "EIMS", "eims");
	console.log(pc.green("EIMS starter refresh complete."));
	console.log(
		pc.dim(
			"Refreshed web UI/routes, EIMS browser tests, sidebar entries, package scripts, seed chain, and env examples. API modules were not overwritten.",
		),
	);
};

export const addStarterPack = async ({ cwd, starterName, refresh = false }) => {
	if (!starterName) {
		throw new Error(
			`Usage: create-vyllion-saas add starter <pack>\nAvailable packs: ${listStarterPacks().join(", ")}`,
		);
	}
	await assertGeneratedProjectRoot(cwd);

	const slug = resolveStarterPack(starterName);
	const pack = STARTER_PACKS[slug];
	if (!pack) {
		throw new Error(
			`Unknown starter pack '${starterName}'. Available packs: ${listStarterPacks().join(", ")}`,
		);
	}

	if (await isStarterInstalled(cwd, slug)) {
		if (pack.custom === "eims" && refresh) {
			await refreshEimsStarterPack({ cwd });
			await recordStarterInstalled(cwd, slug, pack);
			return;
		}
		console.log(pc.green(`${pack.label} starter pack is already installed.`));
		console.log(pc.dim(`State: ${STATE_FILE}`));
		if (pack.custom === "eims") {
			console.log(pc.dim("Run `create-vyllion-saas add starter eims --refresh` to reapply the EIMS-owned UI/routes/tests."));
		}
		return;
	}

	if (pack.custom === "eims") {
		await addEimsStarterPack({ cwd });
		await recordStarterInstalled(cwd, slug, pack);
		return;
	}

	await assertModulesCanBeCreated(cwd, pack.modules);
	console.log(pc.bold(`Scaffolding ${pack.label} starter pack`));
	console.log(pc.dim(`Modules: ${pack.modules.join(", ")}`));

	for (const moduleName of pack.modules) {
		await addModule({ cwd, moduleName });
	}
	await recordStarterInstalled(cwd, slug, pack);

	console.log(pc.green(`${pack.label} starter pack scaffolded.`));
	console.log(
		pc.dim(
			"Next: add Prisma models for the generated modules, then wire real fields and workflows.",
		),
	);
};

export const uninstallStarterPack = async ({ cwd, starterName }) => {
	if (!starterName) {
		throw new Error(
			`Usage: create-vyllion-saas remove starter <pack>\nAvailable packs: ${listStarterPacks().join(", ")}`,
		);
	}
	await assertGeneratedProjectRoot(cwd);

	const slug = resolveStarterPack(starterName);
	const pack = STARTER_PACKS[slug];
	if (!pack) {
		throw new Error(
			`Unknown starter pack '${starterName}'. Available packs: ${listStarterPacks().join(", ")}`,
		);
	}
	if (pack.custom !== "eims") {
		throw new Error(
			`Uninstall is currently only automated for metadata-backed custom packs. '${slug}' was generated as plain modules.`,
		);
	}

	const removed = await stripDomainStarterCode(cwd);
	await recordStarterRemoved(cwd, slug);
	console.log(pc.green(`${pack.label} starter pack removed.`));
	console.log(pc.dim(`Removed or patched ${removed} starter artifacts.`));
};
