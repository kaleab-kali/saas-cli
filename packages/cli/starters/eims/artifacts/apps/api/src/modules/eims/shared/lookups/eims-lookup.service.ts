import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
	CANCELLATION_REASON_CODES,
	DOCUMENT_TYPES,
	NATURE_OF_SUPPLY,
	PAYMENT_MODES,
	REGION_CODES,
	SOURCE_SYSTEM_TYPES,
	TAX_CODE_PREFIXES,
	TRANSACTION_TYPES,
	UNITS_OF_MEASURE,
} from "../constants/eims-lookup-values";

@Injectable()
export class EimsLookupService {
	private readonly updatedAt = new Date("2026-05-26T00:00:00.000+03:00").toISOString();
	private readonly version = "eims-lookup-seed-v3";
	private readonly cacheTtlSeconds = Number(process.env.EIMS_LOOKUP_CACHE_TTL_SECONDS ?? 300);

	get(name: string) {
		const data = this.data()[name] ?? [];
		const etag = this.etagFor(name, data);
		return {
			version: this.version,
			updatedAt: this.updatedAt,
			etag,
			cacheControl: `private, max-age=${this.cacheTtlSeconds}`,
			data,
		};
	}

	matchesEtag(name: string, ifNoneMatch?: string) {
		if (!ifNoneMatch) return false;
		const current = this.get(name).etag;
		return ifNoneMatch
			.split(",")
			.map((part) => part.trim())
			.includes(current);
	}

	private data(): Record<string, readonly unknown[]> {
		return {
			"document-types": DOCUMENT_TYPES,
			"transaction-types": TRANSACTION_TYPES,
			"source-system-types": SOURCE_SYSTEM_TYPES,
			"cancellation-reasons": CANCELLATION_REASON_CODES,
			"tax-codes": TAX_CODE_PREFIXES,
			"payment-modes": PAYMENT_MODES,
			units: UNITS_OF_MEASURE,
			"nature-of-supply": NATURE_OF_SUPPLY,
			regions: REGION_CODES,
		};
	}

	private etagFor(name: string, data: readonly unknown[]) {
		const payload = JSON.stringify({ name, version: this.version, updatedAt: this.updatedAt, data });
		return `"${createHash("sha256").update(payload).digest("hex").slice(0, 32)}"`;
	}
}
