import type { SubscriptionPayment } from "../entities/subscription-payment.entity";

export abstract class SubscriptionPaymentRepository {
	abstract save(p: SubscriptionPayment): Promise<SubscriptionPayment>;
	abstract update(p: SubscriptionPayment): Promise<SubscriptionPayment>;
	abstract findById(id: string): Promise<SubscriptionPayment | null>;
	abstract findByChapaReference(ref: string): Promise<SubscriptionPayment | null>;
	abstract listByInvoice(invoiceId: string): Promise<SubscriptionPayment[]>;
}
