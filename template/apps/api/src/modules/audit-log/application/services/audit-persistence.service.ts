import { Injectable, Logger } from "@nestjs/common";
import { AuditLogRepository } from "../../domain/repositories/audit-log.repository";

// Fire-and-forget persistence — callers (interceptor) shouldn't block on DB write.
@Injectable()
export class AuditPersistenceService {
	private readonly logger = new Logger(AuditPersistenceService.name);

	constructor(private readonly repo: AuditLogRepository) {}

	record(input: {
		organizationId: string | undefined;
		userId: string | null;
		userEmail: string | null;
		action: string;
		resource: string;
		resourceId?: string | null;
		correlationId?: string | null;
		ipAddress?: string | null;
		userAgent?: string | null;
		metadata?: unknown;
		status?: "success" | "failure";
		errorMessage?: string | null;
	}): void {
		if (!input.organizationId) return;
		const orgId = input.organizationId;
		// Fire-and-forget
		this.repo
			.save({
				organizationId: orgId,
				userId: input.userId,
				userEmail: input.userEmail,
				action: input.action,
				resource: input.resource,
				resourceId: input.resourceId ?? null,
				correlationId: input.correlationId ?? null,
				ipAddress: input.ipAddress ?? null,
				userAgent: input.userAgent ?? null,
				metadata: input.metadata ?? null,
				status: input.status ?? "success",
				errorMessage: input.errorMessage ?? null,
			})
			.catch((err) => {
				this.logger.warn(`audit persistence failed: ${err instanceof Error ? err.message : String(err)}`);
			});
	}
}
