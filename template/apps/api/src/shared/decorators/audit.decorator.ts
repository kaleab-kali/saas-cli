import { SetMetadata } from "@nestjs/common";

export const AUDIT_ACTION_KEY = "audit:action";
export const AUDIT_RESOURCE_KEY = "audit:resource";

export function AuditAction(action: string) {
	return SetMetadata(AUDIT_ACTION_KEY, action);
}

export function AuditResource(resource: string) {
	return SetMetadata(AUDIT_RESOURCE_KEY, resource);
}
