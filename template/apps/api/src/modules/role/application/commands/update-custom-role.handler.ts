import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { CustomRoleRepository } from "../../domain/repositories/custom-role.repository";
import { PermissionValidatorService } from "../../domain/services/permission-validator.service";
import { RolePermissionResolverService } from "../../domain/services/role-permission-resolver.service";
import type { PermissionsMap } from "../../domain/value-objects/scope.vo";
import type { UpdateCustomRoleDto } from "../dto/role.dto";

@Injectable()
export class UpdateCustomRoleHandler {
	constructor(
		private readonly repo: CustomRoleRepository,
		private readonly validator: PermissionValidatorService,
		private readonly resolver: RolePermissionResolverService,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, id: string, userRoleSlugs: string[], dto: UpdateCustomRoleDto) {
		const role = await this.repo.findById(organizationId, id);
		if (!role) throw new NotFoundException("custom role");
		if (role.isSystem) throw new BadRequestException("cannot modify system role");

		if (dto.permissionsJson) {
			this.validator.assertKnownPermissions(dto.permissionsJson);
			if (!userRoleSlugs.includes("owner")) {
				const creatorPerms = new Set<string>();
				for (const slug of userRoleSlugs) {
					for (const p of this.resolver.flattenSystemRole(slug)) creatorPerms.add(p);
				}
				this.validator.assertNoEscalation(creatorPerms, dto.permissionsJson);
			}
		}

		role.update({
			nameEn: dto.nameEn,
			nameAm: dto.nameAm,
			description: dto.description,
			inheritsFromSlug: dto.inheritsFromSlug,
			permissionsJson: dto.permissionsJson as PermissionsMap | undefined,
			scopeJson: dto.scopeJson as never,
			active: dto.active,
		});
		const saved = await this.repo.update(role);
		this.events.emit({ eventName: "role.custom.updated", organizationId, payload: { roleId: saved.id } });
		return saved.toPrimitives();
	}
}
