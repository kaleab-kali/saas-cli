import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PlatformSettingsService } from "#modules/admin/application/services/platform-settings.service";
import { PrismaService } from "#shared/database/prisma.service";
import { EmailService } from "#shared/email/email.service";

export type DunningType = "reminder" | "overdue" | "grace" | "read_only" | "locked" | "renewal";

export interface DunningPayload {
	subscriptionId: string;
	invoiceId?: string;
	type: DunningType;
	daysOffset?: number;
}

/**
 * Renders + sends dunning emails, logs every attempt to DunningEmail table.
 * Templates live in PlatformSettings (dunning.templateKey.*); body text is hardcoded fallback.
 */
@Injectable()
export class DunningService {
	private readonly logger = new Logger(DunningService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly settings: PlatformSettingsService,
		private readonly email: EmailService,
	) {}

	async send(payload: DunningPayload) {
		const sub = await this.prisma.subscription.findUnique({
			where: { id: payload.subscriptionId },
			include: { plan: true },
		});
		if (!sub) throw new NotFoundException("subscription not found");

		const org = await this.prisma.organization.findUnique({ where: { id: sub.organizationId } });
		// Fetch owner email
		const owner = await this.prisma.member.findFirst({
			where: { organizationId: sub.organizationId, role: "owner" },
			include: { user: { select: { email: true, name: true } } },
		});
		const to = owner?.user.email;
		if (!to) {
			this.logger.warn(`No owner email for org ${sub.organizationId} — dunning skipped`);
			return null;
		}

		const invoice = payload.invoiceId
			? await this.prisma.subscriptionInvoice.findUnique({ where: { id: payload.invoiceId } })
			: null;

		const supportEmail = await this.settings.getString("platform.supportEmail", "support@propflow.et");
		const companyName = await this.settings.getString("platform.companyName", "PropFlow");

		const templateKey = `dunning_${payload.type}`;
		const dbTemplate = await this.prisma.systemEmailTemplate.findUnique({ where: { key: templateKey } });

		const vars: Record<string, string> = {
			orgName: org?.name ?? sub.organizationId,
			planName: sub.plan.nameEn,
			invoiceNumber: invoice?.number ?? "",
			dueDate: invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-GB") : "",
			amount: invoice ? `${invoice.total.toFixed(2)} ${invoice.currency}` : "",
			gracePeriodEndsAt: sub.gracePeriodEndsAt ? new Date(sub.gracePeriodEndsAt).toLocaleDateString("en-GB") : "",
			readOnlyModeEndsAt: sub.readOnlyModeEndsAt ? new Date(sub.readOnlyModeEndsAt).toLocaleDateString("en-GB") : "",
			companyName,
			supportEmail,
			payUrl: `${process.env.WEB_APP_URL ?? "https://app.propflow.et"}/billing`,
		};
		const render = (tpl: string) => tpl.replace(/\{\{(\w+)\}\}/g, (_, name: string) => vars[name] ?? "");

		const subject = dbTemplate
			? render(dbTemplate.subject)
			: this.subjectFor(payload.type, sub.plan.nameEn, invoice?.number);
		const bodyHtml = dbTemplate ? render(dbTemplate.bodyHtml) : this.fallbackHtml(payload.type, vars);
		const html = `<div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#222">
<h2 style="color:#111">${companyName}</h2>
${bodyHtml}
<hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
<p style="font-size:12px;color:#888">Questions? Email <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
</div>`;

		let status = "sent";
		let errorMessage: string | undefined;
		let messageId: string | undefined;
		try {
			const result = await this.email.send({ to, subject, html });
			messageId = (result.messageId as string | undefined) ?? undefined;
		} catch (e) {
			status = "failed";
			errorMessage = (e as Error).message;
		}

		await this.prisma.dunningEmail.create({
			data: {
				subscriptionId: sub.id,
				organizationId: sub.organizationId,
				invoiceId: payload.invoiceId ?? null,
				type: payload.type,
				daysOffset: payload.daysOffset ?? 0,
				templateKey,
				subject,
				sentTo: to,
				messageId: messageId ?? null,
				status,
				errorMessage: errorMessage ?? null,
			},
		});

		await this.prisma.subscription.update({
			where: { id: sub.id },
			data: { lastReminderSentAt: new Date() },
		});

		return { subject, to, status, messageId };
	}

	private subjectFor(type: DunningType, planName: string, invoiceNumber?: string) {
		switch (type) {
			case "reminder":
				return `Reminder: ${invoiceNumber ?? "invoice"} is due`;
			case "overdue":
				return `Overdue: Please settle ${invoiceNumber ?? "your invoice"}`;
			case "grace":
				return `Payment overdue — ${planName} access warning`;
			case "read_only":
				return `Action required — your ${planName} subscription is read-only`;
			case "locked":
				return `Account locked — ${planName} subscription`;
			case "renewal":
				return `Your ${planName} renewal invoice`;
			default:
				return `PropFlow billing notification`;
		}
	}

	private fallbackHtml(type: DunningType, v: Record<string, string>): string {
		const dueStr = v.dueDate || "—";
		switch (type) {
			case "reminder":
				return `<p>Hi ${v.orgName},</p><p>Invoice <strong>${v.invoiceNumber}</strong> for your <strong>${v.planName}</strong> subscription is due on <strong>${dueStr}</strong> (${v.amount}).</p>`;
			case "overdue":
				return `<p>Hi ${v.orgName},</p><p>Invoice <strong>${v.invoiceNumber}</strong> (${v.amount}) was due on <strong>${dueStr}</strong> and remains unpaid.</p>`;
			case "grace":
				return `<p>Hi ${v.orgName},</p><p>Payment overdue — grace ends ${v.gracePeriodEndsAt}.</p>`;
			case "read_only":
				return `<p>Hi ${v.orgName},</p><p>Account now read-only. Lockout on ${v.readOnlyModeEndsAt}.</p>`;
			case "locked":
				return `<p>Hi ${v.orgName},</p><p>Account locked due to non-payment.</p>`;
			case "renewal":
				return `<p>Hi ${v.orgName},</p><p>Renewal invoice ${v.invoiceNumber} (${v.amount}) generated, due ${dueStr}.</p>`;
		}
	}
}
