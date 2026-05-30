import { BadRequestException } from "@nestjs/common";
import type { PermissionsMap, RoleScope } from "../value-objects/scope.vo";
import { isValidDow, isValidHour } from "../value-objects/scope.vo";

export interface CustomRoleProps {
	id: string;
	organizationId: string;
	slug: string;
	nameEn: string;
	nameAm: string | null;
	description: string | null;
	inheritsFromSlug: string | null;
	permissionsJson: PermissionsMap;
	scopeJson: RoleScope | null;
	createdByUserId: string;
	isSystem: boolean;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const SLUG_REGEX = /^[a-z0-9-]{2,40}$/;

export class CustomRole {
	private constructor(private props: CustomRoleProps) {}

	static create(props: CustomRoleProps): CustomRole {
		CustomRole.validate(props);
		return new CustomRole(props);
	}
	static rehydrate(props: CustomRoleProps): CustomRole {
		return new CustomRole(props);
	}

	private static validate(p: CustomRoleProps) {
		if (!SLUG_REGEX.test(p.slug)) throw new BadRequestException("slug must be 2-40 lowercase letters/digits/hyphens");
		if (!p.nameEn?.trim()) throw new BadRequestException("nameEn required");
		if (!p.permissionsJson || typeof p.permissionsJson !== "object") {
			throw new BadRequestException("permissionsJson required");
		}
		for (const [res, actions] of Object.entries(p.permissionsJson)) {
			if (!Array.isArray(actions)) throw new BadRequestException(`permissions[${res}] must be array`);
		}
		if (p.scopeJson) {
			const s = p.scopeJson;
			if (s.approvalLimitMinor !== undefined && s.approvalLimitMinor < 0) {
				throw new BadRequestException("approvalLimitMinor must be >= 0");
			}
			if (s.timeWindow) {
				if (!s.timeWindow.dow.every(isValidDow)) throw new BadRequestException("invalid dow (0-6)");
				if (!isValidHour(s.timeWindow.startHour) || !isValidHour(s.timeWindow.endHour)) {
					throw new BadRequestException("hours must be 0-23");
				}
			}
		}
	}

	get id() {
		return this.props.id;
	}
	get slug() {
		return this.props.slug;
	}
	get organizationId() {
		return this.props.organizationId;
	}
	get isSystem() {
		return this.props.isSystem;
	}
	get isActive() {
		return this.props.active;
	}

	update(
		input: Partial<
			Omit<CustomRoleProps, "id" | "organizationId" | "slug" | "isSystem" | "createdAt" | "createdByUserId">
		>,
	) {
		if (this.props.isSystem) throw new BadRequestException("cannot modify system role");
		if (input.nameEn !== undefined) {
			if (!input.nameEn.trim()) throw new BadRequestException("nameEn cannot be empty");
			this.props.nameEn = input.nameEn;
		}
		if (input.nameAm !== undefined) this.props.nameAm = input.nameAm;
		if (input.description !== undefined) this.props.description = input.description;
		if (input.permissionsJson !== undefined) this.props.permissionsJson = input.permissionsJson;
		if (input.scopeJson !== undefined) this.props.scopeJson = input.scopeJson;
		if (input.inheritsFromSlug !== undefined) this.props.inheritsFromSlug = input.inheritsFromSlug;
		if (input.active !== undefined) this.props.active = input.active;
		this.props.updatedAt = new Date();
		CustomRole.validate(this.props);
	}

	deactivate() {
		if (this.props.isSystem) throw new BadRequestException("cannot deactivate system role");
		this.props.active = false;
		this.props.updatedAt = new Date();
	}

	/**
	 * Returns permissions granted by this role — flat "resource:action" keys.
	 */
	flatPermissions(): Set<string> {
		const out = new Set<string>();
		for (const [res, actions] of Object.entries(this.props.permissionsJson)) {
			for (const action of actions) out.add(`${res}:${action}`);
		}
		return out;
	}

	toPrimitives() {
		return {
			...this.props,
			permissionsJson: { ...this.props.permissionsJson },
			scopeJson: this.props.scopeJson ? { ...this.props.scopeJson } : null,
		};
	}
}
