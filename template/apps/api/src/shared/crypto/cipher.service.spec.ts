import { ConfigService } from "@nestjs/config";
import { CipherService } from "./cipher.service";

const key = "a".repeat(64);

const serviceWithKey = (masterKey = key) => {
	const service = new CipherService({
		get: (name: string) => (name === "MASTER_KEY" ? masterKey : undefined),
	} as ConfigService);
	service.onModuleInit();
	return service;
};

describe("CipherService", () => {
	it("round-trips encrypted text", () => {
		const service = serviceWithKey();
		const encrypted = service.encrypt("secret-value");

		expect(encrypted).toMatch(/^v1:/);
		expect(service.decrypt(encrypted)).toBe("secret-value");
	});

	it("uses a random IV for each encryption", () => {
		const service = serviceWithKey();

		expect(service.encrypt("same")).not.toBe(service.encrypt("same"));
	});

	it("rejects invalid master keys", () => {
		expect(() => serviceWithKey("short")).toThrow("MASTER_KEY must be a 32-byte hex string");
		expect(() => serviceWithKey("z".repeat(64))).toThrow("MASTER_KEY must be hexadecimal");
	});

	it("rejects tampered ciphertext", () => {
		const service = serviceWithKey();
		const encrypted = service.encrypt("secret-value");
		const tampered = encrypted.replace(/.$/, encrypted.endsWith("A") ? "B" : "A");

		expect(() => service.decrypt(tampered)).toThrow();
	});

	it("rejects malformed ciphertext", () => {
		const service = serviceWithKey();

		expect(() => service.decrypt("not-encrypted")).toThrow("Invalid ciphertext format");
	});
});
