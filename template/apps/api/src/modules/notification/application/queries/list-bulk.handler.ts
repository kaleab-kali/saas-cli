import { Injectable } from "@nestjs/common";
import { BulkCommunicationRepository } from "../../domain/repositories/bulk-communication.repository";

@Injectable()
export class ListBulkHandler {
	constructor(private readonly repo: BulkCommunicationRepository) {}

	async execute(organizationId: string, q: { status?: string } = {}) {
		const rows = await this.repo.list(organizationId, q);
		return rows.map((r) => r.toPrimitives());
	}
}
