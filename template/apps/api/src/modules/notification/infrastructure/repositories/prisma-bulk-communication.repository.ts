import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { BulkCommunication } from "../../domain/entities/bulk-communication.entity";
import { BulkCommunicationRepository } from "../../domain/repositories/bulk-communication.repository";
import { BulkCommunicationMapper } from "../mappers/bulk-communication.mapper";

@Injectable()
export class PrismaBulkCommunicationRepository extends BulkCommunicationRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async findById(organizationId: string, id: string) {
		const row = await this.prisma.bulkCommunication.findFirst({ where: { id, organizationId } });
		return row ? BulkCommunicationMapper.toDomain(row) : null;
	}

	async list(organizationId: string, q: { status?: string } = {}) {
		const rows = await this.prisma.bulkCommunication.findMany({
			where: { organizationId, ...(q.status ? { status: q.status } : {}) },
			orderBy: { createdAt: "desc" },
		});
		return rows.map((r) => BulkCommunicationMapper.toDomain(r));
	}

	async listDueScheduled() {
		const now = new Date();
		const rows = await this.prisma.bulkCommunication.findMany({
			where: { status: "scheduled", scheduledAt: { lte: now } },
		});
		return rows.map((r) => BulkCommunicationMapper.toDomain(r));
	}

	async save(b: BulkCommunication) {
		const row = await this.prisma.bulkCommunication.create({ data: BulkCommunicationMapper.toPersistence(b) });
		return BulkCommunicationMapper.toDomain(row);
	}

	async update(_organizationId: string, id: string, b: BulkCommunication) {
		const p = BulkCommunicationMapper.toPersistence(b);
		const row = await this.prisma.bulkCommunication.update({
			where: { id },
			data: {
				name: p.name,
				subject: p.subject,
				bodyHtml: p.bodyHtml,
				status: p.status,
				audienceType: p.audienceType,
				audienceRef: p.audienceRef,
				recipientCount: p.recipientCount,
				scheduledAt: p.scheduledAt,
				sentAt: p.sentAt,
				stats: p.stats,
				updatedAt: p.updatedAt,
			},
		});
		return BulkCommunicationMapper.toDomain(row);
	}

	async delete(organizationId: string, id: string): Promise<void> {
		await this.prisma.bulkCommunication.deleteMany({ where: { id, organizationId } });
	}
}
