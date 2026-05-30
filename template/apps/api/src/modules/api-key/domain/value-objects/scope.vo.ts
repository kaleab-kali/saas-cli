// Scopes: "resource:action" — mirrors RBAC permissions. Special "admin" = all.
export const API_KEY_SCOPES = [
	"admin",
	"read:organization",
	"write:organization",
	"read:member",
	"write:member",
	"read:billing",
	"write:billing",
	"read:notification",
	"write:notification",
	"read:file",
	"write:file",
	"read:report",
	"write:report",
	"read:audit-log",
] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const isApiKeyScope = (v: string): v is ApiKeyScope => (API_KEY_SCOPES as readonly string[]).includes(v);
