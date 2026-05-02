import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createId } from "@paralleldrive/cuid2";
import { PrismaService } from "#shared/database/prisma.service";
import { KNOWN_LOOKUP_KINDS, LOOKUP_DEFAULTS, type LookupKind } from "./lookup-defaults";

export { KNOWN_LOOKUP_KINDS, type LookupKind } from "./lookup-defaults";

export interface LookupItem {
	id: string;
	organizationId: string;
	kind: string;
	value: string;
	label: string;
	description: string | null;
	color: string | null;
	sortOrder: number;
	isBuiltIn: boolean;
	archived: boolean;
}

const VALUE_REGEX = /^[a-z0-9_]{1,50}$/;
const MAX_LABEL_LENGTH = 80;

const isKnownKind = (kind: string): kind is LookupKind => (KNOWN_LOOKUP_KINDS as string[]).includes(kind);

@Injectable()
export class LookupService {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Seed all default catalogs for a new organization.
	 * Idempotent via skipDuplicates.
	 * Called from org.created event listener.
	 */
	async seedDefaultsForOrg(organizationId: string): Promise<void> {
		const rows = KNOWN_LOOKUP_KINDS.flatMap((kind) =>
			LOOKUP_DEFAULTS[kind].map((d) => ({
				id: createId(),
				organizationId,
				kind,
				value: d.value,
				label: d.label,
				color: d.color ?? null,
				sortOrder: d.sortOrder ?? 0,
				isBuiltIn: true,
			})),
		);
		await this.prisma.lookup.createMany({ data: rows, skipDuplicates: true });
	}

	async list(organizationId: string, kind: LookupKind, includeArchived = false): Promise<LookupItem[]> {
		if (!isKnownKind(kind)) throw new BadRequestException(`Unknown lookup kind: ${kind}`);

		let rows = await this.prisma.lookup.findMany({
			where: { organizationId, kind },
			orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
		});

		// Self-heal for orgs created before lookup system existed
		if (rows.length === 0) {
			await this.seedKind(organizationId, kind);
			rows = await this.prisma.lookup.findMany({
				where: { organizationId, kind },
				orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
			});
		}

		return includeArchived ? rows : rows.filter((r) => !r.archived);
	}

	async create(
		organizationId: string,
		kind: LookupKind,
		input: { value?: string; label: string; description?: string; color?: string; sortOrder?: number },
	): Promise<LookupItem> {
		if (!isKnownKind(kind)) throw new BadRequestException(`Unknown lookup kind: ${kind}`);
		const label = input.label?.trim();
		if (!label) throw new BadRequestException("Label required");
		if (label.length > MAX_LABEL_LENGTH) throw new BadRequestException("Label too long");

		const value = (
			input.value ??
			label
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "_")
				.replace(/^_+|_+$/g, "")
		).trim();
		if (!VALUE_REGEX.test(value)) {
			throw new BadRequestException("Value must be lowercase letters/numbers/underscores only");
		}

		const existing = await this.prisma.lookup.findFirst({
			where: { organizationId, kind, value },
		});
		if (existing) throw new BadRequestException(`Value "${value}" already exists in ${kind}`);

		return this.prisma.lookup.create({
			data: {
				id: createId(),
				organizationId,
				kind,
				value,
				label,
				description: input.description ?? null,
				color: input.color ?? null,
				sortOrder: input.sortOrder ?? 100,
				isBuiltIn: false,
			},
		});
	}

	async update(
		organizationId: string,
		id: string,
		input: {
			label?: string;
			description?: string | null;
			color?: string | null;
			sortOrder?: number;
			archived?: boolean;
		},
	): Promise<LookupItem> {
		const row = await this.prisma.lookup.findFirst({ where: { id, organizationId } });
		if (!row) throw new NotFoundException("Lookup not found");
		if (input.label !== undefined) {
			if (!input.label.trim()) throw new BadRequestException("Label cannot be empty");
			if (input.label.length > MAX_LABEL_LENGTH) throw new BadRequestException("Label too long");
		}
		return this.prisma.lookup.update({
			where: { id },
			data: {
				label: input.label?.trim(),
				description: input.description,
				color: input.color,
				sortOrder: input.sortOrder,
				archived: input.archived,
			},
		});
	}

	async remove(organizationId: string, id: string): Promise<void> {
		const row = await this.prisma.lookup.findFirst({ where: { id, organizationId } });
		if (!row) throw new NotFoundException("Lookup not found");
		await this.prisma.lookup.delete({ where: { id } });
	}

	async valueExists(organizationId: string, kind: LookupKind, value: string): Promise<boolean> {
		const row = await this.prisma.lookup.findFirst({
			where: { organizationId, kind, value, archived: false },
		});
		return !!row;
	}

	private async seedKind(organizationId: string, kind: LookupKind): Promise<void> {
		await this.prisma.lookup.createMany({
			data: LOOKUP_DEFAULTS[kind].map((d) => ({
				id: createId(),
				organizationId,
				kind,
				value: d.value,
				label: d.label,
				color: d.color ?? null,
				sortOrder: d.sortOrder ?? 0,
				isBuiltIn: true,
			})),
			skipDuplicates: true,
		});
	}
}
