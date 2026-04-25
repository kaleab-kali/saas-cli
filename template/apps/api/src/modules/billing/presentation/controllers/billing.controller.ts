import {
	Body,
	Controller,
	Delete,
	Get,
	NotFoundException,
	Param,
	Post,
	Query,
	Req,
	Res,
	UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import type { Response } from "express";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import {
	CancelSubscriptionHandler,
	ResumeSubscriptionHandler,
} from "../../application/commands/cancel-subscription.handler";
import { ChangePlanHandler } from "../../application/commands/change-plan.handler";
import { InitiateChapaPaymentHandler } from "../../application/commands/initiate-chapa-payment.handler";
import {
	RecordManualPaymentHandler,
	VerifyPaymentHandler,
} from "../../application/commands/record-manual-payment.handler";
import { StartSubscriptionHandler } from "../../application/commands/start-subscription.handler";
import {
	CancelSubscriptionDto,
	ChangePlanDto,
	InitiateChapaPaymentDto,
	RecordManualPaymentDto,
	StartSubscriptionDto,
} from "../../application/dto/billing.dto";
import {
	GetEntitlementsHandler,
	GetInvoicePaymentsHandler,
	GetSubscriptionHandler,
	GetUsageHandler,
	ListPlansHandler,
	ListSubscriptionInvoicesHandler,
} from "../../application/queries/billing.queries";
import { SubscriptionLifecycleService } from "../../application/services/subscription-lifecycle.service";
import { InvoicePdfService } from "../../application/services/invoice-pdf.service";
import { SubscriptionInvoiceRepository } from "../../domain/repositories/subscription-invoice.repository";

interface AuthedReq {
	organizationId: string;
	user?: { id: string; email?: string; name?: string };
	session?: { user?: { id: string; email?: string; name?: string } };
}

const pickUser = (r: AuthedReq) => r.user ?? r.session?.user ?? null;

@ApiTags("Billing")
@Controller("billing")
@UseGuards(AuthGuard, PermissionsGuard)
export class BillingController {
	constructor(
		private readonly listPlans: ListPlansHandler,
		private readonly getSub: GetSubscriptionHandler,
		private readonly getUsage: GetUsageHandler,
		private readonly getEntitlements: GetEntitlementsHandler,
		private readonly listInvoices: ListSubscriptionInvoicesHandler,
		private readonly getPayments: GetInvoicePaymentsHandler,
		private readonly startSub: StartSubscriptionHandler,
		private readonly changePlan: ChangePlanHandler,
		private readonly cancelSub: CancelSubscriptionHandler,
		private readonly resumeSub: ResumeSubscriptionHandler,
		private readonly recordPayment: RecordManualPaymentHandler,
		private readonly verifyPayment: VerifyPaymentHandler,
		private readonly initiateChapa: InitiateChapaPaymentHandler,
		private readonly invoicePdf: InvoicePdfService,
		private readonly invoiceRepo: SubscriptionInvoiceRepository,
		private readonly subLifecycle: SubscriptionLifecycleService,
	) {}

	@Get("me")
	@ApiOperation({ summary: "Combined tenant billing snapshot (subscription + lifecycle + entitlements)" })
	async me(@Req() req: AuthedReq) {
		const [subRes, lifecycle, entitlements] = await Promise.all([
			this.getSub.execute(req.organizationId),
			this.subLifecycle.snapshot(req.organizationId),
			this.getEntitlements.execute(req.organizationId),
		]);
		const sub = subRes.subscription;
		return {
			data: {
				subscription: sub
					? {
							id: sub.id,
							status: sub.status,
							billingInterval: sub.billingInterval,
							currentPeriodStart: sub.currentPeriodStart,
							currentPeriodEnd: sub.currentPeriodEnd,
						}
					: null,
				plan: subRes.plan ? { slug: subRes.plan.slug, nameEn: subRes.plan.nameEn, nameAm: subRes.plan.nameAm } : null,
				lifecycle,
				entitlements,
			},
		};
	}

	@Get("plans")
	@ApiOperation({ summary: "List available plans" })
	async plans() {
		return { data: await this.listPlans.execute() };
	}

	@Get("subscription")
	@RequirePermissions("billing:read")
	async subscription(@Req() req: AuthedReq) {
		return { data: await this.getSub.execute(req.organizationId) };
	}

	@Get("usage")
	@RequirePermissions("billing:read")
	async usage(@Req() req: AuthedReq) {
		return { data: await this.getUsage.execute(req.organizationId) };
	}

	@Get("entitlements")
	@RequirePermissions("billing:read")
	async entitlements(@Req() req: AuthedReq) {
		return { data: await this.getEntitlements.execute(req.organizationId) };
	}

	@Get("invoices")
	@RequirePermissions("billing:view-invoices")
	async invoices(
		@Query("status") status: string | undefined,
		@Query("skip") skip: string | undefined,
		@Query("take") take: string | undefined,
		@Req() req: AuthedReq,
	) {
		const result = await this.listInvoices.execute(req.organizationId, {
			status,
			skip: skip ? Number(skip) : undefined,
			take: take ? Number(take) : undefined,
		});
		return { data: result.data, meta: { total: result.total } };
	}

	@Get("invoices/:id/payments")
	@RequirePermissions("billing:view-invoices")
	async invoicePayments(@Param("id") id: string) {
		return { data: await this.getPayments.execute(id) };
	}

	@Get("invoices/:id/pdf")
	@RequirePermissions("billing:view-invoices")
	async getInvoicePdf(@Param("id") id: string, @Req() req: AuthedReq, @Res() res: Response) {
		const invoice = await this.invoiceRepo.findById(id);
		if (!invoice || invoice.toPrimitives().organizationId !== req.organizationId) {
			throw new NotFoundException("invoice");
		}
		const buf = await this.invoicePdf.generate(invoice, { organizationName: "Customer Org" });
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader("Content-Disposition", `inline; filename="${invoice.toPrimitives().number}.pdf"`);
		res.send(buf);
	}

	@Post("subscription")
	@RequirePermissions("billing:manage-subscription")
	async start(@Body() dto: StartSubscriptionDto, @Req() req: AuthedReq) {
		return { data: await this.startSub.execute(req.organizationId, dto) };
	}

	@Post("subscription/change-plan")
	@RequirePermissions("billing:manage-subscription")
	async change(@Body() dto: ChangePlanDto, @Req() req: AuthedReq) {
		return { data: await this.changePlan.execute(req.organizationId, dto) };
	}

	@Post("subscription/cancel")
	@RequirePermissions("billing:manage-subscription")
	async cancel(@Body() dto: CancelSubscriptionDto, @Req() req: AuthedReq) {
		return { data: await this.cancelSub.execute(req.organizationId, dto) };
	}

	@Post("subscription/resume")
	@RequirePermissions("billing:manage-subscription")
	async resume(@Req() req: AuthedReq) {
		return { data: await this.resumeSub.execute(req.organizationId) };
	}

	@Post("payments/manual")
	@RequirePermissions("billing:manage-payment-method")
	async manualPayment(@Body() dto: RecordManualPaymentDto, @Req() req: AuthedReq) {
		const u = pickUser(req);
		return { data: await this.recordPayment.execute(req.organizationId, u?.id ?? "system", dto) };
	}

	@Post("payments/:id/verify")
	@RequirePermissions("billing:manage-payment-method")
	async verify(@Param("id") id: string, @Req() req: AuthedReq) {
		const u = pickUser(req);
		return { data: await this.verifyPayment.execute(req.organizationId, u?.id ?? "system", id) };
	}

	@Post("chapa/initiate")
	@RequirePermissions("billing:manage-payment-method")
	async chapaInitiate(@Body() dto: InitiateChapaPaymentDto, @Req() req: AuthedReq) {
		const u = pickUser(req);
		const email = u?.email ?? "billing@example.com";
		const name = (u?.name ?? "User").split(" ");
		return {
			data: await this.initiateChapa.execute(req.organizationId, dto.invoiceId, {
				email,
				firstName: name[0] ?? "User",
				lastName: name.slice(1).join(" ") || "Org",
			}),
		};
	}

	@Delete("subscription")
	@RequirePermissions("billing:manage-subscription")
	async terminate(@Req() req: AuthedReq) {
		return { data: await this.cancelSub.execute(req.organizationId, { immediate: true }) };
	}
}
