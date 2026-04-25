import { Module } from "@nestjs/common";
import { AuthModule } from "#modules/auth/auth.module";
import { CreateApiKeyHandler } from "./application/commands/create-api-key/create-api-key.handler";
import { RevokeApiKeyHandler } from "./application/commands/revoke-api-key/revoke-api-key.handler";
import { ListApiKeysHandler } from "./application/queries/list-api-keys.handler";
import { ApiKeyRepository } from "./domain/repositories/api-key.repository";
import { ApiKeyHasherService } from "./domain/services/api-key-hasher.service";
import { PrismaApiKeyRepository } from "./infrastructure/repositories/prisma-api-key.repository";
import { ApiKeyController } from "./presentation/controllers/api-key.controller";
import { ApiKeyGuard } from "./presentation/guards/api-key.guard";

@Module({
	imports: [AuthModule],
	controllers: [ApiKeyController],
	providers: [
		{ provide: ApiKeyRepository, useClass: PrismaApiKeyRepository },
		ApiKeyHasherService,
		ApiKeyGuard,
		CreateApiKeyHandler,
		RevokeApiKeyHandler,
		ListApiKeysHandler,
	],
	exports: [ApiKeyGuard, ApiKeyHasherService, { provide: ApiKeyRepository, useClass: PrismaApiKeyRepository }],
})
export class ApiKeyModule {}
