import path from "node:path";
import fs from "fs-extra";
import pc from "picocolors";

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
		modules: ["invoicing", "eims"],
		custom: "eims",
	},
};

const STARTER_ALIASES = {
	ai: "ai-saas",
	project: "project-management",
	projects: "project-management",
	pm: "project-management",
	support: "helpdesk",
};

export const listStarterPacks = () => Object.keys(STARTER_PACKS);

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

const patchSidebar = async (root, slug, name, varName) => {
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
	`invoice: ["create", "read", "update-draft", "submit", "verify", "cancel", "export"],`,
	`receipt: ["create", "read", "submit"],`,
];

const patchEimsPermissions = async (root) => {
	const file = path.join(root, "apps/api/src/modules/auth/permissions.ts");
	if (!(await fs.pathExists(file))) return false;
	let text = await fs.readFile(file, "utf8");
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
		`\tinvoice: ["create", "read", "update-draft", "submit", "verify", "cancel", "export"],`,
		`\treceipt: ["create", "read", "submit"],`,
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
		`\tinvoice: ["create", "read", "update-draft", "submit", "verify", "cancel", "export"],`,
		`\treceipt: ["create", "read", "submit"],`,
	];
	const memberLines = [
		`\t"eims-enterprise": ["read"],`,
		`\t"eims-establishment": ["read"],`,
		`\t"eims-source": ["read"],`,
		`\t"eims-submission": ["read"],`,
		`\tinvoice: ["create", "read", "submit"],`,
		`\treceipt: ["create", "read", "submit"],`,
	];
	const viewerLines = [
		`\t"eims-enterprise": ["read"],`,
		`\t"eims-establishment": ["read"],`,
		`\t"eims-source": ["read"],`,
		`\t"eims-submission": ["read"],`,
		`\tinvoice: ["read"],`,
		`\treceipt: ["read"],`,
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

const patchEimsPackageScripts = async (root) =>
	patchJsonFile(path.join(root, "package.json"), (json) => {
		json.scripts ??= {};
		json.scripts["test:eims:local"] ??=
			"pnpm --filter api test -- --runTestsByPath src/modules/eims/shared/constants/eims-lookup-values.spec.ts src/modules/eims/setup/domain/source-submission.guard.spec.ts src/modules/invoicing/domain/canonical-invoice.spec.ts";
		json.scripts["phase0:eims:local"] ??=
			"pnpm --filter api exec tsx scripts/phase0/layer-a/run-all.ts";
		json.scripts["test:eims:phase0"] ??=
			"pnpm --filter api-tests test:bruno:mock";
		json.scripts["test:eims:sandbox"] ??= "pnpm --filter api-tests test:bruno";
		return json;
	});

const appendBlockIfMissing = async (file, marker, block) => {
	if (!(await fs.pathExists(file))) return false;
	let text = await fs.readFile(file, "utf8");
	if (text.includes(marker)) return false;
	text = `${text.trimEnd()}\n\n${block.trimEnd()}\n`;
	await fs.writeFile(file, text, "utf8");
	return true;
};

const patchEimsEnvExamples = async (root) => {
	const block = `# --- EIMS / Ethiopian e-invoicing (optional starter) ---
EIMS_ENV=sandbox
EIMS_BASE_URL_SANDBOX=
EIMS_BASE_URL_PRODUCTION=
EIMS_BULK_URL_SANDBOX=
EIMS_BULK_URL_PRODUCTION=
EIMS_SIGNING_PROVIDER=local
EIMS_CANONICALIZATION_VERSION=phase0-unlocked
EIMS_PHASE0_STRICT=false
EIMS_CALLBACK_PUBLIC_URL=
EIMS_LOOKUP_CACHE_TTL_SECONDS=300
EIMS_QUEUE_PREFIX=eims`;

	await appendBlockIfMissing(
		path.join(root, ".env.example"),
		"EIMS_ENV=",
		block,
	);
	await appendBlockIfMissing(
		path.join(root, ".env.production.example"),
		"EIMS_ENV=",
		block,
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
  status                     String    @default("initial_setup")
  createdAt                  DateTime  @default(now())
  updatedAt                  DateTime  @updatedAt

  @@index([organizationId, sourceSystemId, environment])
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
import { EimsComplianceModule } from "./compliance/eims-compliance.module";
import { EimsReceiptsModule } from "./receipts/eims-receipts.module";
import { EimsSetupModule } from "./setup/eims-setup.module";
import { EimsSharedModule } from "./shared/eims-shared.module";
import { EimsSubmissionModule } from "./submission/eims-submission.module";

@Module({
\timports: [EimsSharedModule, EimsSetupModule, EimsSubmissionModule, EimsReceiptsModule, EimsComplianceModule],
})
export class EimsModule {}
`,
	);
	await writeNew(
		path.join(root, "apps/api/src/modules/eims/shared/eims-shared.module.ts"),
		`import { Module } from "@nestjs/common";
import { EimsLookupController } from "./lookups/eims-lookup.controller";
import { EimsLookupService } from "./lookups/eims-lookup.service";

@Module({
\tcontrollers: [EimsLookupController],
\tproviders: [EimsLookupService],
\texports: [EimsLookupService],
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

	const submodules = [
		[
			"submission",
			"EimsSubmission",
			"eims/submissions",
			"eims-submission:read",
			"Invoice submission scaffold. Real EIMS calls are added after Phase 0.",
		],
		[
			"receipts",
			"EimsReceipts",
			"eims/receipts",
			"receipt:read",
			"Receipt and withholding scaffold.",
		],
		[
			"compliance",
			"EimsCompliance",
			"eims/compliance",
			"eims-compliance:read",
			"Compliance evidence scaffold.",
		],
	];
	for (const [dir, className, route, permission, message] of submodules) {
		await writeNew(
			path.join(root, `apps/api/src/modules/eims/${dir}/eims-${dir}.module.ts`),
			`import { Module } from "@nestjs/common";
import { Eims${className.replace("Eims", "")}Controller } from "./presentation/eims-${dir}.controller";

@Module({
\tcontrollers: [Eims${className.replace("Eims", "")}Controller],
})
export class ${className}Module {}
`,
		);
		await writeNew(
			path.join(
				root,
				`apps/api/src/modules/eims/${dir}/presentation/eims-${dir}.controller.ts`,
			),
			`import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";

@Controller("${route}")
@UseGuards(AuthGuard, PermissionsGuard)
export class Eims${className.replace("Eims", "")}Controller {
\t@Get()
\t@RequirePermissions("${permission}")
\tindex() {
\t\treturn {
\t\t\tstatus: "scaffolded",
\t\t\tmessage: "${message}",
\t\t};
\t}
}
`,
		);
	}
};

const writeEimsWebSkeleton = async (root) => {
	await writeNew(
		path.join(root, "apps/web/src/features/invoicing/index.ts"),
		`export const invoicingFeatureStatus = "scaffolded";
`,
	);
	await writeNew(
		path.join(root, "apps/web/src/features/eims/api/eims.hooks.ts"),
		`import { useQuery } from "@tanstack/react-query";
import { api } from "#shared/lib/api-client";

export interface EimsLookupResponse<T = unknown> {
\tversion: string;
\tupdatedAt: string;
\tdata: T[];
}

export const useEimsLookup = <T = unknown>(name: string) =>
\tuseQuery({
\t\tqueryKey: ["eims", "lookup", name],
\t\tqueryFn: () => api.get<EimsLookupResponse<T>>(\`/eims/lookups/\${name}\`),
\t});

export const useEimsSetupStatus = () =>
\tuseQuery({
\t\tqueryKey: ["eims", "setup"],
\t\tqueryFn: () => api.get<{ status: string; message: string }>("/eims/setup"),
\t});
`,
	);

	const routePages = [
		[
			"index",
			"/_authenticated/eims/",
			"EIMS",
			"Ethiopian e-invoicing setup, submissions, receipts, and compliance.",
		],
		[
			"setup",
			"/_authenticated/eims/setup",
			"EIMS Setup",
			"Configure enterprise, establishment, source system, credentials, and certificates.",
		],
		[
			"enterprises",
			"/_authenticated/eims/enterprises",
			"EIMS Enterprises",
			"Manage legal taxpayer enterprise records.",
		],
		[
			"establishments",
			"/_authenticated/eims/establishments",
			"EIMS Establishments",
			"Manage registered branches and sub-TIN context.",
		],
		[
			"sources",
			"/_authenticated/eims/sources",
			"EIMS Source Systems",
			"Manage POS/ERP source systems and MoR approval state.",
		],
		[
			"credentials",
			"/_authenticated/eims/credentials",
			"EIMS Credentials",
			"Store and rotate EIMS credentials through encrypted backend services.",
		],
		[
			"certificates",
			"/_authenticated/eims/certificates",
			"EIMS Certificates",
			"Track certificate import, expiry, and rotation.",
		],
		[
			"submissions",
			"/_authenticated/eims/submissions",
			"EIMS Submissions",
			"Monitor invoice submission state and reconciliation.",
		],
		[
			"bulk",
			"/_authenticated/eims/bulk",
			"EIMS Bulk",
			"Track bulk registration conversations and callbacks.",
		],
		[
			"compliance",
			"/_authenticated/eims/compliance",
			"EIMS Compliance",
			"Generate audit and compliance evidence packages.",
		],
	];
	for (const [fileName, routePath, title, description] of routePages) {
		const descriptionNode =
			description.length <= 64
				? `<p className="mt-1 text-sm text-muted-foreground">${description}</p>`
				: `<p className="mt-1 text-sm text-muted-foreground">
\t\t\t\t\t${description}
\t\t\t\t</p>`;
		await writeNew(
			path.join(
				root,
				`apps/web/src/routes/_authenticated/eims/${fileName}.tsx`,
			),
			`import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("${routePath}")({
\tcomponent: Page,
});

function Page() {
\treturn (
\t\t<div className="space-y-6 p-6">
\t\t\t<div>
\t\t\t\t<h1 className="text-2xl font-semibold">${title}</h1>
\t\t\t\t${descriptionNode}
\t\t\t</div>
\t\t\t<div className="rounded-md border p-4 text-sm text-muted-foreground">
\t\t\t\tThis is the EIMS starter scaffold. Implement this page according to
\t\t\t\tdocs/EIMS_FINAL_AGREED_SAAS_ARCHITECTURE_PLAN_V3.md.
\t\t\t</div>
\t\t</div>
\t);
}
`,
		);
	}

	const adminPages = [
		["index", "/admin/eims/", "Admin EIMS"],
		["tenants", "/admin/eims/tenants", "EIMS Tenants"],
		["failures", "/admin/eims/failures", "EIMS Failures"],
		["certificates", "/admin/eims/certificates", "EIMS Certificates"],
		["resources", "/admin/eims/resources", "EIMS Resources"],
		["compliance", "/admin/eims/compliance", "EIMS Compliance"],
	];
	for (const [fileName, routePath, title] of adminPages) {
		await writeNew(
			path.join(root, `apps/web/src/routes/admin/eims/${fileName}.tsx`),
			`import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("${routePath}")({
\tcomponent: Page,
});

function Page() {
\treturn (
\t\t<div className="space-y-6 p-6">
\t\t\t<h1 className="text-2xl font-semibold">${title}</h1>
\t\t\t<p className="text-sm text-muted-foreground">Platform-level EIMS operations scaffold.</p>
\t\t</div>
\t);
}
`,
		);
	}
};

const writeEimsPhase0Assets = async (root) => {
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
		path.join(root, "apps/api-tests/bruno/EIMS-Phase0/collection.bru"),
		`meta {
  name: EIMS Phase 0
  type: collection
}
`,
	);
	await writeNew(
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
		path.join(root, "apps/performance/k6/eims-submit.js"),
		`import { check } from "k6";
import http from "k6/http";

export const options = { vus: 1, duration: "5s" };

export default function () {
\tconst res = http.get(__ENV.API_BASE_URL || "http://127.0.0.1:3000/api/v1/health");
\tcheck(res, { "health responds": (r) => r.status < 500 });
}
`,
	);
	await writeNew(
		path.join(root, "apps/security/scripts/eims-security-smoke.mjs"),
		`console.log("EIMS security smoke scaffold: add secret redaction, RLS, and 2FA checks during implementation.");
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
`,
		"EIMS_VAULT_RUNBOOK.md": `# EIMS Vault Runbook

Vault Transit is the production signing boundary. Do not expose private keys to controllers, frontend code, or logs.
`,
		"EIMS_COMPLIANCE_EVIDENCE.md": `# EIMS Compliance Evidence

Collect architecture diagrams, schema exports, RLS policies, audit hash-chain samples, Vault audit logs, test results, and DR drill reports continuously.
`,
		"EIMS_TENANT_ONBOARDING.md": `# EIMS Tenant Onboarding

Onboarding follows: 2FA setup, enterprise, establishment, source system, MoR approval, CSR/certificate, credentials, sandbox test, production switch.
`,
		"EIMS_DR_RUNBOOK.md": `# EIMS DR Runbook

Document VPS, PostgreSQL, Vault, certificate revocation, MoR API change, and tenant dispute response procedures before production rollout.
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
};

const patchEimsSeedScript = async (root) =>
	patchJsonFile(path.join(root, "apps/api/package.json"), (json) => {
		const seed = json.scripts?.["db:seed"];
		if (seed && !seed.includes("seed-eims-entitlements.ts")) {
			json.scripts["db:seed"] =
				`${seed} && tsx prisma/seed-eims-entitlements.ts`;
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

const addEimsStarterPack = async ({ cwd }) => {
	await assertEimsCanBeCreated(cwd);
	console.log(pc.bold("Scaffolding EIMS/EIRMS e-invoicing starter pack"));
	await patchEimsPrismaSchema(cwd);
	await writeEimsApiSkeleton(cwd);
	await writeEimsSetupFoundation(cwd);
	await writeEimsWebSkeleton(cwd);
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

export const addStarterPack = async ({ cwd, starterName }) => {
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

	if (pack.custom === "eims") {
		await addEimsStarterPack({ cwd });
		return;
	}

	await assertModulesCanBeCreated(cwd, pack.modules);
	console.log(pc.bold(`Scaffolding ${pack.label} starter pack`));
	console.log(pc.dim(`Modules: ${pack.modules.join(", ")}`));

	for (const moduleName of pack.modules) {
		await addModule({ cwd, moduleName });
	}

	console.log(pc.green(`${pack.label} starter pack scaffolded.`));
	console.log(
		pc.dim(
			"Next: add Prisma models for the generated modules, then wire real fields and workflows.",
		),
	);
};
