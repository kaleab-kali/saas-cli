export const parseArgs = (argv) => {
	const out = {
		command: "create",
		projectName: null,
		moduleName: null,
		starterName: null,
		yes: false,
		help: false,
		install: false,
		dbPush: false,
		seed: false,
		production: false,
		refresh: false,
		eimsSdkPackage: null,
		starters: [],
	};

	const addStarterValues = (value) => {
		for (const starter of String(value ?? "").split(",")) {
			const trimmed = starter.trim();
			if (trimmed) out.starters.push(trimmed);
		}
	};

	const positional = [];
	for (let i = 0; i < argv.length; i += 1) {
		const a = argv[i];
		if (a === "--yes" || a === "-y") out.yes = true;
		else if (a === "--help" || a === "-h") out.help = true;
		else if (a === "--install") out.install = true;
		else if (a === "--db-push") out.dbPush = true;
		else if (a === "--seed") out.seed = true;
		else if (a === "--production" || a === "--prod") out.production = true;
		else if (a === "--refresh") out.refresh = true;
		else if (a === "--eims-sdk-package") {
			const packageName = argv[i + 1];
			if (packageName && !packageName.startsWith("-")) {
				out.eimsSdkPackage = packageName;
				i += 1;
			}
		} else if (a.startsWith("--eims-sdk-package=")) {
			out.eimsSdkPackage = a.slice("--eims-sdk-package=".length);
		}
		else if (a === "--starter") {
			const starter = argv[i + 1];
			if (starter && !starter.startsWith("-")) {
				addStarterValues(starter);
				i += 1;
			}
		} else if (a.startsWith("--starter=")) {
			addStarterValues(a.slice("--starter=".length));
		} else if (a === "--bootstrap") {
			out.install = true;
			out.dbPush = true;
			out.seed = true;
		} else if (!a.startsWith("-")) {
			positional.push(a);
		}
	}

	if (positional[0] === "doctor") {
		out.command = "doctor";
	} else if (positional[0] === "add" && positional[1] === "module") {
		out.command = "add-module";
		out.moduleName = positional[2] ?? null;
	} else if (positional[0] === "add" && positional[1] === "starter") {
		out.command = "add-starter";
		out.starterName = positional[2] ?? null;
	} else if (
		(positional[0] === "remove" || positional[0] === "uninstall") &&
		positional[1] === "starter"
	) {
		out.command = "remove-starter";
		out.starterName = positional[2] ?? null;
	} else if (
		(positional[0] === "list" && positional[1] === "starters") ||
		(positional[0] === "starter" && positional[1] === "list")
	) {
		out.command = "list-starters";
	} else if (positional[0] === "module") {
		out.command = "add-module";
		out.moduleName = positional[1] ?? null;
	} else if (positional[0] === "starter") {
		out.command = "add-starter";
		out.starterName = positional[1] ?? null;
	} else {
		out.projectName = positional[0] ?? null;
	}

	return out;
};
