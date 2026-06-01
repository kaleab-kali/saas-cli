import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import { EmailService } from "#shared/email/email.service";
import { createId } from "#shared/lib/id";

interface DispatchInput {
	organizationId: string;
	to: string;
	subject: string;
	html: string;
	text?: string;
	source: "bulk" | "transactional" | "invoice" | "digest";
	sourceRef?: string;
}

@Injectable()
export class EmailDispatcherService {
	private readonly logger = new Logger(EmailDispatcherService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly email: EmailService,
	) {}

	async dispatch(input: DispatchInput): Promise<{ ok: boolean; messageId?: string; error?: string }> {
		const deliveryId = createId();
		await this.prisma.emailDelivery.create({
			data: {
				id: deliveryId,
				organizationId: input.organizationId,
				toEmail: input.to,
				subject: input.subject,
				source: input.source,
				sourceRef: input.sourceRef ?? null,
				status: "queued",
				attemptCount: 1,
			},
		});
		try {
			const info = await this.email.send({
				to: input.to,
				subject: input.subject,
				html: input.html,
				text: input.text,
			});
			await this.prisma.emailDelivery.update({
				where: { id: deliveryId },
				data: { status: "sent", messageId: info.messageId, sentAt: new Date() },
			});
			return { ok: true, messageId: info.messageId };
		} catch (e) {
			const msg = (e as Error).message;
			this.logger.error(`Email dispatch failed: ${msg}`);
			await this.prisma.emailDelivery.update({
				where: { id: deliveryId },
				data: { status: "failed", error: msg },
			});
			return { ok: false, error: msg };
		}
	}

	async dispatchMany(inputs: DispatchInput[]): Promise<{ delivered: number; failed: number }> {
		let delivered = 0;
		let failed = 0;
		for (const i of inputs) {
			const r = await this.dispatch(i);
			if (r.ok) delivered++;
			else failed++;
		}
		return { delivered, failed };
	}
}
