export interface AuditLogProps {
	id: string;
	organizationId: string;
	userId: string | null;
	userEmail: string | null;
	action: string;
	resource: string;
	resourceId: string | null;
	correlationId: string | null;
	ipAddress: string | null;
	userAgent: string | null;
	metadata: unknown;
	status: string;
	errorMessage: string | null;
	createdAt: Date;
}

export class AuditLog {
	private constructor(private props: AuditLogProps) {}

	static create(props: AuditLogProps): AuditLog {
		return new AuditLog(props);
	}

	static rehydrate(props: AuditLogProps): AuditLog {
		return new AuditLog(props);
	}

	get id() {
		return this.props.id;
	}

	toPrimitives() {
		return { ...this.props };
	}
}
