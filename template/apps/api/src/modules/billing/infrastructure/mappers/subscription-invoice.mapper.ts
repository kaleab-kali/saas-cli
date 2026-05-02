import type { SubscriptionInvoice as PrismaInvoice } from "../../../../generated/prisma/client";
import { SubscriptionInvoice } from "../../domain/entities/subscription-invoice.entity";
import type { InvoiceStatus } from "../../domain/value-objects/feature-keys.vo";

export class SubscriptionInvoiceMapper {
	static toDomain(row: PrismaInvoice): SubscriptionInvoice {
		return SubscriptionInvoice.rehydrate({
			id: row.id,
			subscriptionId: row.subscriptionId,
			organizationId: row.organizationId,
			number: row.number,
			status: row.status as InvoiceStatus,
			issueDate: row.issueDate,
			dueDate: row.dueDate,
			periodStart: row.periodStart,
			periodEnd: row.periodEnd,
			currency: row.currency,
			subtotalMinor: row.subtotalMinor,
			taxMinor: row.taxMinor,
			totalMinor: row.totalMinor,
			amountPaidMinor: row.amountPaidMinor,
			lineType: row.lineType,
			description: row.description,
			stripeInvoiceId: row.stripeInvoiceId,
			chapaTxRef: row.chapaTxRef,
			checkoutUrl: row.checkoutUrl,
			pdfUrl: row.pdfUrl,
			sentAt: row.sentAt,
			paidAt: row.paidAt,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		});
	}

	static toDto(i: SubscriptionInvoice) {
		return i.toPrimitives();
	}
}
