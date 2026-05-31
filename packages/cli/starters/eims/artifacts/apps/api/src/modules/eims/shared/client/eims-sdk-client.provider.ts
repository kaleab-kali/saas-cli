import { Provider, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EIMS_SDK_CLIENT, type EimsSdkClient } from "./eims-external-client";

export const DEFAULT_EIMS_SDK_PACKAGE_NAME = "@yourcompany/eims-sdk";

type ConfigReader = Pick<ConfigService, "get">;

export type EimsSdkClientOptions = {
	environment: string;
	apiUrl?: string;
	baseUrl?: string;
	bulkUrl?: string;
	callbackPublicUrl?: string;
	timeoutMs: number;
	maxRetries: number;
	queuePrefix: string;
};

type SdkFactory = (options: EimsSdkClientOptions) => EimsSdkClient | Promise<EimsSdkClient>;
type SdkConstructor = new (options: EimsSdkClientOptions) => EimsSdkClient;
type SdkPackageShape = {
	createClient?: SdkFactory;
	createEimsClient?: SdkFactory;
	EimsClient?: SdkConstructor;
	default?: SdkFactory | SdkConstructor | EimsSdkClient | SdkPackageShape;
};

const configString = (config: ConfigReader, key: string, fallback = "") => {
	const value = config.get<string | undefined>(key);
	return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

const configNumber = (config: ConfigReader, key: string, fallback: number) => {
	const value = Number(config.get<string | number | undefined>(key) ?? fallback);
	return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const getEimsSdkPackageName = (config: ConfigReader) =>
	configString(config, "EIMS_SDK_PACKAGE_NAME", DEFAULT_EIMS_SDK_PACKAGE_NAME);

export const buildEimsSdkOptions = (config: ConfigReader): EimsSdkClientOptions => {
	const environment = configString(config, "EIMS_ENV", "sandbox");
	const apiUrl = configString(config, "EIMS_API_URL");
	const baseUrl =
		apiUrl ||
		(environment === "production"
			? configString(config, "EIMS_BASE_URL_PRODUCTION")
			: configString(config, "EIMS_BASE_URL_SANDBOX"));
	const bulkUrl =
		environment === "production"
			? configString(config, "EIMS_BULK_URL_PRODUCTION")
			: configString(config, "EIMS_BULK_URL_SANDBOX");

	return {
		environment,
		apiUrl: apiUrl || baseUrl || undefined,
		baseUrl: baseUrl || undefined,
		bulkUrl: bulkUrl || undefined,
		callbackPublicUrl: configString(config, "EIMS_CALLBACK_PUBLIC_URL") || undefined,
		timeoutMs: configNumber(config, "EIMS_TIMEOUT_MS", 30_000),
		maxRetries: configNumber(config, "EIMS_MAX_RETRIES", 3),
		queuePrefix: configString(config, "EIMS_QUEUE_PREFIX", "eims"),
	};
};

const isEimsSdkClient = (value: unknown): value is EimsSdkClient =>
	Boolean(value && typeof value === "object" && typeof (value as EimsSdkClient).registerInvoice === "function");

const asSdkPackageShape = (value: unknown): SdkPackageShape | undefined =>
	value && typeof value === "object" ? (value as SdkPackageShape) : undefined;

const invokeFactory = async (factory: unknown, options: EimsSdkClientOptions) => {
	if (typeof factory !== "function") return undefined;
	const client = await (factory as SdkFactory)(options);
	return isEimsSdkClient(client) ? client : undefined;
};

const instantiateClient = (constructorValue: unknown, options: EimsSdkClientOptions) => {
	if (typeof constructorValue !== "function") return undefined;
	try {
		const client = new (constructorValue as SdkConstructor)(options);
		return isEimsSdkClient(client) ? client : undefined;
	} catch {
		return undefined;
	}
};

export const createEimsSdkClientFromModule = async (
	sdkModule: SdkPackageShape,
	options: EimsSdkClientOptions,
): Promise<EimsSdkClient> => {
	const defaultModule = asSdkPackageShape(sdkModule.default);

	for (const factory of [
		sdkModule.createEimsClient,
		sdkModule.createClient,
		defaultModule?.createEimsClient,
		defaultModule?.createClient,
		typeof sdkModule.default === "function" ? sdkModule.default : undefined,
	]) {
		const client = await invokeFactory(factory, options);
		if (client) return client;
	}

	for (const constructorValue of [
		sdkModule.EimsClient,
		defaultModule?.EimsClient,
		typeof sdkModule.default === "function" ? sdkModule.default : undefined,
	]) {
		const client = instantiateClient(constructorValue, options);
		if (client) return client;
	}

	for (const candidate of [sdkModule.default, sdkModule]) {
		if (isEimsSdkClient(candidate)) return candidate;
	}

	throw new ServiceUnavailableException("EIMS SDK package does not expose a registerInvoice-capable client");
};

export const EimsSdkClientProvider: Provider = {
	provide: EIMS_SDK_CLIENT,
	inject: [ConfigService],
	useFactory: async (config: ConfigService): Promise<EimsSdkClient | undefined> => {
		if (config.get<string>("EIMS_MOCK_MODE") !== "false") return undefined;

		const packageName = getEimsSdkPackageName(config);
		try {
			const sdkModule = (await import(packageName)) as SdkPackageShape;
			return await createEimsSdkClientFromModule(sdkModule, buildEimsSdkOptions(config));
		} catch (error) {
			if (error instanceof ServiceUnavailableException) throw error;
			throw new ServiceUnavailableException(
				`EIMS SDK package '${packageName}' is not installed or failed to initialize`,
			);
		}
	},
};
