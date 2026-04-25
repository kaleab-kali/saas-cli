import { ConflictException, Injectable } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { CustomRole } from "../../domain/entities/custom-role.entity";
import { CustomRoleRepository } from "../../domain/repositories/custom-role.repository";
import { PermissionValidatorService } from "../../domain/services/permission-validator.service";
import { RolePermissionResolverService } from "../../domain/services/role-permission-resolver.service";
import type { PermissionsMap, RoleScope } from "../../domain/value-objects/scope.vo";
import type { CreateCustomRoleDto } from "../dto/role.dto";

@Injectable()
export class CreateCustomRoleHandler {
	constructor(
		private readonly repo: CustomRoleRepository,
		private readonly validator: PermissionValidatorService,
		private readonly resolver: RolePermissionResolverService,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, userId: string, userRoleSlugs: string[], dto: CreateCustomRoleDto) {
		// Slug uniqueness
		const existing = await this.repo.findBySlug(organizationId, dto.slug);
		if (existing) throw new ConflictException(`role slug '${dto.slug}' already exists`);

		// Validate permissions are real
		this.validator.assertKnownPermissions(dto.permissionsJson);

		// Escalation guard — creator must hold all perms being granted
		const creatorPerms = new Set<string>();
		for (const slug of userRoleSlugs) {
			for (const p of this.resolver.flattenSystemRole(slug)) creatorPerms.add(p);
		}
		// Owner can grant anything
		if (!userRoleSlugs.includes("owner")) {
			this.validator.assertNoEscalation(creatorPerms, dto.permissionsJson);
		}

		const role = CustomRole.create({
			id: "",
			organizationId,
			slug: dto.slug,
			nameEn: dto.nameEn,
			nameAm: dto.nameAm ?? null,
			description: dto.description ?? null,
			inheritsFromSlug: dto.inheritsFromSlug ?? null,
			permissionsJson: dto.permissionsJson as PermissionsMap,
			scopeJson: (dto.scopeJson as RoleScope | undefined) ?? null,
			createdByUserId: userId,
			isSystem: false,
			active: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const saved = await this.repo.save(role);

		this.events.emit({
			eventName: "role.custom.created",
			organizationId,
			payload: { roleId: saved.id, slug: saved.slug },
		});
		return saved.toPrimitives();
	}
}
