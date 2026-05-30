import { Module } from "@nestjs/common";
import { AuthModule } from "#modules/auth/auth.module";
import { BillingModule } from "#modules/billing/billing.module";
import { CreateCustomRoleHandler } from "./application/commands/create-custom-role.handler";
import {
	AssignCustomRoleHandler,
	DeleteCustomRoleHandler,
	UnassignCustomRoleHandler,
} from "./application/commands/delete-custom-role.handler";
import { UpdateCustomRoleHandler } from "./application/commands/update-custom-role.handler";
import {
	GetCustomRoleHandler,
	GetPermissionMatrixHandler,
	GetSystemRolesHandler,
	ListCustomRolesHandler,
} from "./application/queries/role.queries";
import { CustomRoleAssignmentRepository, CustomRoleRepository } from "./domain/repositories/custom-role.repository";
import { PermissionValidatorService } from "./domain/services/permission-validator.service";
import { RolePermissionResolverService } from "./domain/services/role-permission-resolver.service";
import {
	PrismaCustomRoleAssignmentRepository,
	PrismaCustomRoleRepository,
} from "./infrastructure/repositories/prisma-custom-role.repository";
import { RoleController } from "./presentation/controllers/role.controller";

@Module({
	imports: [AuthModule, BillingModule],
	controllers: [RoleController],
	providers: [
		{ provide: CustomRoleRepository, useClass: PrismaCustomRoleRepository },
		{ provide: CustomRoleAssignmentRepository, useClass: PrismaCustomRoleAssignmentRepository },
		PermissionValidatorService,
		RolePermissionResolverService,
		CreateCustomRoleHandler,
		UpdateCustomRoleHandler,
		DeleteCustomRoleHandler,
		AssignCustomRoleHandler,
		UnassignCustomRoleHandler,
		ListCustomRolesHandler,
		GetCustomRoleHandler,
		GetPermissionMatrixHandler,
		GetSystemRolesHandler,
	],
	exports: [RolePermissionResolverService, PermissionValidatorService, CustomRoleAssignmentRepository],
})
export class RoleModule {}
