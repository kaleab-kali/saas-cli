import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";

@Injectable()
export class ToggleFeatureFlagHandler {
	constructor(private readonly prisma: PrismaService) {}

	async executeGlobal(flagName: string, enabled: boolean): Promise<void> {
		const flag = await this.prisma.featureFlag.findUnique({ where: { name: flagName } });
		if (!flag) throw new NotFoundException(`Feature flag ${flagName} not found`);

		await this.prisma.featureFlag.update({
			where: { name: flagName },
			data: { enabledGlobal: enabled },
		});
	}

	async executeForOrg(flagName: string, organizationId: string, enabled: boolean): Promise<void> {
		const flag = await this.prisma.featureFlag.findUnique({ where: { name: flagName } });
		if (!flag) throw new NotFoundException(`Feature flag ${flagName} not found`);

		await this.prisma.featureFlagOverride.upsert({
			where: {
				featureFlagId_organizationId: {
					featureFlagId: flag.id,
					organizationId,
				},
			},
			update: { enabled },
			create: {
				featureFlagId: flag.id,
				organizationId,
				enabled,
			},
		});
	}
}
