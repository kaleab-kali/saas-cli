import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn, IsOptional, IsString } from "class-validator";

export const TEAM_ROLES = ["owner", "admin", "member", "viewer"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export class InviteMemberDto {
	@ApiProperty()
	@IsEmail()
	email!: string;

	@ApiProperty({ enum: TEAM_ROLES, default: "member" })
	@IsIn(TEAM_ROLES)
	role!: TeamRole;
}

export class UpdateMemberRoleDto {
	@ApiProperty({ enum: TEAM_ROLES })
	@IsIn(TEAM_ROLES)
	role!: TeamRole;
}

export class AcceptInvitationDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	organizationId?: string;
}
