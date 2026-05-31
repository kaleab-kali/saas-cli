import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "#shared/database/prisma.service";
import { normalizePhoneNumber } from "#shared/i18n/phone.util";
import type { Prisma } from "../../../generated/prisma/client";
import { OnboardingStepCompletedEvent } from "../domain/events/onboarding-step-completed.event";
import { OnboardingTaskBlockedEvent } from "../domain/events/onboarding-task-blocked.event";
import { OnboardingTaskCompletedEvent } from "../domain/events/onboarding-task-completed.event";
import { OnboardingTaskStartedEvent } from "../domain/events/onboarding-task-started.event";
import { calculateOnboardingProgress } from "../domain/onboarding-progress";
import type {
	AssignOnboardingTaskDto,
	BlockOnboardingTaskDto,
	CompleteOnboardingStepDto,
	CreateOnboardingTaskDto,
	ListOnboardingTasksQueryDto,
} from "../presentation/dtos/onboarding.dto";

export const GENERIC_ONBOARDING_TEMPLATE_KEY = "generic-saas-setup";

export interface OnboardingStepDefinition {
	readonly key: string;
	readonly stepOrder: number;
	readonly title: string;
	readonly description?: string;
	readonly category: string;
	readonly assigneeType: "TENANT" | "STAFF";
	readonly canBeSelfService: boolean;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const STALE_STEP_DAYS = 5;
const SORT_FIELDS = {
	assigned: "assignedToUserId",
	contactEmail: "contactEmail",
	currentStep: "currentStepKey",
	mode: "mode",
	startedAt: "startedAt",
	status: "status",
	tenant: "contactName",
	templateKey: "templateKey",
} as const;

export const GENERIC_ONBOARDING_STEPS: readonly OnboardingStepDefinition[] = [
	{
		key: "tenant-intake",
		stepOrder: 1,
		title: "Capture tenant intake",
		description: "Record owner contact, preferred support channel, billing evidence, and staff owner.",
		category: "setup",
		assigneeType: "STAFF",
		canBeSelfService: false,
	},
	{
		key: "organization-profile",
		stepOrder: 2,
		title: "Confirm organization profile",
		description: "Collect legal name, contact details, timezone, currency, and operating country.",
		category: "profile",
		assigneeType: "TENANT",
		canBeSelfService: true,
	},
	{
		key: "workspace-branding",
		stepOrder: 3,
		title: "Set workspace branding",
		description: "Add logo, app name, and an accent color for the tenant workspace.",
		category: "setup",
		assigneeType: "TENANT",
		canBeSelfService: true,
	},
	{
		key: "invite-team",
		stepOrder: 4,
		title: "Invite launch team",
		description: "Invite admins and operators before production use starts.",
		category: "access",
		assigneeType: "TENANT",
		canBeSelfService: true,
	},
	{
		key: "billing-confirmed",
		stepOrder: 5,
		title: "Verify subscription evidence",
		description: "Confirm plan, receipt reference, payment method, or approved trial terms.",
		category: "billing",
		assigneeType: "STAFF",
		canBeSelfService: false,
	},
	{
		key: "first-workflow-check",
		stepOrder: 6,
		title: "Run first workflow check",
		description: "Validate the tenant can complete the first operational workflow with support nearby.",
		category: "verification",
		assigneeType: "STAFF",
		canBeSelfService: false,
	},
	{
		key: "production-launch",
		stepOrder: 7,
		title: "Approve production launch",
		description: "Staff confirms training, evidence, and support handoff before production use starts.",
		category: "launch",
		assigneeType: "STAFF",
		canBeSelfService: false,
	},
];

const taskInclude = {
	organization: { select: { id: true, name: true, slug: true, createdAt: true } },
	assignedTo: { select: { id: true, name: true, email: true, image: true } },
	steps: { orderBy: { stepOrder: "asc" as const } },
	activities: { orderBy: { createdAt: "desc" as const }, take: 50 },
} satisfies Prisma.OnboardingTaskInclude;

type TaskWithDetails = Prisma.OnboardingTaskGetPayload<{ include: typeof taskInclude }>;

@Injectable()
export class OnboardingService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly events: EventEmitter2,
	) {}

	async listTemplates() {
		return this.prisma.onboardingTaskTemplate.findMany({
			where: { isActive: true },
			orderBy: [{ vertical: "asc" }, { name: "asc" }],
		});
	}

	async listTasks(query: ListOnboardingTasksQueryDto) {
		const page = Math.max(1, query.page ?? 1);
		const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
		const where: Prisma.OnboardingTaskWhereInput = {};

		if (query.status) where.status = query.status;
		if (query.mode) where.mode = query.mode;
		if (query.templateKey) where.templateKey = query.templateKey;
		if (query.assignedToUserId) {
			where.assignedToUserId = query.assignedToUserId === "UNASSIGNED" ? null : query.assignedToUserId;
		}
		if (query.vertical) {
			const templates = await this.prisma.onboardingTaskTemplate.findMany({
				where: { vertical: query.vertical, isActive: true },
				select: { key: true },
			});
			where.templateKey = { in: templates.map((template) => template.key) };
		}
		if (query.staleDays) {
			const staleCutoff = new Date(Date.now() - Math.max(1, query.staleDays) * 24 * 60 * 60 * 1000);
			where.steps = { some: { status: "IN_PROGRESS", startedAt: { lt: staleCutoff } } };
		}
		const search = query.search?.trim();
		if (search) {
			where.OR = [
				{ contactName: { contains: search, mode: "insensitive" } },
				{ contactEmail: { contains: search, mode: "insensitive" } },
				{ contactPhone: { contains: search, mode: "insensitive" } },
				{ currentStepKey: { contains: search, mode: "insensitive" } },
				{ templateKey: { contains: search, mode: "insensitive" } },
				{ organization: { name: { contains: search, mode: "insensitive" } } },
			];
		}

		const [rows, total, summary] = await Promise.all([
			this.prisma.onboardingTask.findMany({
				where,
				include: taskInclude,
				orderBy: onboardingSort(query.sort),
				skip: (page - 1) * limit,
				take: limit,
			}),
			this.prisma.onboardingTask.count({ where }),
			this.summary(),
		]);

		return {
			data: rows.map((task) => this.serializeTask(task)),
			meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
			summary,
		};
	}

	async summary() {
		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const staleCutoff = new Date(now.getTime() - STALE_STEP_DAYS * 24 * 60 * 60 * 1000);

		const [active, blocked, completedThisMonth, stale] = await Promise.all([
			this.prisma.onboardingTask.count({ where: { status: "ACTIVE" } }),
			this.prisma.onboardingTask.count({ where: { status: "BLOCKED" } }),
			this.prisma.onboardingTask.count({ where: { status: "COMPLETED", completedAt: { gte: monthStart } } }),
			this.prisma.onboardingTask.count({
				where: {
					status: "ACTIVE",
					steps: { some: { status: "IN_PROGRESS", startedAt: { lt: staleCutoff } } },
				},
			}),
		]);

		return { active, blocked, completedThisMonth, stale };
	}

	async listStuckTasks(days = STALE_STEP_DAYS) {
		const cutoff = new Date(Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000);
		const rows = await this.prisma.onboardingTask.findMany({
			where: {
				status: "ACTIVE",
				steps: { some: { status: "IN_PROGRESS", startedAt: { lt: cutoff } } },
			},
			include: taskInclude,
			orderBy: { startedAt: "asc" },
			take: 100,
		});
		return rows.map((task) => this.serializeTask(task));
	}

	async getTask(taskId: string) {
		const task = await this.prisma.onboardingTask.findUnique({ where: { id: taskId }, include: taskInclude });
		if (!task) throw new NotFoundException("onboarding task");
		return this.serializeTask(task);
	}

	async getTenantTask(organizationId: string) {
		const task = await this.prisma.onboardingTask.findUnique({ where: { organizationId }, include: taskInclude });
		if (task) return this.serializeTask(task);

		return {
			task: null,
			defaultTemplate: {
				key: GENERIC_ONBOARDING_TEMPLATE_KEY,
				name: "Generic SaaS setup",
				steps: GENERIC_ONBOARDING_STEPS,
			},
		};
	}

	async createTask(dto: CreateOnboardingTaskDto, createdByUserId: string | null) {
		const template = await this.prisma.onboardingTaskTemplate.findUnique({ where: { key: dto.templateKey } });
		if (!template?.isActive) throw new NotFoundException("onboarding task template");

		const organization = await this.prisma.organization.findUnique({ where: { id: dto.organizationId } });
		if (!organization) throw new NotFoundException("organization");

		const existing = await this.prisma.onboardingTask.findUnique({ where: { organizationId: dto.organizationId } });
		if (existing) throw new ConflictException("organization already has an onboarding task");

		const steps = parseStepDefinitions(template.stepDefinitions);
		const firstStep = steps[0];
		if (!firstStep) throw new BadRequestException("onboarding template has no steps");

		const task = await this.prisma.$transaction(async (tx) => {
			const created = await tx.onboardingTask.create({
				data: {
					organizationId: dto.organizationId,
					templateKey: dto.templateKey,
					mode: dto.mode ?? "CONCIERGE",
					status: "ACTIVE",
					currentStepKey: firstStep.key,
					assignedToUserId: dto.assignedToUserId || null,
					contactName: dto.contactName.trim(),
					contactPhone: normalizePhoneNumber(dto.contactPhone),
					contactEmail: dto.contactEmail.toLowerCase().trim(),
					metadata: (dto.metadata ?? {}) as never,
				},
			});

			await tx.onboardingTaskStep.createMany({
				data: steps.map((step) => ({
					taskId: created.id,
					stepKey: step.key,
					stepOrder: step.stepOrder,
					title: step.title,
					description: step.description ?? null,
					category: step.category,
					assigneeType: step.assigneeType,
					canBeSelfService: step.canBeSelfService,
					status: step.key === firstStep.key ? "IN_PROGRESS" : "PENDING",
					startedAt: step.key === firstStep.key ? new Date() : null,
				})),
			});

			await tx.onboardingActivity.create({
				data: {
					taskId: created.id,
					type: "SYSTEM_ACTION",
					message: "Onboarding task created",
					userId: createdByUserId,
					metadata: { templateKey: dto.templateKey } as never,
				},
			});

			await tx.organizationSettings.upsert({
				where: { organizationId: dto.organizationId },
				update: { onboardingStep: firstStep.key },
				create: {
					organizationId: dto.organizationId,
					onboardingStep: firstStep.key,
				},
			});

			return tx.onboardingTask.findUniqueOrThrow({ where: { id: created.id }, include: taskInclude });
		});

		this.events.emit(
			"onboarding.task.started",
			new OnboardingTaskStartedEvent(task.id, task.organizationId, task.templateKey),
		);
		return this.serializeTask(task);
	}

	async completeStep(
		taskId: string,
		stepKey: string,
		dto: CompleteOnboardingStepDto,
		userId: string | null,
		options: { tenantSelfServiceOnly?: boolean } = {},
	) {
		const result = await this.prisma.$transaction(async (tx) => {
			const task = await tx.onboardingTask.findUnique({
				where: { id: taskId },
				include: { steps: { orderBy: { stepOrder: "asc" } } },
			});
			if (!task) throw new NotFoundException("onboarding task");
			if (task.status === "CANCELLED") throw new BadRequestException("onboarding task is cancelled");
			if (task.status === "COMPLETED") throw new BadRequestException("onboarding task is already completed");

			const step = task.steps.find((candidate) => candidate.stepKey === stepKey);
			if (!step) throw new NotFoundException("onboarding step");
			if (options.tenantSelfServiceOnly && step.assigneeType !== "TENANT" && !step.canBeSelfService) {
				throw new BadRequestException("step is not available for tenant self-service");
			}
			if (step.status === "COMPLETED") {
				return tx.onboardingTask.findUniqueOrThrow({ where: { id: taskId }, include: taskInclude });
			}

			const now = new Date();
			await tx.onboardingTaskStep.update({
				where: { id: step.id },
				data: {
					status: "COMPLETED",
					completedAt: now,
					completedByUserId: userId,
					notes: dto.notes,
					capturedData: dto.capturedData ? (dto.capturedData as never) : undefined,
					blocked: false,
					blockedReason: null,
				},
			});

			const next = task.steps.find(
				(candidate) => candidate.stepOrder > step.stepOrder && candidate.status === "PENDING",
			);
			if (next) {
				await tx.onboardingTaskStep.update({
					where: { id: next.id },
					data: { status: "IN_PROGRESS", startedAt: now },
				});
				await tx.onboardingTask.update({
					where: { id: taskId },
					data: { status: "ACTIVE", currentStepKey: next.stepKey, blockedReason: null },
				});
				await tx.organizationSettings.updateMany({
					where: { organizationId: task.organizationId },
					data: { onboardingStep: next.stepKey },
				});
			} else {
				await tx.onboardingTask.update({
					where: { id: taskId },
					data: { status: "COMPLETED", currentStepKey: null, completedAt: now, blockedReason: null },
				});
				await tx.organizationSettings.updateMany({
					where: { organizationId: task.organizationId },
					data: { onboardingStep: null, onboardingCompletedAt: now },
				});
			}

			await tx.onboardingActivity.create({
				data: {
					taskId,
					type: options.tenantSelfServiceOnly ? "TENANT_ACTION" : "STAFF_ACTION",
					message: `Completed step: ${step.title}`,
					userId,
					metadata: { stepKey } as never,
				},
			});

			return tx.onboardingTask.findUniqueOrThrow({ where: { id: taskId }, include: taskInclude });
		});

		this.events.emit("onboarding.step.completed", new OnboardingStepCompletedEvent(taskId, stepKey, userId));
		if (result.status === "COMPLETED") {
			this.events.emit("onboarding.task.completed", new OnboardingTaskCompletedEvent(taskId));
		}

		return this.serializeTask(result);
	}

	async assignTask(taskId: string, dto: AssignOnboardingTaskDto, userId: string | null) {
		const assignedToUserId = dto.assignedToUserId || null;
		if (assignedToUserId) {
			const user = await this.prisma.user.findUnique({ where: { id: assignedToUserId }, select: { id: true } });
			if (!user) throw new NotFoundException("assigned user");
		}

		const task = await this.prisma.$transaction(async (tx) => {
			await tx.onboardingTask.update({ where: { id: taskId }, data: { assignedToUserId } });
			await tx.onboardingActivity.create({
				data: {
					taskId,
					type: "STAFF_ACTION",
					message: assignedToUserId ? "Assigned onboarding task" : "Cleared onboarding assignment",
					userId,
					metadata: { assignedToUserId } as never,
				},
			});
			return tx.onboardingTask.findUniqueOrThrow({ where: { id: taskId }, include: taskInclude });
		});

		return this.serializeTask(task);
	}

	async blockTask(taskId: string, dto: BlockOnboardingTaskDto, userId: string | null) {
		const task = await this.prisma.$transaction(async (tx) => {
			await tx.onboardingTask.update({
				where: { id: taskId },
				data: { status: "BLOCKED", blockedReason: dto.reason },
			});
			await tx.onboardingActivity.create({
				data: {
					taskId,
					type: "STAFF_ACTION",
					message: `Blocked onboarding: ${dto.reason}`,
					userId,
				},
			});
			return tx.onboardingTask.findUniqueOrThrow({ where: { id: taskId }, include: taskInclude });
		});

		this.events.emit("onboarding.task.blocked", new OnboardingTaskBlockedEvent(taskId, dto.reason, userId));
		return this.serializeTask(task);
	}

	async cancelTask(taskId: string, userId: string | null) {
		const task = await this.prisma.$transaction(async (tx) => {
			await tx.onboardingTask.update({
				where: { id: taskId },
				data: { status: "CANCELLED", currentStepKey: null },
			});
			await tx.onboardingActivity.create({
				data: { taskId, type: "STAFF_ACTION", message: "Cancelled onboarding task", userId },
			});
			return tx.onboardingTask.findUniqueOrThrow({ where: { id: taskId }, include: taskInclude });
		});

		return this.serializeTask(task);
	}

	private serializeTask(task: TaskWithDetails) {
		return {
			...task,
			progress: calculateOnboardingProgress(task.steps),
		};
	}
}

export function parseStepDefinitions(value: Prisma.JsonValue): OnboardingStepDefinition[] {
	if (!Array.isArray(value)) throw new BadRequestException("onboarding template stepDefinitions must be an array");

	const steps = value.map((raw, index) => {
		if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
			throw new BadRequestException(`onboarding step ${index + 1} must be an object`);
		}
		const item = raw as Record<string, unknown>;
		const key = asRequiredString(item.key, `stepDefinitions[${index}].key`);
		const title = asRequiredString(item.title, `stepDefinitions[${index}].title`);
		const category = asRequiredString(item.category, `stepDefinitions[${index}].category`);
		const assigneeType: "TENANT" | "STAFF" = item.assigneeType === "TENANT" ? "TENANT" : "STAFF";
		const stepOrder =
			typeof item.stepOrder === "number" && Number.isInteger(item.stepOrder) ? item.stepOrder : index + 1;
		const description = typeof item.description === "string" ? item.description : undefined;

		return {
			key,
			stepOrder,
			title,
			description,
			category,
			assigneeType,
			canBeSelfService: item.canBeSelfService === true,
		};
	});

	if (steps.length === 0) throw new BadRequestException("onboarding template must include at least one step");
	return steps.sort((a, b) => a.stepOrder - b.stepOrder);
}

function asRequiredString(value: unknown, path: string) {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new BadRequestException(`${path} is required`);
	}
	return value.trim();
}

function onboardingSort(sort: string | undefined): Prisma.OnboardingTaskOrderByWithRelationInput {
	const [requestedField, requestedDirection] = sort?.split(":") ?? [];
	const field = SORT_FIELDS[requestedField as keyof typeof SORT_FIELDS] ?? SORT_FIELDS.startedAt;
	const direction = requestedDirection === "asc" ? "asc" : "desc";
	return { [field]: direction };
}
