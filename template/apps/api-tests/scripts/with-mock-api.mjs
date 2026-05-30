import { spawn } from "node:child_process";
import http from "node:http";

const mode = process.argv[2] ?? "http";
const requestedPort = Number(process.env.API_TEST_MOCK_PORT ?? 0);

const members = [
	{ id: "mem_owner", role: "owner", user: { email: "owner@example.com", name: "Owner" } },
	{ id: "mem_admin", role: "admin", user: { email: "manager@example.com", name: "Manager" } },
];
const users = [
	{
		id: "admin_user_1",
		email: "owner@example.com",
		emailVerified: true,
		organizations: [{ name: "Acme Restaurant", role: "owner" }],
	},
	{
		id: "admin_user_2",
		email: "manager@example.com",
		emailVerified: false,
		organizations: [{ name: "Acme Restaurant", role: "admin" }],
	},
	{ id: "admin_user_3", email: "unassigned@example.com", emailVerified: false, organizations: [] },
];
const invitations = [];

let orgSettings = {
	legalName: "Acme Restaurant PLC",
	timezone: "Africa/Addis_Ababa",
	currency: "ETB",
	taxId: "0074136947",
	companyPhone: "+251911000000",
	invoiceNumberPrefix: "INV",
};
let securitySettings = { force2fa: false, sessionTimeoutMinutes: 30 };
let billingVatRate = "15";
let organization = {
	id: "org_1",
	name: "Acme Restaurant",
	slug: "acme",
	suspendedAt: null,
};

const json = (res, status, body) => {
	res.writeHead(status, { "content-type": "application/json" });
	res.end(JSON.stringify(body));
	return true;
};

const readBody = (req) =>
	new Promise((resolve) => {
		let body = "";
		req.on("data", (chunk) => {
			body += chunk;
		});
		req.on("end", () => {
			try {
				resolve(body ? JSON.parse(body) : {});
			} catch {
				resolve({});
			}
		});
	});

const okAuth = {
	data: { user: { id: "user_1", email: "owner@example.com" }, session: { id: "sess_1" } },
};

const handleCore = (url, res) => {
	if (url.pathname.includes("__missing_api_test_route__")) return json(res, 404, { error: "not found" });
	if (url.pathname.endsWith("/health/live")) {
		return json(res, 200, { status: "ok", uptimeSeconds: 1, timestamp: new Date().toISOString() });
	}
	if (url.pathname.endsWith("/health/ready")) {
		return json(res, 200, {
			status: "ok",
			dependencies: { database: { status: "up" }, redis: { status: "skipped" } },
		});
	}
	if (url.pathname.endsWith("/health")) return json(res, 200, { status: "ok" });
	if (url.pathname.includes("/sign-in/email")) return json(res, 200, okAuth);
	if (url.pathname === "/api/auth/organization/set-active") return json(res, 200, { data: { ok: true } });
	return false;
};

const handleTeam = async (url, method, req, res) => {
	if (url.pathname === "/api/v1/team/members" && method === "GET") return json(res, 200, { data: members });
	if (url.pathname.startsWith("/api/v1/team/members/") && ["PATCH", "DELETE"].includes(method)) {
		return json(res, 403, { error: "last owner is protected" });
	}
	if (url.pathname === "/api/v1/team/invitations" && method === "POST") {
		const body = await readBody(req);
		const invite = {
			id: `inv_${invitations.length + 1}`,
			email: body.email ?? "qa-member@example.com",
			role: body.role ?? "viewer",
			status: "pending",
			acceptUrl: "",
		};
		invite.acceptUrl = `/settings/members?invitationId=${invite.id}`;
		invitations.push(invite);
		return json(res, 201, { data: invite });
	}
	if (url.pathname === "/api/v1/team/invitations" && method === "GET") {
		return json(res, 200, { data: invitations });
	}
	if (url.pathname.startsWith("/api/v1/team/invitations/") && method === "DELETE") {
		const id = url.pathname.split("/").at(-1);
		const index = invitations.findIndex((invite) => invite.id === id);
		const [removed] = index >= 0 ? invitations.splice(index, 1) : [];
		return json(res, 200, { data: removed ?? { id, email: "qa-member@example.com" } });
	}
	return false;
};

const handleTenantSettings = async (url, method, req, res) => {
	if (url.pathname === "/api/v1/organization-settings" && method === "GET")
		return json(res, 200, { data: orgSettings });
	if (url.pathname === "/api/v1/organization-settings" && method === "PATCH") {
		orgSettings = { ...orgSettings, ...(await readBody(req)) };
		return json(res, 200, { data: orgSettings });
	}
	if (url.pathname === "/api/v1/security-settings" && method === "PATCH") {
		securitySettings = { ...securitySettings, ...(await readBody(req)) };
		return json(res, 200, { data: securitySettings });
	}
	return false;
};

const handleAdmin = async (url, method, req, res) => {
	if (url.pathname === "/api/v1/admin/users" && method === "GET") {
		const search = url.searchParams.get("search")?.toLowerCase();
		const data = search ? users.filter((user) => user.email.toLowerCase().includes(search)) : users;
		return json(res, 200, { data });
	}
	if (url.pathname.endsWith("/force-password-reset") && method === "POST") {
		return json(res, 200, { data: { userId: "admin_user_2", sessionsRevoked: 2, resetEmailQueued: true } });
	}
	if (url.pathname === "/api/v1/admin/settings" && method === "GET") {
		return json(res, 200, {
			data: [
				{ key: "billing.vatRate", value: billingVatRate },
				{ key: "platform.supportEmail", value: "support@example.com" },
			],
		});
	}
	if (url.pathname === "/api/v1/admin/settings/billing.vatRate" && method === "PUT") {
		billingVatRate = (await readBody(req)).value ?? "16";
		return json(res, 200, { data: { key: "billing.vatRate", value: billingVatRate } });
	}
	if (url.pathname === "/api/v1/admin/settings/feature-flags") {
		return json(res, 200, { data: [{ name: "platform.webhooks", enabledGlobal: true }] });
	}
	if (url.pathname === "/api/v1/admin/organizations" && method === "GET")
		return json(res, 200, { data: [organization] });
	if (url.pathname === "/api/v1/admin/organizations/org_1/suspend" && method === "POST") {
		organization = { ...organization, suspendedAt: new Date().toISOString() };
		return json(res, 200, { data: organization });
	}
	if (url.pathname === "/api/v1/admin/organizations/org_1/unsuspend" && method === "POST") {
		organization = { ...organization, suspendedAt: null };
		return json(res, 200, { data: organization });
	}
	if (url.pathname === "/api/v1/admin/organizations/org_1" && method === "GET")
		return json(res, 200, { data: organization });
	return false;
};

const handleBilling = (url, method, res) => {
	if (url.pathname === "/api/v1/billing/plans") {
		return json(res, 200, { data: [{ slug: "free" }, { slug: "pro" }, { slug: "enterprise" }] });
	}
	if (url.pathname === "/api/v1/billing/subscription" && method === "GET") {
		return json(res, 200, { data: { subscription: { status: "active" }, plan: { slug: "pro" } } });
	}
	if (url.pathname === "/api/v1/billing/entitlements") {
		return json(res, 200, {
			data: { "platform.api-keys": { enabled: true }, "platform.custom-roles": { enabled: true } },
		});
	}
	if (url.pathname === "/api/v1/billing/capabilities") {
		return json(res, 200, { data: { "core.access": { enabled: true } } });
	}
	if (url.pathname === "/api/v1/billing/subscription/cancel" && method === "POST") {
		return json(res, 200, { data: { cancelAtPeriodEnd: true } });
	}
	if (url.pathname === "/api/v1/billing/subscription/resume" && method === "POST") {
		return json(res, 200, { data: { cancelAtPeriodEnd: false } });
	}
	return false;
};

const server = http.createServer(async (req, res) => {
	const url = new URL(req.url ?? "/", "http://127.0.0.1");
	const method = req.method ?? "GET";

	if (handleCore(url, res)) return;
	if (await handleTeam(url, method, req, res)) return;
	if (await handleTenantSettings(url, method, req, res)) return;
	if (await handleAdmin(url, method, req, res)) return;
	if (handleBilling(url, method, res)) return;

	return json(res, 404, { error: "not found" });
});

const run = (command, args, baseUrl) =>
	new Promise((resolve) => {
		const child = spawn(command, args, {
			stdio: "inherit",
			shell: process.platform === "win32",
			env: {
				...process.env,
				API_BASE_URL: baseUrl,
				API_TEST_USES_MOCK_SERVER: "1",
				API_TEST_EMAIL: "owner@example.com",
				API_TEST_PASSWORD: "password",
				API_TEST_ADMIN_EMAIL: "admin@example.com",
				API_TEST_ADMIN_PASSWORD: "password",
				API_TEST_ORG_SLUG: "acme",
				BRUNO_BASE_URL: baseUrl,
				OPENAPI_SPEC: "openapi/openapi-smoke.yaml",
			},
		});
		child.on("exit", (code) => resolve(code ?? 1));
		child.on("error", () => resolve(1));
	});

server.listen(requestedPort, "127.0.0.1", async () => {
	const address = server.address();
	const port = typeof address === "object" && address ? address.port : requestedPort;
	const baseUrl = `http://127.0.0.1:${port}`;
	const code =
		mode === "bruno"
			? await run("node", ["scripts/run-bruno.mjs"], baseUrl)
			: await run("playwright", ["test", "-c", "playwright.config.ts"], baseUrl);
	server.close(() => process.exit(code));
});
