import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "#shared/database/prisma.service";
import type { NotificationCategory, NotificationSeverity } from "../../domain/value-objects/notification.vo";
import { CreateNotificationHandler } from "../commands/create-notification/create-notification.handler";

interface EventPayload {
	organizationId: string;
	payload?: Record<string, unknown>;
}

// Map domain event name → category + severity + title builder
const MAP: Record<
	string,
	{
		category: NotificationCategory;
		severity: NotificationSeverity;
		title: (p: Record<string, unknown>) => string;
		link?: (p: Record<string, unknown>) => string;
	}
> = {
	"finance.invoice.created": {
		category: "invoice",
		severity: "info",
		title: (_p) => `New invoice created`,
		link: (_p) => `/leases`,
	},
	"finance.payment.recorded": {
		category: "payment",
		severity: "success",
		title: (p) => `Payment recorded ($${p.amount})`,
	},
	"finance.payment.reversed": {
		category: "payment",
		severity: "warning",
		title: () => `Payment reversed`,
	},
	"lease.created": { category: "lease", severity: "info", title: () => `New lease created` },
	"lease.activated": { category: "lease", severity: "success", title: () => `Lease activated` },
	"lease.terminated": { category: "lease", severity: "warning", title: () => `Lease terminated` },
	"maintenance.work_order.created": {
		category: "work_order",
		severity: "info",
		title: () => `New work order`,
	},
	"maintenance.work_order.assigned": {
		category: "work_order",
		severity: "info",
		title: () => `Work order assigned`,
	},
	"maintenance.work_order.completed": {
		category: "work_order",
		severity: "success",
		title: () => `Work order completed`,
	},
	"procurement.pr.submitted": {
		category: "purchase_request",
		severity: "info",
		title: () => `Purchase request submitted for approval`,
	},
	"procurement.pr.approved": {
		category: "purchase_request",
		severity: "success",
		title: () => `Purchase request approved`,
	},
	"procurement.pr.rejected": {
		category: "purchase_request",
		severity: "error",
		title: () => `Purchase request rejected`,
	},
	"procurement.po.sent": { category: "purchase_order", severity: "info", title: () => `PO sent to vendor` },
	"sales.lead.created": { category: "lead", severity: "info", title: () => `New lead added` },
	"sales.lead.assigned": { category: "lead", severity: "info", title: () => `Lead assigned to you` },
	"sales.deal.won": { category: "deal", severity: "success", title: () => `Deal won!` },
	"sales.deal.lost": { category: "deal", severity: "warning", title: () => `Deal lost` },
	"sales.offer.accepted": { category: "deal", severity: "success", title: () => `Offer accepted` },
	"sales.listing.sold": { category: "listing", severity: "success", title: () => `Listing sold` },
	"sales.viewing.scheduled": {
		category: "viewing",
		severity: "info",
		title: () => `Viewing scheduled`,
	},
};

@Injectable()
export class DomainEventListener {
	private readonly logger = new Logger(DomainEventListener.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly createNotification: CreateNotificationHandler,
	) {}

	private async notifyAdmins(organizationId: string, eventName: string, payload: Record<string, unknown>) {
		const cfg = MAP[eventName];
		if (!cfg) return;
		// Recipients: all org admins + owner (could be made configurable)
		const members = await this.prisma.member.findMany({
			where: {
				organizationId,
				role: { in: ["owner", "admin", "propertyManager", "accountant"] },
			},
			select: { userId: true },
		});
		for (const m of members) {
			try {
				await this.createNotification.execute(organizationId, {
					userId: m.userId,
					category: cfg.category,
					severity: cfg.severity,
					title: cfg.title(payload),
					body: undefined,
					linkUrl: cfg.link?.(payload),
					sourceEvent: eventName,
					sourceRef:
						(payload.invoiceId as string) ?? (payload.paymentId as string) ?? (payload.leaseId as string) ?? undefined,
				});
			} catch (e) {
				this.logger.warn(`Notify failed for ${eventName}: ${(e as Error).message}`);
			}
		}
	}

	@OnEvent("finance.invoice.created") f1(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "finance.invoice.created", e.payload ?? {});
	}
	@OnEvent("finance.payment.recorded") f2(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "finance.payment.recorded", e.payload ?? {});
	}
	@OnEvent("finance.payment.reversed") f3(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "finance.payment.reversed", e.payload ?? {});
	}
	@OnEvent("lease.created") l1(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "lease.created", e.payload ?? {});
	}
	@OnEvent("lease.activated") l2(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "lease.activated", e.payload ?? {});
	}
	@OnEvent("lease.terminated") l3(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "lease.terminated", e.payload ?? {});
	}
	@OnEvent("maintenance.work_order.created") m1(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "maintenance.work_order.created", e.payload ?? {});
	}
	@OnEvent("maintenance.work_order.assigned") m2(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "maintenance.work_order.assigned", e.payload ?? {});
	}
	@OnEvent("maintenance.work_order.completed") m3(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "maintenance.work_order.completed", e.payload ?? {});
	}
	@OnEvent("procurement.pr.submitted") p1(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "procurement.pr.submitted", e.payload ?? {});
	}
	@OnEvent("procurement.pr.approved") p2(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "procurement.pr.approved", e.payload ?? {});
	}
	@OnEvent("procurement.pr.rejected") p3(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "procurement.pr.rejected", e.payload ?? {});
	}
	@OnEvent("procurement.po.sent") p4(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "procurement.po.sent", e.payload ?? {});
	}
	@OnEvent("sales.lead.created") s1(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "sales.lead.created", e.payload ?? {});
	}
	@OnEvent("sales.lead.assigned") s2(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "sales.lead.assigned", e.payload ?? {});
	}
	@OnEvent("sales.deal.won") s3(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "sales.deal.won", e.payload ?? {});
	}
	@OnEvent("sales.deal.lost") s4(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "sales.deal.lost", e.payload ?? {});
	}
	@OnEvent("sales.offer.accepted") s5(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "sales.offer.accepted", e.payload ?? {});
	}
	@OnEvent("sales.listing.sold") s6(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "sales.listing.sold", e.payload ?? {});
	}
	@OnEvent("sales.viewing.scheduled") s7(e: EventPayload) {
		return this.notifyAdmins(e.organizationId, "sales.viewing.scheduled", e.payload ?? {});
	}
}
