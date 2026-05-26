import { Module } from "@nestjs/common";
import { PrismaModule } from "#shared/database/prisma.module";
import { CreateEimsEnterpriseHandler } from "./application/commands/create-enterprise.handler";
import { CreateEimsEstablishmentHandler } from "./application/commands/create-establishment.handler";
import { CreateEimsSourceSystemHandler } from "./application/commands/create-source-system.handler";
import { ListEimsSetupHandler } from "./application/queries/list-eims-setup.handler";
import { EimsSetupRepository } from "./domain/eims-setup.repository";
import { PrismaEimsSetupRepository } from "./infrastructure/repositories/prisma-eims-setup.repository";
import { EimsSetupController } from "./presentation/eims-setup.controller";

@Module({
	imports: [PrismaModule],
	controllers: [EimsSetupController],
	providers: [
		{ provide: EimsSetupRepository, useClass: PrismaEimsSetupRepository },
		CreateEimsEnterpriseHandler,
		CreateEimsEstablishmentHandler,
		CreateEimsSourceSystemHandler,
		ListEimsSetupHandler,
	],
	exports: [EimsSetupRepository],
})
export class EimsSetupModule {}
