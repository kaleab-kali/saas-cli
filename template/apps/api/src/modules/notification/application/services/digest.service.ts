import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "#shared/database/prisma.service";
import { EmailDispatcherService } from "./email-dispatcher.service";

@Injectable()
export class DigestService {
	private readonly logger = new Logger(DigestService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly dispatcher: EmailDispatcherService,
	) {}

	@Cron(CronExpression.EVERY_DAY_AT_8AM)
	async daily() {
		await this.runDigest("daily");
	}

	@Cron("0 8 * * 1") // Monday 8am
	async weekly() {
		await this.runDigest("weekly");
	}

	private async runDigest(frequency: "daily" | "weekly") {
		const windowMs = frequency === "daily" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
		const since = new Date(Date.now() - windowMs);

		const prefs = await this.prisma.notificationPreference.findMany({
			where: { email: frequency },
		});
		const byUser = new Map<string, Set<string>>();
		for (const p of prefs) {
			if (!byUser.has(p.userId)) byUser.set(p.userId, new Set());
			byUser.get(p.userId)?.add(p.eventKey);
		}
		if (byUser.size === 0) return;

		for (const [userId, eventKeys] of byUser) {
			const notifications = await this.prisma.notification.findMany({
				where: {
					userId,
					createdAt: { gte: since },
					sourceEvent: { in: Array.from(eventKeys) },
				},
				orderBy: { createdAt: "desc" },
				take: 100,
			});
			if (notifications.length === 0) continue;

			const user = await this.prisma.user.findUnique({ where: { id: userId } });
			if (!user?.email) continue;
			const orgId = notifications[0].organizationId;

			const list = notifications
				.map((n) => `<li><strong>${n.title}</strong> — ${new Date(n.createdAt).toLocaleString()}</li>`)
				.join("");
			const appName = process.env.APP_NAME ?? "SaaS Platform";
			const html = `<p>Hi ${user.name ?? "there"},</p><p>Your ${frequency} ${appName} digest (${notifications.length} events):</p><ul>${list}</ul>`;
			const text = notifications.map((n) => `- ${n.title} (${new Date(n.createdAt).toLocaleString()})`).join("\n");

			await this.dispatcher.dispatch({
				organizationId: orgId,
				to: user.email,
				subject: `${appName} ${frequency} digest (${notifications.length} events)`,
				html,
				text,
				source: "digest",
				sourceRef: userId,
			});
			this.logger.log(`Sent ${frequency} digest to ${user.email} (${notifications.length} events)`);
		}
	}
}
