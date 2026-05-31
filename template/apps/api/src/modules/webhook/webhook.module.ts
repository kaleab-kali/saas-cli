import { Module } from "@nestjs/common";
import { AuthModule } from "#modules/auth/auth.module";
import { CryptoModule } from "#shared/crypto/crypto.module";
import { WebhookService } from "./application/webhook.service";
import { WebhookController } from "./presentation/webhook.controller";

@Module({
	imports: [AuthModule, CryptoModule],
	controllers: [WebhookController],
	providers: [WebhookService],
	exports: [WebhookService],
})
export class WebhookModule {}
