import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "#modules/auth/auth.module";
import { ArchiveNotificationHandler } from "./application/commands/archive-notification/archive-notification.handler";
import { CreateBulkHandler } from "./application/commands/create-bulk/create-bulk.handler";
import { CreateNotificationHandler } from "./application/commands/create-notification/create-notification.handler";
import { DeleteTemplateHandler } from "./application/commands/delete-template/delete-template.handler";
import { MarkAllReadHandler } from "./application/commands/mark-all-read/mark-all-read.handler";
import { MarkReadHandler } from "./application/commands/mark-read/mark-read.handler";
import { ScheduleBulkHandler } from "./application/commands/schedule-bulk/schedule-bulk.handler";
import { SendBulkHandler } from "./application/commands/send-bulk/send-bulk.handler";
import { UpdatePreferenceHandler } from "./application/commands/update-preference/update-preference.handler";
import { UpsertTemplateHandler } from "./application/commands/upsert-template/upsert-template.handler";
import { DomainEventListener } from "./application/listeners/domain-event.listener";
import { ListBulkHandler } from "./application/queries/list-bulk.handler";
import { ListEmailDeliveriesHandler } from "./application/queries/list-email-deliveries.handler";
import { ListNotificationsHandler } from "./application/queries/list-notifications.handler";
import { ListPreferencesHandler } from "./application/queries/list-preferences.handler";
import { ListTemplatesHandler } from "./application/queries/list-templates.handler";
import { DigestService } from "./application/services/digest.service";
import { EmailDispatcherService } from "./application/services/email-dispatcher.service";
import { ScheduledBulkService } from "./application/services/scheduled-bulk.service";
import { BulkCommunicationRepository } from "./domain/repositories/bulk-communication.repository";
import { NotificationRepository } from "./domain/repositories/notification.repository";
import { NotificationPreferenceRepository } from "./domain/repositories/notification-preference.repository";
import { NotificationTemplateRepository } from "./domain/repositories/notification-template.repository";
import { AudienceResolver } from "./domain/services/audience-resolver.service";
import { NotificationGateway } from "./infrastructure/gateways/notification.gateway";
import { PrismaBulkCommunicationRepository } from "./infrastructure/repositories/prisma-bulk-communication.repository";
import { PrismaNotificationRepository } from "./infrastructure/repositories/prisma-notification.repository";
import { PrismaNotificationPreferenceRepository } from "./infrastructure/repositories/prisma-notification-preference.repository";
import { PrismaNotificationTemplateRepository } from "./infrastructure/repositories/prisma-notification-template.repository";
import { BulkCommunicationController } from "./presentation/controllers/bulk-communication.controller";
import { EmailDeliveryController } from "./presentation/controllers/email-delivery.controller";
import { NotificationController } from "./presentation/controllers/notification.controller";
import { TemplateController } from "./presentation/controllers/template.controller";

@Module({
	imports: [AuthModule, ScheduleModule.forRoot()],
	controllers: [NotificationController, TemplateController, BulkCommunicationController, EmailDeliveryController],
	providers: [
		{ provide: NotificationRepository, useClass: PrismaNotificationRepository },
		{ provide: NotificationPreferenceRepository, useClass: PrismaNotificationPreferenceRepository },
		{ provide: NotificationTemplateRepository, useClass: PrismaNotificationTemplateRepository },
		{ provide: BulkCommunicationRepository, useClass: PrismaBulkCommunicationRepository },
		AudienceResolver,
		NotificationGateway,
		CreateNotificationHandler,
		MarkReadHandler,
		MarkAllReadHandler,
		ArchiveNotificationHandler,
		UpdatePreferenceHandler,
		UpsertTemplateHandler,
		DeleteTemplateHandler,
		CreateBulkHandler,
		ScheduleBulkHandler,
		SendBulkHandler,
		ListNotificationsHandler,
		ListPreferencesHandler,
		ListTemplatesHandler,
		ListBulkHandler,
		ListEmailDeliveriesHandler,
		EmailDispatcherService,
		ScheduledBulkService,
		DigestService,
		DomainEventListener,
	],
	exports: [CreateNotificationHandler, EmailDispatcherService],
})
export class NotificationModule {}
