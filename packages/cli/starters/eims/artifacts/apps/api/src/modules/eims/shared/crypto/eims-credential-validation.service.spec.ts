import { EimsCredentialValidationService } from "./eims-credential-validation.service";

const credential = {
	id: "cred_1",
	organizationId: "org_1",
	sourceSystemId: "src_front",
	environment: "production",
	clientId: "client-front-pos",
	username: "TIN0074136947",
	credentials: {
		apiKey: "plain-api-key",
		clientSecret: "plain-client-secret",
	},
};

describe("EimsCredentialValidationService", () => {
	it("validates stored credential material through the EIMS SDK boundary", async () => {
		const store = {
			credentialForValidation: jest.fn().mockResolvedValue(credential),
			recordValidationResult: jest.fn().mockResolvedValue({ data: { status: "tested" } }),
		};
		const client = {
			validateCredential: jest.fn().mockResolvedValue({ data: { status: "valid", valid: true } }),
		};
		const service = new EimsCredentialValidationService(store as never, client as never);

		await expect(service.testCredential("org_1", "src_front")).resolves.toEqual({ data: { status: "tested" } });

		expect(client.validateCredential).toHaveBeenCalledWith({
			organizationId: "org_1",
			sourceSystemId: "src_front",
			environment: "production",
			clientId: "client-front-pos",
			username: "TIN0074136947",
			credentials: {
				apiKey: "plain-api-key",
				clientSecret: "plain-client-secret",
			},
		});
		expect(store.recordValidationResult).toHaveBeenCalledWith("org_1", "cred_1", {
			lastTestStatus: "success",
			sdkValidation: { status: "valid", valid: true, code: null },
		});
	});

	it("records failed SDK validation without returning decrypted secrets", async () => {
		const store = {
			credentialForValidation: jest.fn().mockResolvedValue(credential),
			recordValidationResult: jest.fn().mockResolvedValue({ data: { status: "test_failed", secretsReturned: false } }),
		};
		const client = {
			validateCredential: jest
				.fn()
				.mockResolvedValue({ data: { status: "invalid", valid: false, code: "AUTH_FAILED" } }),
		};
		const service = new EimsCredentialValidationService(store as never, client as never);

		const response = await service.testCredential("org_1", "src_front");

		expect(store.recordValidationResult).toHaveBeenCalledWith("org_1", "cred_1", {
			lastTestStatus: "failed",
			sdkValidation: { status: "invalid", valid: false, code: "AUTH_FAILED" },
		});
		expect(JSON.stringify(response)).not.toContain("plain-api-key");
	});

	it("marks the credential failed before rethrowing SDK errors", async () => {
		const store = {
			credentialForValidation: jest.fn().mockResolvedValue(credential),
			recordValidationResult: jest.fn().mockResolvedValue({ data: { status: "test_failed" } }),
		};
		const client = {
			validateCredential: jest.fn().mockRejectedValue(new Error("SDK unavailable")),
		};
		const service = new EimsCredentialValidationService(store as never, client as never);

		await expect(service.testCredential("org_1", "src_front")).rejects.toThrow("SDK unavailable");
		expect(store.recordValidationResult).toHaveBeenCalledWith("org_1", "cred_1", {
			lastTestStatus: "failed",
			sdkValidation: { status: "error", errorType: "Error" },
		});
	});
});
