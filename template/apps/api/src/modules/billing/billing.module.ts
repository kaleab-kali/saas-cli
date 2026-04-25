import { forwardRef, Global, Module } from "@nestjs/common";
import { AdminModule } from "#modules/admin/admin.module";
import { AuthModule } from "#modules/auth/auth.module";
import { ActivateCampaignHandler } from "./application/commands/activate-campaign.handler";
import {
	CancelSubscriptionHandler,
	ResumeSubscriptionHandler,
} from "./application/commands/cancel-subscription.handler";
import { ChangePlanHandler } from "./application/commands/change-plan.handler";
import { InitiateChapaPaymentHandler } from "./application/commands/initiate-chapa-payment.handler";
import { RecordManualPaymentHandler, VerifyPaymentHandler } from "./application/commands/record-manual-payment.handler";
import { StartSubscriptionHandler } from "./application/commands/start-subscription.handler";
import {
	GetEntitlementsHandler,
	GetInvoicePaymentsHandler,
	GetSubscriptionHandler,
	GetUsageHandler,
	ListCampaignsHandler,
	ListPlansHandler,
	ListSubscriptionInvoicesHandler,
} from "./application/queries/billing.queries";
import { BillingLifecycleCron } from "./application/services/billing-lifecycle.cron";
import { ChapaWebhookService } from "./application/services/chapa-webhook.service";
import { DunningService } from "./application/services/dunning.service";
import { EntitlementService } from "./application/services/entitlement.service";
import { InvoiceLifecycleService } from "./application/services/invoice-lifecycle.service";
import { SubscriptionLifecycleService } from "./application/services/subscription-lifecycle.service";
import { UsageTrackerService } from "./application/services/usage-tracker.service";
import { VatInvoiceService } from "./application/services/vat-invoice.service";
import { CampaignActivationRepository } from "./domain/repositories/campaign-activation.repository";
import { PlanRepository } from "./domain/repositories/plan.repository";
import { SubscriptionRepository } from "./domain/repositories/subscription.repository";
import { SubscriptionInvoiceRepository } from "./domain/repositories/subscription-invoice.repository";
import { SubscriptionPaymentRepository } from "./domain/repositories/subscription-payment.repository";
import { UsageSnapshotRepository } from "./domain/repositories/usage-snapshot.repository";
import { SubscriptionStateGuard } from "./guards/subscription-state.guard";
import { ChapaClient } from "./infrastructure/chapa/chapa.client";
import { PrismaCampaignActivationRepository } from "./infrastructure/repositories/prisma-campaign-activation.repository";
import { PrismaPlanRepository } from "./infrastructure/repositories/prisma-plan.repository";
import { PrismaSubscriptionRepository } from "./infrastructure/repositories/prisma-subscription.repository";
import { PrismaSubscriptionInvoiceRepository } from "./infrastructure/repositories/prisma-subscription-invoice.repository";
import { PrismaSubscriptionPaymentRepository } from "./infrastructure/repositories/prisma-subscription-payment.repository";
import { PrismaUsageSnapshotRepository } from "./infrastructure/repositories/prisma-usage-snapshot.repository";
import { BillingController } from "./presentation/controllers/billing.controller";
import { ChapaWebhookController } from "./presentation/controllers/chapa-webhook.controller";
import { EntitlementGuard } from "./presentation/guards/entitlement.guard";

@Global()
@Module({
	imports: [AuthModule, forwardRef(() => AdminModule)],
	controllers: [BillingController, ChapaWebhookController],
	providers: [
		{ provide: PlanRepository, useClass: PrismaPlanRepository },
		{ provide: SubscriptionRepository, useClass: PrismaSubscriptionRepository },
		{ provide: SubscriptionInvoiceRepository, useClass: PrismaSubscriptionInvoiceRepository },
		{ provide: SubscriptionPaymentRepository, useClass: PrismaSubscriptionPaymentRepository },
		{ provide: CampaignActivationRepository, useClass: PrismaCampaignActivationRepository },
		{ provide: UsageSnapshotRepository, useClass: PrismaUsageSnapshotRepository },
		ChapaClient,
		EntitlementService,
		UsageTrackerService,
		VatInvoiceService,
		ChapaWebhookService,
		EntitlementGuard,
		ListPlansHandler,
		GetSubscriptionHandler,
		GetUsageHandler,
		GetEntitlementsHandler,
		ListSubscriptionInvoicesHandler,
		ListCampaignsHandler,
		GetInvoicePaymentsHandler,
		StartSubscriptionHandler,
		ChangePlanHandler,
		CancelSubscriptionHandler,
		ResumeSubscriptionHandler,
		ActivateCampaignHandler,
		RecordManualPaymentHandler,
		VerifyPaymentHandler,
		InitiateChapaPaymentHandler,
		SubscriptionLifecycleService,
		InvoiceLifecycleService,
		SubscriptionStateGuard,
		BillingLifecycleCron,
		DunningService,
	],
	exports: [
		EntitlementService,
		UsageTrackerService,
		EntitlementGuard,
		SubscriptionLifecycleService,
		InvoiceLifecycleService,
		SubscriptionStateGuard,
		DunningService,
		BillingLifecycleCron,
	],
})
export class BillingModule {}
