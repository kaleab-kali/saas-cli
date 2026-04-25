import { type BulkCommProps, BulkCommunication } from "../../domain/entities/bulk-communication.entity";
import type { AudienceType, BulkStatus } from "../../domain/value-objects/notification.vo";

export interface BulkRow {
	id: string;
	organizationId: string;
	name: string;
	subject: string;
	bodyHtml: string;
	status: string;
	audienceType: string;
	audienceRef: string | null;
	recipientCount: number;
	scheduledAt: Date | null;
	sentAt: Date | null;
	createdBy: string | null;
	stats: unknown;
	createdAt: Date;
	updatedAt: Date;
}

export const BulkCommunicationMapper = {
	toDomain(row: BulkRow): BulkCommunication {
		const props: BulkCommProps = {
			...row,
			status: row.status as BulkStatus,
			audienceType: row.audienceType as AudienceType,
		};
		return BulkCommunication.rehydrate(props);
	},

	toPersistence(b: BulkCommunication) {
		const p = b.toPrimitives();
		return {
			id: p.id,
			organizationId: p.organizationId,
			name: p.name,
			subject: p.subject,
			bodyHtml: p.bodyHtml,
			status: p.status,
			audienceType: p.audienceType,
			audienceRef: p.audienceRef,
			recipientCount: p.recipientCount,
			scheduledAt: p.scheduledAt,
			sentAt: p.sentAt,
			createdBy: p.createdBy,
			stats: p.stats as never,
			createdAt: p.createdAt,
			updatedAt: p.updatedAt,
		};
	},

	toDto(b: BulkCommunication) {
		return b.toPrimitives();
	},
};
