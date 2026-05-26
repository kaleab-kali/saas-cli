import { Module } from "@nestjs/common";
import { PrismaModule } from "#shared/database/prisma.module";

@Module({
	imports: [PrismaModule],
})
export class InvoicingModule {}
