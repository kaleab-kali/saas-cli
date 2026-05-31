import { NotificationStreamService } from "./notification-stream.service";

describe("NotificationStreamService", () => {
	it("streams ping, notification, and badge events to the connected user", () => {
		const service = new NotificationStreamService();
		const events: Array<{ type?: string; data: unknown }> = [];
		const subscription = service.streamForUser("user_1").subscribe((event) => events.push(event));

		service.emitToUser("user_1", { title: "Invoice accepted" });
		service.emitBadgeCount("user_1", 3);

		expect(service.clientCount("user_1")).toBe(1);
		expect(events).toEqual([
			expect.objectContaining({ type: "ping", data: expect.objectContaining({ connected: true }) }),
			{ type: "notification", data: { title: "Invoice accepted" } },
			{ type: "badge", data: { unread: 3 } },
		]);

		subscription.unsubscribe();
		expect(service.clientCount("user_1")).toBe(0);
	});

	it("does not broadcast tenant/user scoped events to other subscribers", () => {
		const service = new NotificationStreamService();
		const userOneEvents: Array<{ type?: string; data: unknown }> = [];
		const userTwoEvents: Array<{ type?: string; data: unknown }> = [];
		const userOne = service.streamForUser("user_1").subscribe((event) => userOneEvents.push(event));
		const userTwo = service.streamForUser("user_2").subscribe((event) => userTwoEvents.push(event));

		service.emitToUser("user_1", { title: "Only user one" });

		expect(userOneEvents).toContainEqual({ type: "notification", data: { title: "Only user one" } });
		expect(userTwoEvents).not.toContainEqual({ type: "notification", data: { title: "Only user one" } });

		userOne.unsubscribe();
		userTwo.unsubscribe();
	});
});
