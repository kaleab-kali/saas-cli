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
	private readonly updatedAt = new Date().toISOString();
	private readonly version = "phase0-seed-v1";

	get(name: string) {
		const data = this.data()[name] ?? [];
		return { version: this.version, updatedAt: this.updatedAt, data };
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
}
