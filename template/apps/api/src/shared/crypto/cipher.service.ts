import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_HEX_LENGTH = 64;
const VERSION = "v1";

@Injectable()
export class CipherService implements OnModuleInit {
	private key: Buffer | null = null;

	constructor(private readonly config: ConfigService) {}

	onModuleInit() {
		this.key = parseMasterKey(this.config.get<string>("MASTER_KEY"));
	}

	encrypt(plaintext: string): string {
		const key = this.getKey();
		const iv = randomBytes(IV_BYTES);
		const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
		const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
		const tag = cipher.getAuthTag();
		return [VERSION, pack(iv), pack(tag), pack(ciphertext)].join(":");
	}

	decrypt(packed: string): string {
		const [version, ivPart, tagPart, ciphertextPart] = packed.split(":");
		if (version !== VERSION || !ivPart || !tagPart || !ciphertextPart) {
			throw new Error("Invalid ciphertext format");
		}

		const key = this.getKey();
		const iv = unpack(ivPart);
		const tag = unpack(tagPart);
		const ciphertext = unpack(ciphertextPart);
		if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
			throw new Error("Invalid ciphertext format");
		}

		const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
		decipher.setAuthTag(tag);
		return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
	}

	private getKey() {
		if (!this.key) {
			this.key = parseMasterKey(this.config.get<string>("MASTER_KEY"));
		}
		return this.key;
	}
}

const pack = (value: Buffer) => value.toString("base64url");
const unpack = (value: string) => Buffer.from(value, "base64url");

const parseMasterKey = (hex?: string) => {
	if (!hex || hex.length !== KEY_HEX_LENGTH) {
		throw new Error("MASTER_KEY must be a 32-byte hex string");
	}
	if (!/^[a-f0-9]+$/i.test(hex)) {
		throw new Error("MASTER_KEY must be hexadecimal");
	}
	return Buffer.from(hex, "hex");
};
