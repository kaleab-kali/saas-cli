import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { SubscriptionInvoice } from "../../domain/entities/subscription-invoice.entity";
import {
	type InvoiceListQuery,
	SubscriptionInvoiceRepository,
} from "../../domain/repositories/subscription-invoice.repository";
import { SubscriptionInvoiceMapper } from "../mappers/subscription-invoice.mapper";

@Injectable()
export class PrismaSubscriptionInvoiceRepository extends SubscriptionInvoiceRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async findById(id: string) {
		const row = await this.prisma.subscriptionInvoice.findUnique({ where: { id } });
		return row ? SubscriptionInvoiceMapper.toDomain(row) : null;
	}

	async findByNumber(number: string) {
		const row = await this.prisma.subscriptionInvoice.findUnique({ where: { number } });
		return row ? SubscriptionInvoiceMapper.toDomain(row) : null;
	}

	async list(organizationId: string, q: InvoiceListQuery) {
		const where = {
			organizationId,
			...(q.status ? { status: q.status } : {}),
			...(q.from || q.to ? { issueDate: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } } : {}),
		};
		const [rows, total] = await Promise.all([
			this.prisma.subscriptionInvoice.findMany({
				where,
				orderBy: { issueDate: "desc" },
				skip: q.skip ?? 0,
				take: Math.min(q.take ?? 50, 500),
			}),
			this.prisma.subscriptionInvoice.count({ where }),
		]);
		return { rows: rows.map(SubscriptionInvoiceMapper.toDomain), total };
	}

	async save(invoice: SubscriptionInvoice): Promise<SubscriptionInvoice> {
		const p = invoice.toPrimitives();
		const row = await this.prisma.subscriptionInvoice.create({
			data: {
				subscriptionId: p.subscriptionId,
				organizationId: p.organizationId,
				number: p.number,
				status: p.status,
				issueDate: p.issueDate,
				dueDate: p.dueDate,
				periodStart: p.periodStart,
				periodEnd: p.periodEnd,
				currency: p.currency,
				subtotal: p.subtotal,
				vatAmount: p.vatAmount,
				total: p.total,
				amountPaid: p.amountPaid,
				lineType: p.lineType,
				description: p.description,
				pdfUrl: p.pdfUrl,
				sentAt: p.sentAt,
				paidAt: p.paidAt,
			},
		});
		return SubscriptionInvoiceMapper.toDomain(row);
	}

	async update(invoice: SubscriptionInvoice): Promise<SubscriptionInvoice> {
		const p = invoice.toPrimitives();
		const row = await this.prisma.subscriptionInvoice.update({
			where: { id: p.id },
			data: {
				status: p.status,
				amountPaid: p.amountPaid,
				pdfUrl: p.pdfUrl,
				sentAt: p.sentAt,
				paidAt: p.paidAt,
			},
		});
		return SubscriptionInvoiceMapper.toDomain(row);
	}

	async nextInvoiceNumber(organizationId: string): Promise<string> {
		const year = new Date().getFullYear();
		const count = await this.prisma.subscriptionInvoice.count({
			where: { organizationId, issueDate: { gte: new Date(year, 0, 1) } },
		});
		const seq = (count + 1).toString().padStart(5, "0");
		return `PF-INV-${year}-${seq}`;
	}
}
