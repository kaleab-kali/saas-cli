import crypto from "node:crypto";
import { cancel, isCancel, text, password as pwPrompt, intro, outro } from "@clack/prompts";
import pc from "picocolors";

const slugify = (s) =>
	s
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9-_]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/_/g, "-");

const dbify = (s) =>
	s
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9_]+/g, "_")
		.replace(/^_+|_+$/g, "");

const randomSecret = () => crypto.randomBytes(32).toString("hex");

const randomPassword = () => {
	const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
	let out = "";
	for (let i = 0; i < 20; i += 1) out += chars[crypto.randomInt(chars.length)];
	return out;
};

const ensure = (val) => {
	if (isCancel(val)) {
		cancel("Cancelled.");
		process.exit(0);
	}
	return val;
};

export const runPrompts = async ({ projectName: nameArg, yes }) => {
	intro(pc.bgCyan(pc.black(" create-vyllion-saas ")));

	const projectName = nameArg
		? nameArg
		: ensure(
				await text({
					message: "Project name",
					placeholder: "my-app",
					defaultValue: "my-app",
					validate: (v) => (v && v.length > 0 ? undefined : "Required"),
				}),
			);

	const slug = slugify(projectName);
	const defaults = {
		projectName,
		projectSlug: slug,
		dbName: `${dbify(slug)}_dev`,
		superAdminEmail: "admin@example.com",
		superAdminPassword: randomPassword(),
		ownerEmail: "owner@example.com",
		ownerPassword: randomPassword(),
		authSecret: randomSecret(),
		caddyDomain: "localhost",
	};

	if (yes) {
		outro(pc.green("Using defaults."));
		return defaults;
	}

	const dbName = ensure(
		await text({
			message: "Database name",
			placeholder: defaults.dbName,
			defaultValue: defaults.dbName,
		}),
	);

	const superAdminEmail = ensure(
		await text({
			message: "Super admin email",
			placeholder: defaults.superAdminEmail,
			defaultValue: defaults.superAdminEmail,
		}),
	);

	const superAdminPassword = ensure(
		await pwPrompt({
			message: "Super admin password (blank = auto-generate)",
			mask: "*",
		}),
	);

	const caddyDomain = ensure(
		await text({
			message: "Production domain (Caddy)",
			placeholder: defaults.caddyDomain,
			defaultValue: defaults.caddyDomain,
		}),
	);

	outro(pc.green("Configuration captured."));

	return {
		...defaults,
		dbName: dbName || defaults.dbName,
		superAdminEmail: superAdminEmail || defaults.superAdminEmail,
		superAdminPassword: superAdminPassword || defaults.superAdminPassword,
		caddyDomain: caddyDomain || defaults.caddyDomain,
	};
};
