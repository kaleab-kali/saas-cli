import { Injectable } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";
import type { Prisma } from "../../../../generated/prisma/client";

interface LogActionParams {
	action: string;
	performedBy: string;
	targetType: string;
	targetId: string;
	details?: Record<string, unknown>;
	ipAddress?: string;
}

@Injectable()
export class LogPlatformActionHandler {
	constructor(private readonly prisma: PrismaService) {}

	async execute(params: LogActionParams): Promise<void> {
		await this.prisma.platformAuditLog.create({
			data: {
				action: params.action,
				performedBy: params.performedBy,
				targetType: params.targetType,
				targetId: params.targetId,
				details: (params.details as Prisma.InputJsonValue) || undefined,
				ipAddress: params.ipAddress,
			},
		});
	}
}
