import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DomainEventBus } from "#shared/events/domain-event.bus";
import { CustomRoleAssignmentRepository, CustomRoleRepository } from "../../domain/repositories/custom-role.repository";

@Injectable()
export class DeleteCustomRoleHandler {
	constructor(
		private readonly repo: CustomRoleRepository,
		private readonly assignments: CustomRoleAssignmentRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, id: string) {
		const role = await this.repo.findById(organizationId, id);
		if (!role) throw new NotFoundException("custom role");
		if (role.isSystem) throw new BadRequestException("cannot delete system role");
		const assignedCount = await this.assignments.countByRole(id);
		if (assignedCount > 0) {
			throw new ConflictException(`cannot delete role assigned to ${assignedCount} user(s). Reassign first.`);
		}
		await this.repo.delete(organizationId, id);
		this.events.emit({ eventName: "role.custom.deleted", organizationId, payload: { roleId: id } });
		return { id };
	}
}

@Injectable()
export class AssignCustomRoleHandler {
	constructor(
		private readonly repo: CustomRoleRepository,
		private readonly assignments: CustomRoleAssignmentRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, roleId: string, userId: string, assignedByUserId: string) {
		const role = await this.repo.findById(organizationId, roleId);
		if (!role?.isActive) throw new NotFoundException("active role");
		await this.assignments.assign(roleId, organizationId, userId, assignedByUserId);
		this.events.emit({
			eventName: "role.custom.assigned",
			organizationId,
			payload: { roleId, userId, assignedByUserId },
		});
		return { roleId, userId };
	}
}

@Injectable()
export class UnassignCustomRoleHandler {
	constructor(
		private readonly repo: CustomRoleRepository,
		private readonly assignments: CustomRoleAssignmentRepository,
		private readonly events: DomainEventBus,
	) {}

	async execute(organizationId: string, roleId: string, userId: string) {
		const role = await this.repo.findById(organizationId, roleId);
		if (!role) throw new NotFoundException("role");
		await this.assignments.unassign(roleId, userId);
		this.events.emit({ eventName: "role.custom.unassigned", organizationId, payload: { roleId, userId } });
		return { roleId, userId };
	}
}
