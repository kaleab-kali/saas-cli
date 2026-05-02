import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";

@Injectable()
export class UpdatePlatformSettingHandler {
	constructor(private readonly prisma: PrismaService) {}

	async execute(key: string, value: string): Promise<void> {
		await this.prisma.platformSettings.upsert({
			where: { key },
			update: { value },
			create: { key, value },
		});
	}
}
