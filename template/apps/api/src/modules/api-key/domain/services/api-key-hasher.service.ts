import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ApiKeyHasherService {
	static readonly PLAIN_PREFIX = "pf_";

	generate(): { plain: string; hash: string; prefix: string } {
		const random = randomBytes(32).toString("hex");
		const plain = `${ApiKeyHasherService.PLAIN_PREFIX}${random}`;
		return {
			plain,
			hash: this.hash(plain),
			prefix: plain.slice(0, 11), // "pf_" + 8 hex chars
		};
	}

	hash(plain: string): string {
		return createHash("sha256").update(plain).digest("hex");
	}
}
