import { EimsSubmissionQueueService } from "./eims-submission-queue.service";

describe("EimsSubmissionQueueService", () => {
	it("attaches source-scoped queue metadata and previous IRN to dispatches", async () => {
		const queue = new EimsSubmissionQueueService();
		queue.seedSourceState("org_test", "src_front", {
			lastAcceptedCounter: 128,
			lastAcceptedIrn: "IRN-PREVIOUS",
		});

		const response = await queue.enqueueInvoice(
			{
				organizationId: "org_test",
				sourceSystemId: "src_front",
				documentNumber: "INV-001",
				payload: { documentType: "INV" },
			},
			async (queued) => ({
				data: {
					id: "sub_001",
					status: "accepted",
					irn: "IRN-CURRENT",
					counter: queued.counter,
					previousIrn: queued.previousIrn,
				},
			}),
		);

		expect(response).toMatchObject({
			data: {
				status: "accepted",
				counter: 129,
				previousIrn: "IRN-PREVIOUS",
			},
			meta: {
				queue: {
					queueName: "eims:submission:org_test:src_front",
					sourceSystemId: "src_front",
					counter: 129,
					previousIrn: "IRN-PREVIOUS",
					reservationStatus: "accepted",
				},
			},
		});
		expect(queue.snapshotSource("org_test", "src_front")).toMatchObject({
			lastAcceptedCounter: 129,
			lastAcceptedIrn: "IRN-CURRENT",
			nextCounter: 130,
		});
	});

	it("serializes submissions per source without blocking other sources", async () => {
		const queue = new EimsSubmissionQueueService();
		const order: string[] = [];
		let releaseFirstSource: (() => void) | undefined;
		const firstSourceGate = new Promise<void>((resolve) => {
			releaseFirstSource = resolve;
		});

		const first = queue.enqueueInvoice({ organizationId: "org_test", sourceSystemId: "src_front" }, async () => {
			order.push("front-1-start");
			await firstSourceGate;
			order.push("front-1-end");
			return { data: { status: "accepted", irn: "IRN-FRONT-1" } };
		});
		const second = queue.enqueueInvoice({ organizationId: "org_test", sourceSystemId: "src_front" }, async () => {
			order.push("front-2-start");
			return { data: { status: "accepted", irn: "IRN-FRONT-2" } };
		});
		const otherSource = queue.enqueueInvoice({ organizationId: "org_test", sourceSystemId: "src_bar" }, async () => {
			order.push("bar-1-start");
			return { data: { status: "accepted", irn: "IRN-BAR-1" } };
		});

		await otherSource;
		expect(order).toEqual(["front-1-start", "bar-1-start"]);
		releaseFirstSource?.();
		await Promise.all([first, second]);

		expect(order).toEqual(["front-1-start", "bar-1-start", "front-1-end", "front-2-start"]);
		expect(queue.snapshotSource("org_test", "src_front")).toMatchObject({
			lastAcceptedCounter: 2,
			lastAcceptedIrn: "IRN-FRONT-2",
		});
		expect(queue.snapshotSource("org_test", "src_bar")).toMatchObject({
			lastAcceptedCounter: 1,
			lastAcceptedIrn: "IRN-BAR-1",
		});
	});

	it("keeps retryable and unknown outcomes out of the accepted counter chain", async () => {
		const queue = new EimsSubmissionQueueService();

		const retryable = await queue.enqueueInvoice(
			{ organizationId: "org_test", sourceSystemId: "src_front" },
			async () => ({
				data: { status: "failed_retryable", irn: null },
			}),
		);
		const accepted = await queue.enqueueInvoice(
			{ organizationId: "org_test", sourceSystemId: "src_front" },
			async () => ({
				data: { status: "accepted", irn: "IRN-AFTER-RETRYABLE" },
			}),
		);

		expect(retryable.meta?.queue).toMatchObject({
			counter: 1,
			previousIrn: null,
			reservationStatus: "unknown",
		});
		expect(accepted.meta?.queue).toMatchObject({
			counter: 2,
			previousIrn: null,
			reservationStatus: "accepted",
		});
		expect(queue.snapshotSource("org_test", "src_front")).toMatchObject({
			lastAcceptedCounter: 2,
			lastAcceptedIrn: "IRN-AFTER-RETRYABLE",
			nextCounter: 3,
		});
	});
});
