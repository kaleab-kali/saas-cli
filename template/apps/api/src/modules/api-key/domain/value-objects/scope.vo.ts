// Scopes: "resource:action" — mirrors RBAC permissions. Special "admin" = all.
export const API_KEY_SCOPES = [
	"admin",
	"read:property",
	"write:property",
	"read:unit",
	"write:unit",
	"read:lease",
	"write:lease",
	"read:contact",
	"write:contact",
	"read:invoice",
	"write:invoice",
	"read:payment",
	"write:payment",
	"read:work-order",
	"write:work-order",
	"read:report",
	"read:audit-log",
] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const isApiKeyScope = (v: string): v is ApiKeyScope => (API_KEY_SCOPES as readonly string[]).includes(v);
