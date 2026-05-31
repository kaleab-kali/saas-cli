import { ServiceUnavailableException } from "@nestjs/common";
import {
	buildEimsSdkOptions,
	createEimsSdkClientFromModule,
	DEFAULT_EIMS_SDK_PACKAGE_NAME,
	getEimsSdkPackageName,
} from "./eims-sdk-client.provider";

const config = (values: Record<string, string | number | undefined>) => ({
	get: <T = string>(key: string, fallback?: T) => (values[key] ?? fallback) as T,
});

describe("EIMS SDK client provider helpers", () => {
	it("builds SDK options from production EIMS env", () => {
		const options = buildEimsSdkOptions(
			config({
				EIMS_ENV: "production",
				EIMS_BASE_URL_PRODUCTION: "https://eims.example.test/api",
				EIMS_BULK_URL_PRODUCTION: "https://eims.example.test/bulk",
				EIMS_CALLBACK_PUBLIC_URL: "https://tenant.example.test/api/v1/eims/callbacks/bulk",
				EIMS_TIMEOUT_MS: "45000",
				EIMS_MAX_RETRIES: "5",
				EIMS_QUEUE_PREFIX: "tenant-eims",
			}),
		);

		expect(options).toEqual({
			environment: "production",
			apiUrl: "https://eims.example.test/api",
			baseUrl: "https://eims.example.test/api",
			bulkUrl: "https://eims.example.test/bulk",
			callbackPublicUrl: "https://tenant.example.test/api/v1/eims/callbacks/bulk",
			timeoutMs: 45_000,
			maxRetries: 5,
			queuePrefix: "tenant-eims",
		});
	});

	it("prefers the configured SDK package name and otherwise uses the default", () => {
		expect(getEimsSdkPackageName(config({ EIMS_SDK_PACKAGE_NAME: "@vyllion/eims-sdk" }))).toBe("@vyllion/eims-sdk");
		expect(getEimsSdkPackageName(config({}))).toBe(DEFAULT_EIMS_SDK_PACKAGE_NAME);
	});

	it("creates the SDK client from a createEimsClient factory", async () => {
		const sdkClient = {
			registerInvoice: jest.fn(),
			registerReceipt: jest.fn(),
			verifyIrn: jest.fn(),
			pollBulkStatus: jest.fn(),
			validateCredential: jest.fn(),
		};
		const createEimsClient = jest.fn().mockResolvedValue(sdkClient);

		const resolved = await createEimsSdkClientFromModule(
			{ createEimsClient },
			buildEimsSdkOptions(config({ EIMS_ENV: "sandbox", EIMS_BASE_URL_SANDBOX: "https://sandbox.example.test" })),
		);

		expect(resolved).toBe(sdkClient);
		expect(createEimsClient).toHaveBeenCalledWith(
			expect.objectContaining({
				environment: "sandbox",
				baseUrl: "https://sandbox.example.test",
			}),
		);
	});

	it("creates the SDK client from an exported EimsClient constructor", async () => {
		class EimsClient {
			registerInvoice = jest.fn();
			registerReceipt = jest.fn();
			verifyIrn = jest.fn();
			getBulkStatus = jest.fn();
			validateCredentials = jest.fn();
		}

		const resolved = await createEimsSdkClientFromModule(
			{ EimsClient },
			buildEimsSdkOptions(config({ EIMS_ENV: "sandbox" })),
		);

		expect(resolved).toBeInstanceOf(EimsClient);
	});

	it("fails closed when the SDK package does not expose a usable client", async () => {
		await expect(
			createEimsSdkClientFromModule({ createClient: jest.fn().mockResolvedValue({}) }, buildEimsSdkOptions(config({}))),
		).rejects.toBeInstanceOf(ServiceUnavailableException);
	});

	it("fails closed when the SDK is missing methods used by the SaaS adapter", async () => {
		await expect(
			createEimsSdkClientFromModule(
				{ createClient: jest.fn().mockResolvedValue({ registerInvoice: jest.fn() }) },
				buildEimsSdkOptions(config({})),
			),
		).rejects.toThrow("registerInvoice/registerReceipt/verifyIrn/validateCredential/pollBulkStatus-capable");
	});
});
