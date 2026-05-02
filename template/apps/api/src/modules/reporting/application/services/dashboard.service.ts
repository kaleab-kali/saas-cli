import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";

/**
 * DashboardService — skeleton.
 *
 * Originally tied to property/lease/workorder/deal/payment domain models. Stubbed
 * for the create-vyllion-saas template. Replace these methods once your domain
 * models exist. The four method shapes (main, property, financial, crm, maintenance)
 * are preserved so the reporting controller / cron / web can compile.
 */
@Injectable()
export class DashboardService {
	constructor(private readonly prisma: PrismaService) {}

	async main(organizationId: string) {
		const [memberCount, notificationCount] = await Promise.all([
			this.prisma.member.count({ where: { organizationId, removedAt: null } }),
			this.prisma.notification.count({ where: { organizationId } }),
		]);
		return {
			kpis: {
				memberCount,
				notificationCount,
			},
			recentActivities: [],
			upcomingEvents: [],
			recentPayments: [],
			recentWorkOrders: [],
			topBuildings: [],
			upcomingLeaseEnds: [],
		};
	}

	async property(_organizationId: string, _buildingId?: string) {
		return {
			buildings: [],
			unitsByBuildingStatus: {},
			unitTypes: [],
			totals: {
				buildings: 0,
				totalUnits: 0,
				occupied: 0,
				available: 0,
				maintenance: 0,
				occupancyRate: 0,
				vacancyRate: 0,
				activeLeases: 0,
				expiringLeases30d: 0,
				openWorkOrders: 0,
				totalRentRoll: 0,
				avgRent: 0,
			},
			vacantUnits: [],
		};
	}

	async financial(_organizationId: string, from: Date, to: Date) {
		return {
			periodStart: from,
			periodEnd: to,
			revenue: 0,
			expenses: 0,
			netIncome: 0,
			profitMargin: 0,
			outstandingAR: 0,
			collectionRate: 0,
			paymentCount: 0,
			poCount: 0,
			avgPayment: 0,
			aging: [],
			budgets: [],
			paymentsByMethod: [],
			overdueInvoices: [],
			revenueTrend: [],
		};
	}

	async crm(_organizationId: string) {
		return {
			kpis: {
				totalContacts: 0,
				totalLeads: 0,
				totalDealsOpen: 0,
				openPipelineValue: 0,
				wonDeals: 0,
				wonValue: 0,
				avgDealValue: 0,
				winRate: 0,
				avgSalesCycleDays: 0,
				agentCount: 0,
				viewingsMtd: 0,
			},
			leadsBySource: [],
			leadsByTemperature: [],
			dealsByStatus: [],
			pipeline: [],
			listingsByStatus: [],
			offersByStatus: [],
			recentWon: [],
			recentLost: [],
		};
	}

	async maintenance(_organizationId: string, _from: Date, _to: Date) {
		return {
			kpis: {
				totalWorkOrders: 0,
				openWorkOrders: 0,
				createdInPeriod: 0,
				completedInPeriod: 0,
				avgResolutionHours: 0,
				slaCompliancePct: 0,
				totalCostInPeriod: 0,
				costEntryCount: 0,
				preventiveDueNext7d: 0,
				inspectionsOverdue: 0,
			},
			byStatus: [],
			byPriority: [],
			byCategory: [],
			byBuilding: [],
			topVendors: [],
			openWorkOrdersAging: [],
		};
	}
}
