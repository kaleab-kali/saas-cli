import type { SubscriptionPayment as PrismaPayment } from "../../../../generated/prisma/client";
import { SubscriptionPayment } from "../../domain/entities/subscription-payment.entity";
import type { PaymentMethod } from "../../domain/value-objects/feature-keys.vo";

export class SubscriptionPaymentMapper {
	static toDomain(row: PrismaPayment): SubscriptionPayment {
		return SubscriptionPayment.rehydrate({
			id: row.id,
			invoiceId: row.invoiceId,
			organizationId: row.organizationId,
			amount: row.amount,
			currency: row.currency,
			method: row.method as PaymentMethod,
			chapaReference: row.chapaReference,
			bankReference: row.bankReference,
			receiptNumber: row.receiptNumber,
			paidAt: row.paidAt,
			recordedByUserId: row.recordedByUserId,
			verified: row.verified,
			verifiedByUserId: row.verifiedByUserId,
			verifiedAt: row.verifiedAt,
			note: row.note,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		});
	}

	static toDto(p: SubscriptionPayment) {
		return p.toPrimitives();
	}
}
