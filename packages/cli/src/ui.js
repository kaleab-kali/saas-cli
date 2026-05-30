import pc from "picocolors";

export const printWelcome = () => {
	console.log("");
	console.log(pc.cyan(pc.bold("  create-vyllion-saas")));
	console.log(pc.dim("  Scaffold a production-ready multi-tenant SaaS"));
	console.log("");
};

export const printNextSteps = ({ targetDir, projectSlug, superAdminEmail, ownerEmail, dbName }) => {
	console.log("");
	console.log(pc.green(pc.bold("Scaffold complete!")));
	console.log("");
	console.log(pc.bold("Next steps:"));
	console.log("");
	console.log(pc.dim("  # 1. Create Postgres database (any of these works)"));
	console.log(pc.dim("  #    a) psql:"));
	console.log(`         psql -U postgres -c "CREATE DATABASE ${dbName};"`);
	console.log(pc.dim("  #    b) pgAdmin GUI:"));
	console.log(`         right-click Databases -> Create -> Database -> name = ${dbName}`);
	console.log(pc.dim("  #    c) DBeaver / TablePlus:"));
	console.log(`         connect, create new database named ${dbName}`);
	console.log(pc.dim("  #    d) createdb (if PostgreSQL bin in PATH):"));
	console.log(`         createdb ${dbName}`);
	console.log("");
	console.log(pc.dim("  # 2. Install deps"));
	console.log(`     cd ${projectSlug}`);
	console.log("     pnpm install");
	console.log("");
	console.log(pc.dim("  # 3. Migrate + seed"));
	console.log("     pnpm db:generate");
	console.log("     pnpm db:migrate");
	console.log("     pnpm db:seed");
	console.log("");
	console.log(pc.dim("  # 4. Run dev servers"));
	console.log("     pnpm dev");
	console.log("");
	console.log(pc.dim("  # 5. Login"));
	console.log(`     Super Admin:   http://localhost:5173/admin-login   (${superAdminEmail})`);
	console.log(`     Tenant Owner:  http://localhost:5173/login         (${ownerEmail})`);
	console.log(pc.dim("     Passwords are in .scaffold-credentials.txt inside your project."));
	console.log("");
	console.log(pc.dim(`Target: ${targetDir}`));
	console.log("");
};
