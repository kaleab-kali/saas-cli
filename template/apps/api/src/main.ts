import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as compression from "compression";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";

const MAX_BODY_SIZE = "10mb";

const bootstrap = async () => {
	const app = await NestFactory.create(AppModule, {
		bodyParser: false, // Required for Better Auth
		bufferLogs: true, // Buffer logs until Pino is ready
	});

	// Use Pino as the application logger
	const logger = app.get(Logger);
	app.useLogger(logger);

	// Graceful shutdown
	app.enableShutdownHooks();

	// Security
	app.use(helmet());

	// Compression
	app.use(compression());

	// CORS
	app.enableCors({
		origin: process.env.FRONTEND_URL || "http://localhost:5173",
		credentials: true,
		maxAge: 86400, // 24 hours preflight cache
	});

	// Global prefix for all routes except auth and health
	app.setGlobalPrefix("api/v1", {
		exclude: ["api/auth/*path", "health"],
	});

	// Validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			transformOptions: { enableImplicitConversion: true },
		}),
	);

	// Swagger (development only)
	if (process.env.NODE_ENV !== "production") {
		const config = new DocumentBuilder()
			.setTitle("PropFlow API")
			.setDescription("Property Management + CRM SaaS API")
			.setVersion("1.0")
			.addCookieAuth("better-auth.session_token")
			.build();
		const document = SwaggerModule.createDocument(app, config);
		SwaggerModule.setup("api/docs", app, document);
	}

	const port = process.env.API_PORT || 3000;
	const host = process.env.API_HOST || "0.0.0.0";
	await app.listen(port, host);

	logger.log(`API running on http://${host}:${port}`);
	logger.log(`Environment: ${process.env.NODE_ENV || "development"}`);
	if (process.env.NODE_ENV !== "production") {
		logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
	}
};
bootstrap();
