import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { SubscriptionPayment } from "../../domain/entities/subscription-payment.entity";
import { SubscriptionPaymentRepository } from "../../domain/repositories/subscription-payment.repository";
import { SubscriptionPaymentMapper } from "../mappers/subscription-payment.mapper";

@Injectable()
export class PrismaSubscriptionPaymentRepository extends SubscriptionPaymentRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async save(p: SubscriptionPayment): Promise<SubscriptionPayment> {
		const x = p.toPrimitives();
		const row = await this.prisma.subscriptionPayment.create({
			data: {
				invoiceId: x.invoiceId,
				organizationId: x.organizationId,
				amount: x.amount,
				currency: x.currency,
				method: x.method,
				chapaReference: x.chapaReference,
				bankReference: x.bankReference,
				receiptNumber: x.receiptNumber,
				paidAt: x.paidAt,
				recordedByUserId: x.recordedByUserId,
				verified: x.verified,
				verifiedByUserId: x.verifiedByUserId,
				verifiedAt: x.verifiedAt,
				note: x.note,
			},
		});
		return SubscriptionPaymentMapper.toDomain(row);
	}

	async update(p: SubscriptionPayment): Promise<SubscriptionPayment> {
		const x = p.toPrimitives();
		const row = await this.prisma.subscriptionPayment.update({
			where: { id: x.id },
			data: {
				verified: x.verified,
				verifiedByUserId: x.verifiedByUserId,
				verifiedAt: x.verifiedAt,
				note: x.note,
			},
		});
		return SubscriptionPaymentMapper.toDomain(row);
	}

	async findById(id: string) {
		const row = await this.prisma.subscriptionPayment.findUnique({ where: { id } });
		return row ? SubscriptionPaymentMapper.toDomain(row) : null;
	}

	async findByChapaReference(ref: string) {
		const row = await this.prisma.subscriptionPayment.findFirst({ where: { chapaReference: ref } });
		return row ? SubscriptionPaymentMapper.toDomain(row) : null;
	}

	async listByInvoice(invoiceId: string) {
		const rows = await this.prisma.subscriptionPayment.findMany({
			where: { invoiceId },
			orderBy: { paidAt: "desc" },
		});
		return rows.map(SubscriptionPaymentMapper.toDomain);
	}
}
