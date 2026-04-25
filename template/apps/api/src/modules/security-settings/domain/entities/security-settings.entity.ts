import { BadRequestException } from "@nestjs/common";

export interface SecuritySettingsProps {
	id: string;
	organizationId: string;
	passwordMinLength: number;
	passwordRequireUpper: boolean;
	passwordRequireLower: boolean;
	passwordRequireDigit: boolean;
	passwordRequireSymbol: boolean;
	passwordMaxAgeDays: number | null;
	sessionTimeoutMinutes: number;
	force2fa: boolean;
	ipAllowlist: string[];
	createdAt: Date;
	updatedAt: Date;
}

const IP_CIDR_REGEX = /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/[0-9]{1,2})?$/;

export class SecuritySettings {
	private constructor(private props: SecuritySettingsProps) {}

	static create(props: SecuritySettingsProps) {
		SecuritySettings.validate(props);
		return new SecuritySettings(props);
	}

	static rehydrate(props: SecuritySettingsProps) {
		return new SecuritySettings(props);
	}

	private static validate(p: Partial<SecuritySettingsProps>) {
		if (p.passwordMinLength !== undefined && (p.passwordMinLength < 6 || p.passwordMinLength > 128)) {
			throw new BadRequestException("passwordMinLength must be 6-128");
		}
		if (p.sessionTimeoutMinutes !== undefined && (p.sessionTimeoutMinutes < 5 || p.sessionTimeoutMinutes > 43200)) {
			throw new BadRequestException("sessionTimeoutMinutes must be 5-43200 (30d)");
		}
		if (p.passwordMaxAgeDays !== undefined && p.passwordMaxAgeDays !== null && p.passwordMaxAgeDays < 1) {
			throw new BadRequestException("passwordMaxAgeDays must be >= 1 or null");
		}
		if (p.ipAllowlist) {
			for (const ip of p.ipAllowlist) {
				if (!IP_CIDR_REGEX.test(ip)) throw new BadRequestException(`invalid ip/cidr: ${ip}`);
			}
		}
	}

	update(input: Partial<Omit<SecuritySettingsProps, "id" | "organizationId" | "createdAt">>) {
		SecuritySettings.validate(input);
		Object.assign(this.props, input);
		this.props.updatedAt = new Date();
	}

	toPrimitives(): SecuritySettingsProps {
		return { ...this.props };
	}
}
