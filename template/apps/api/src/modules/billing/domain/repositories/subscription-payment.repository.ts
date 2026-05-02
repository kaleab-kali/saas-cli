import type { SubscriptionPayment } from "../entities/subscription-payment.entity";

export abstract class SubscriptionPaymentRepository {
	abstract save(p: SubscriptionPayment): Promise<SubscriptionPayment>;
	abstract update(p: SubscriptionPayment): Promise<SubscriptionPayment>;
	abstract findById(id: string): Promise<SubscriptionPayment | null>;
	abstract findByChapaTxRef(txRef: string): Promise<SubscriptionPayment | null>;
	abstract findByStripePaymentIntentId(piId: string): Promise<SubscriptionPayment | null>;
	abstract listByInvoice(invoiceId: string): Promise<SubscriptionPayment[]>;
}
