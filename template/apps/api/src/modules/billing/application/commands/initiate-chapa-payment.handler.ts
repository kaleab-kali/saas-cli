import { randomUUID } from "node:crypto";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { SubscriptionInvoiceRepository } from "../../domain/repositories/subscription-invoice.repository";
import { ChapaClient } from "../../infrastructure/chapa/chapa.client";

@Injectable()
export class InitiateChapaPaymentHandler {
	constructor(
		private readonly invoiceRepo: SubscriptionInvoiceRepository,
		private readonly chapa: ChapaClient,
	) {}

	async execute(
		organizationId: string,
		invoiceId: string,
		user: { email: string; firstName: string; lastName: string },
	) {
		const invoice = await this.invoiceRepo.findById(invoiceId);
		if (!invoice || invoice.toPrimitives().organizationId !== organizationId) {
			throw new NotFoundException("invoice");
		}
		const p = invoice.toPrimitives();
		if (p.status === "paid") throw new ConflictException("invoice already paid");
		if (p.status === "void") throw new ConflictException("invoice void");

		const txRef = `pf-inv-${p.number}-${randomUUID().slice(0, 8)}`;
		const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
		const frontUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

		const { checkoutUrl } = await this.chapa.initialize({
			amount: p.total - p.amountPaid,
			currency: p.currency === "ETB" ? "ETB" : "USD",
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			txRef,
			callbackUrl: `${baseUrl}/api/v1/billing/chapa/webhook`,
			returnUrl: `${frontUrl}/settings/billing?paid=${txRef}`,
			customization: {
				title: "PropFlow",
				description: `Invoice ${p.number}`,
			},
		});

		return { checkoutUrl, txRef };
	}
}
