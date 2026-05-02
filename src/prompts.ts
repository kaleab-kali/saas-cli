import * as p from "@clack/prompts";

export interface ProjectConfig {
	name: string;
	dbHost: string;
	dbPort: string;
	dbUser: string;
	dbPassword: string;
	dbName: string;
	apiPort: string;
	webPort: string;
}

export const getProjectConfig = async (nameArg?: string): Promise<ProjectConfig> => {
	const name =
		nameArg ||
		((await p.text({
			message: "What is your project name?",
			placeholder: "my-saas-app",
			validate: (value) => {
				if (!value) return "Project name is required";
				if (!/^[a-z0-9-]+$/.test(value)) return "Use lowercase letters, numbers, and hyphens only";
				return undefined;
			},
		})) as string);

	if (p.isCancel(name)) return name as unknown as ProjectConfig;

	const dbConfig = await p.group(
		{
			dbHost: () =>
				p.text({
					message: "Database host?",
					initialValue: "localhost",
				}),
			dbPort: () =>
				p.text({
					message: "Database port?",
					initialValue: "5432",
				}),
			dbUser: () =>
				p.text({
					message: "Database user?",
					initialValue: "postgres",
				}),
			dbPassword: () =>
				p.text({
					message: "Database password?",
					placeholder: "your-password",
				}),
			dbName: () =>
				p.text({
					message: "Database name?",
					initialValue: name,
				}),
		},
		{
			onCancel: () => {
				p.cancel("Operation cancelled.");
				process.exit(0);
			},
		},
	);

	const ports = await p.group(
		{
			apiPort: () =>
				p.text({
					message: "API port?",
					initialValue: "3000",
				}),
			webPort: () =>
				p.text({
					message: "Web port?",
					initialValue: "5173",
				}),
		},
		{
			onCancel: () => {
				p.cancel("Operation cancelled.");
				process.exit(0);
			},
		},
	);

	return {
		name: name as string,
		...dbConfig,
		...ports,
	} as ProjectConfig;
};
