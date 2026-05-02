import type { BulkCommunication } from "../entities/bulk-communication.entity";

export abstract class BulkCommunicationRepository {
	abstract findById(organizationId: string, id: string): Promise<BulkCommunication | null>;
	abstract list(organizationId: string, q?: { status?: string }): Promise<BulkCommunication[]>;
	abstract listDueScheduled(): Promise<BulkCommunication[]>;
	abstract save(b: BulkCommunication): Promise<BulkCommunication>;
	abstract update(organizationId: string, id: string, b: BulkCommunication): Promise<BulkCommunication>;
	abstract delete(organizationId: string, id: string): Promise<void>;
}
