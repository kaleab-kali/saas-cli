import type { SubscriptionInvoice } from "../entities/subscription-invoice.entity";

export interface InvoiceListQuery {
	status?: string;
	from?: Date;
	to?: Date;
	skip?: number;
	take?: number;
}

export abstract class SubscriptionInvoiceRepository {
	abstract findById(id: string): Promise<SubscriptionInvoice | null>;
	abstract findByNumber(number: string): Promise<SubscriptionInvoice | null>;
	abstract list(organizationId: string, q: InvoiceListQuery): Promise<{ rows: SubscriptionInvoice[]; total: number }>;
	abstract save(invoice: SubscriptionInvoice): Promise<SubscriptionInvoice>;
	abstract update(invoice: SubscriptionInvoice): Promise<SubscriptionInvoice>;
	abstract nextInvoiceNumber(organizationId: string): Promise<string>;
}
