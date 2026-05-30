import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createId } from "@paralleldrive/cuid2";
import { PrismaService } from "#shared/database/prisma.service";
import type { Prisma } from "../../generated/prisma/client";

const ALLOWED_ENTITIES = ["user", "member", "report", "notification"] as const;
type Entity = (typeof ALLOWED_ENTITIES)[number];

const ALLOWED_VIEW_MODES = ["table", "cards", "kanban", "map"] as const;

interface CreateSavedViewInput {
	entity: string;
	name: string;
	filtersJson: unknown;
	sortJson?: unknown;
	columnsJson?: unknown;
	viewMode?: string;
	isShared?: boolean;
	createdById?: string;
}

type UpdateSavedViewInput = Partial<Omit<CreateSavedViewInput, "entity">>;

@Injectable()
export class SavedViewService {
	constructor(private readonly prisma: PrismaService) {}

	async list(organizationId: string, entity: string) {
		this.assertEntity(entity);
		return this.prisma.savedView.findMany({
			where: { organizationId, entity },
			orderBy: { name: "asc" },
		});
	}

	async get(organizationId: string, id: string) {
		const row = await this.prisma.savedView.findFirst({
			where: { id, organizationId },
		});
		if (!row) throw new NotFoundException("Saved view not found");
		return row;
	}

	async create(organizationId: string, input: CreateSavedViewInput) {
		this.assertEntity(input.entity);
		if (!input.name?.trim()) throw new BadRequestException("Name required");
		this.assertViewMode(input.viewMode);
		const existing = await this.prisma.savedView.findFirst({
			where: { organizationId, entity: input.entity, name: input.name.trim() },
		});
		if (existing) throw new BadRequestException(`View "${input.name}" already exists`);
		return this.prisma.savedView.create({
			data: {
				id: createId(),
				organizationId,
				entity: input.entity,
				name: input.name.trim(),
				filtersJson: input.filtersJson as Prisma.InputJsonValue,
				sortJson: (input.sortJson as Prisma.InputJsonValue) ?? undefined,
				columnsJson: (input.columnsJson as Prisma.InputJsonValue) ?? undefined,
				viewMode: input.viewMode ?? "table",
				isShared: input.isShared ?? false,
				createdById: input.createdById ?? null,
			},
		});
	}

	async update(organizationId: string, id: string, input: UpdateSavedViewInput) {
		await this.get(organizationId, id);
		this.assertViewMode(input.viewMode);
		const data: Record<string, unknown> = {};
		if (input.name !== undefined) data.name = input.name.trim();
		if (input.filtersJson !== undefined) data.filtersJson = input.filtersJson as Prisma.InputJsonValue;
		if (input.sortJson !== undefined) data.sortJson = input.sortJson as Prisma.InputJsonValue;
		if (input.columnsJson !== undefined) data.columnsJson = input.columnsJson as Prisma.InputJsonValue;
		if (input.viewMode !== undefined) data.viewMode = input.viewMode;
		if (input.isShared !== undefined) data.isShared = input.isShared;
		return this.prisma.savedView.update({ where: { id }, data });
	}

	async remove(organizationId: string, id: string) {
		await this.get(organizationId, id);
		await this.prisma.savedView.delete({ where: { id } });
	}

	private assertEntity(entity: string): void {
		if (!(ALLOWED_ENTITIES as readonly string[]).includes(entity)) {
			throw new BadRequestException(`Unsupported entity: ${entity}. Must be one of: ${ALLOWED_ENTITIES.join(", ")}`);
		}
	}

	private assertViewMode(mode: string | undefined): void {
		if (mode === undefined) return;
		if (!(ALLOWED_VIEW_MODES as readonly string[]).includes(mode)) {
			throw new BadRequestException(`Unsupported viewMode: ${mode}. Must be one of: ${ALLOWED_VIEW_MODES.join(", ")}`);
		}
	}
}
export type { Entity as SavedViewEntity };
