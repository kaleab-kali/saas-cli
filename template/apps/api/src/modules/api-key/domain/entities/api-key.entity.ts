import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { isApiKeyScope } from "../value-objects/scope.vo";

export interface ApiKeyProps {
	id: string;
	organizationId: string;
	name: string;
	keyHash: string;
	keyPrefix: string;
	scopes: string[];
	createdByUserId: string;
	expiresAt: Date | null;
	revokedAt: Date | null;
	lastUsedAt: Date | null;
	usageCount: number;
	rateLimit: number | null;
	createdAt: Date;
	updatedAt: Date;
}

export class ApiKey {
	private constructor(private props: ApiKeyProps) {}

	static create(props: ApiKeyProps): ApiKey {
		if (!props.name?.trim()) throw new BadRequestException("name required");
		if (!props.scopes?.length) throw new BadRequestException("at least one scope required");
		for (const s of props.scopes) {
			if (!isApiKeyScope(s)) throw new BadRequestException(`invalid scope: ${s}`);
		}
		if (props.expiresAt && props.expiresAt <= new Date()) {
			throw new BadRequestException("expiresAt must be in the future");
		}
		return new ApiKey(props);
	}

	static rehydrate(props: ApiKeyProps): ApiKey {
		return new ApiKey(props);
	}

	get id() {
		return this.props.id;
	}
	get organizationId() {
		return this.props.organizationId;
	}
	get isRevoked() {
		return this.props.revokedAt !== null;
	}
	get isExpired() {
		return this.props.expiresAt !== null && this.props.expiresAt <= new Date();
	}
	get isActive() {
		return !this.isRevoked && !this.isExpired;
	}

	revoke() {
		if (this.props.revokedAt) throw new BadRequestException("already revoked");
		this.props.revokedAt = new Date();
		this.props.updatedAt = new Date();
	}

	recordUsage() {
		this.props.lastUsedAt = new Date();
		this.props.usageCount += 1;
		this.props.updatedAt = new Date();
	}

	assertHasScope(required: string) {
		if (!this.isActive) throw new ForbiddenException("api key inactive");
		if (this.props.scopes.includes("admin")) return;
		if (!this.props.scopes.includes(required)) {
			throw new ForbiddenException(`missing scope: ${required}`);
		}
	}

	toPrimitives() {
		return { ...this.props };
	}

	toPublicDto() {
		const { keyHash: _h, ...rest } = this.props;
		return rest;
	}
}
