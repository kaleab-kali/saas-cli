import { BadRequestException, ConflictException } from "@nestjs/common";
import { OnboardingService, parseStepDefinitions } from "./onboarding.service";

const stepDefinitions = [
	{
		key: "tenant-intake",
		stepOrder: 1,
		title: "Capture tenant intake",
		description: "Capture launch details",
		category: "setup",
		assigneeType: "STAFF",
		canBeSelfService: false,
	},
	{
		key: "organization-profile",
		stepOrder: 2,
		title: "Confirm organization profile",
		description: "Confirm tenant profile",
		category: "profile",
		assigneeType: "TENANT",
		canBeSelfService: true,
	},
] as const;

const taskSteps = [
	{
		id: "step_intake",
		taskId: "task_1",
		stepKey: "tenant-intake",
		stepOrder: 1,
		title: "Capture tenant intake",
		description: "Capture launch details",
		category: "setup",
		assigneeType: "STAFF",
		canBeSelfService: false,
		status: "IN_PROGRESS",
		startedAt: new Date("2026-01-01T00:00:00.000Z"),
		completedAt: null,
		completedByUserId: null,
		notes: null,
		capturedData: null,
		blocked: false,
		blockedReason: null,
	},
	{
		id: "step_profile",
		taskId: "task_1",
		stepKey: "organization-profile",
		stepOrder: 2,
		title: "Confirm organization profile",
		description: "Confirm tenant profile",
		category: "profile",
		assigneeType: "TENANT",
		canBeSelfService: true,
		status: "PENDING",
		startedAt: null,
		completedAt: null,
		completedByUserId: null,
		notes: null,
		capturedData: null,
		blocked: false,
		blockedReason: null,
	},
] as const;

const task = {
	id: "task_1",
	organizationId: "org_1",
	templateKey: "generic-saas-setup",
	mode: "CONCIERGE",
	status: "ACTIVE",
	currentStepKey: "tenant-intake",
	assignedToUserId: "staff_1",
	contactName: "Demo Owner",
	contactPhone: "+251911000000",
	contactEmail: "owner@example.test",
	startedAt: new Date("2026-01-01T00:00:00.000Z"),
	completedAt: null,
	blockedReason: null,
	metadata: { preferredChannel: "WhatsApp" },
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
	organization: { id: "org_1", name: "Demo Cafe", slug: "demo-cafe", createdAt: new Date("2026-01-01T00:00:00.000Z") },
	assignedTo: { id: "staff_1", name: "Staff Owner", email: "staff@example.test", image: null },
	steps: taskSteps,
	activities: [],
};

const makePrisma = () => {
	const prisma = {
		onboardingTaskTemplate: {
			findMany: jest.fn().mockResolvedValue([]),
			findUnique: jest.fn().mockResolvedValue({
				key: "generic-saas-setup",
				isActive: true,
				stepDefinitions,
			}),
		},
		organization: {
			findUnique: jest.fn().mockResolvedValue({ id: "org_1", name: "Demo Cafe" }),
		},
		onboardingTask: {
			count: jest.fn().mockResolvedValue(0),
			create: jest.fn().mockResolvedValue({ id: "task_1" }),
			findMany: jest.fn().mockResolvedValue([task]),
			findUnique: jest.fn().mockResolvedValue(null),
			findUniqueOrThrow: jest.fn().mockResolvedValue(task),
			update: jest.fn(),
		},
		onboardingTaskStep: {
			createMany: jest.fn(),
			update: jest.fn(),
		},
		onboardingActivity: {
			create: jest.fn(),
		},
		organizationSettings: {
			updateMany: jest.fn(),
			upsert: jest.fn(),
		},
		user: {
			findUnique: jest.fn().mockResolvedValue({ id: "staff_1" }),
		},
		$transaction: jest.fn(),
	};
	prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
	return prisma;
};

const makeService = () => {
	const prisma = makePrisma();
	const events = { emit: jest.fn() };
	return {
		events,
		prisma,
		service: new OnboardingService(prisma as never, events as never),
	};
};

describe("OnboardingService", () => {
	it("creates a staff-assisted onboarding task from a template and emits a start event", async () => {
		const { events, prisma, service } = makeService();

		const result = await service.createTask(
			{
				organizationId: "org_1",
				templateKey: "generic-saas-setup",
				mode: "CONCIERGE",
				contactName: " Demo Owner ",
				contactPhone: "0911000000",
				contactEmail: "OWNER@EXAMPLE.TEST ",
				assignedToUserId: "staff_1",
				metadata: { preferredChannel: "WhatsApp" },
			},
			"admin_1",
		);

		expect(prisma.onboardingTask.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					assignedToUserId: "staff_1",
					contactEmail: "owner@example.test",
					contactName: "Demo Owner",
					contactPhone: "+251911000000",
					currentStepKey: "tenant-intake",
					mode: "CONCIERGE",
				}),
			}),
		);
		expect(prisma.onboardingTaskStep.createMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({ stepKey: "tenant-intake", status: "IN_PROGRESS", startedAt: expect.any(Date) }),
				expect.objectContaining({ stepKey: "organization-profile", status: "PENDING", startedAt: null }),
			],
		});
		expect(prisma.organizationSettings.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				create: expect.objectContaining({ onboardingStep: "tenant-intake", organizationId: "org_1" }),
				update: { onboardingStep: "tenant-intake" },
			}),
		);
		expect(events.emit).toHaveBeenCalledWith("onboarding.task.started", expect.any(Object));
		expect(result.progress).toEqual({ total: 2, completed: 0, currentStepKey: "tenant-intake", percent: 0 });
	});

	it("rejects task creation when the organization already has a workflow", async () => {
		const { prisma, service } = makeService();
		prisma.onboardingTask.findUnique.mockResolvedValueOnce(task);

		await expect(
			service.createTask(
				{
					organizationId: "org_1",
					templateKey: "generic-saas-setup",
					contactName: "Owner",
					contactPhone: "+251911000000",
					contactEmail: "owner@example.test",
				},
				"admin_1",
			),
		).rejects.toThrow(ConflictException);
	});

	it("builds filterable, sorted task queries with bounded pagination and summary data", async () => {
		const { prisma, service } = makeService();
		prisma.onboardingTaskTemplate.findMany.mockResolvedValueOnce([{ key: "generic-saas-setup" }]);
		prisma.onboardingTask.count
			.mockResolvedValueOnce(1)
			.mockResolvedValueOnce(2)
			.mockResolvedValueOnce(1)
			.mockResolvedValueOnce(3)
			.mockResolvedValueOnce(4);

		const result = await service.listTasks({
			assignedToUserId: "UNASSIGNED",
			limit: 250,
			mode: "CONCIERGE",
			page: 0,
			search: " Demo ",
			sort: "tenant:asc",
			staleDays: 7,
			status: "ACTIVE",
			vertical: "generic",
		});

		expect(prisma.onboardingTask.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { contactName: "asc" },
				skip: 0,
				take: 100,
				where: expect.objectContaining({
					assignedToUserId: null,
					mode: "CONCIERGE",
					OR: expect.any(Array),
					status: "ACTIVE",
					steps: expect.objectContaining({ some: expect.objectContaining({ status: "IN_PROGRESS" }) }),
					templateKey: { in: ["generic-saas-setup"] },
				}),
			}),
		);
		expect(result.meta).toEqual({ page: 1, limit: 100, total: 1, totalPages: 1 });
		expect(result.summary).toEqual({ active: 2, blocked: 1, completedThisMonth: 3, stale: 4 });
	});

	it("advances to the next step and updates organization settings", async () => {
		const { events, prisma, service } = makeService();
		const nextTask = {
			...task,
			currentStepKey: "organization-profile",
			steps: [
				{ ...taskSteps[0], status: "COMPLETED", completedAt: new Date("2026-01-02T00:00:00.000Z") },
				{ ...taskSteps[1], status: "IN_PROGRESS", startedAt: new Date("2026-01-02T00:00:00.000Z") },
			],
		};
		prisma.onboardingTask.findUnique.mockResolvedValueOnce(task);
		prisma.onboardingTask.findUniqueOrThrow.mockResolvedValueOnce(nextTask);

		const result = await service.completeStep("task_1", "tenant-intake", { notes: "Verified intake" }, "staff_1");

		expect(prisma.onboardingTaskStep.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "step_intake" },
				data: expect.objectContaining({ completedByUserId: "staff_1", notes: "Verified intake", status: "COMPLETED" }),
			}),
		);
		expect(prisma.onboardingTask.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ currentStepKey: "organization-profile", status: "ACTIVE" }),
			}),
		);
		expect(prisma.organizationSettings.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ data: { onboardingStep: "organization-profile" } }),
		);
		expect(events.emit).toHaveBeenCalledWith("onboarding.step.completed", expect.any(Object));
		expect(result.progress).toEqual({ total: 2, completed: 1, currentStepKey: "organization-profile", percent: 50 });
	});

	it("prevents tenant self-service completion for staff-only steps", async () => {
		const { prisma, service } = makeService();
		prisma.onboardingTask.findUnique.mockResolvedValueOnce(task);

		await expect(
			service.completeStep("task_1", "tenant-intake", { notes: "Tenant tried to skip intake" }, "user_1", {
				tenantSelfServiceOnly: true,
			}),
		).rejects.toThrow(BadRequestException);
		expect(prisma.onboardingTaskStep.update).not.toHaveBeenCalled();
	});

	it("marks the workflow complete when the final pending step is completed", async () => {
		const { events, prisma, service } = makeService();
		const finalStepTask = {
			...task,
			currentStepKey: "organization-profile",
			steps: [
				{ ...taskSteps[0], status: "COMPLETED", completedAt: new Date("2026-01-01T00:00:00.000Z") },
				{ ...taskSteps[1], status: "IN_PROGRESS", startedAt: new Date("2026-01-02T00:00:00.000Z") },
			],
		};
		const completedTask = {
			...finalStepTask,
			status: "COMPLETED",
			currentStepKey: null,
			completedAt: new Date("2026-01-03T00:00:00.000Z"),
			steps: [
				finalStepTask.steps[0],
				{ ...finalStepTask.steps[1], status: "COMPLETED", completedAt: new Date("2026-01-03T00:00:00.000Z") },
			],
		};
		prisma.onboardingTask.findUnique.mockResolvedValueOnce(finalStepTask);
		prisma.onboardingTask.findUniqueOrThrow.mockResolvedValueOnce(completedTask);

		const result = await service.completeStep("task_1", "organization-profile", {}, "user_1");

		expect(prisma.onboardingTask.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ completedAt: expect.any(Date), currentStepKey: null, status: "COMPLETED" }),
			}),
		);
		expect(prisma.organizationSettings.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ onboardingCompletedAt: expect.any(Date), onboardingStep: null }),
			}),
		);
		expect(events.emit).toHaveBeenCalledWith("onboarding.task.completed", expect.any(Object));
		expect(result.progress).toEqual({ total: 2, completed: 2, currentStepKey: null, percent: 100 });
	});

	it("blocks an onboarding task with an auditable reason and emits a domain event", async () => {
		const { events, prisma, service } = makeService();
		const blockedTask = { ...task, status: "BLOCKED", blockedReason: "Missing payment receipt" };
		prisma.onboardingTask.findUniqueOrThrow.mockResolvedValueOnce(blockedTask);

		const result = await service.blockTask("task_1", { reason: "Missing payment receipt" }, "staff_1");

		expect(prisma.onboardingTask.update).toHaveBeenCalledWith({
			where: { id: "task_1" },
			data: { status: "BLOCKED", blockedReason: "Missing payment receipt" },
		});
		expect(prisma.onboardingActivity.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					message: "Blocked onboarding: Missing payment receipt",
					type: "STAFF_ACTION",
				}),
			}),
		);
		expect(events.emit).toHaveBeenCalledWith("onboarding.task.blocked", expect.any(Object));
		expect(result.status).toBe("BLOCKED");
	});
});

describe("parseStepDefinitions", () => {
	it("sorts valid step definitions by explicit order", () => {
		expect(parseStepDefinitions([stepDefinitions[1], stepDefinitions[0]] as never)).toEqual([
			stepDefinitions[0],
			stepDefinitions[1],
		]);
	});

	it("rejects empty or malformed template definitions", () => {
		expect(() => parseStepDefinitions([] as never)).toThrow(BadRequestException);
		expect(() => parseStepDefinitions([{ title: "Missing key" }] as never)).toThrow(BadRequestException);
	});
});
