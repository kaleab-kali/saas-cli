import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "#shared/database/prisma.service";

// Registry of known keys + their parsed type. Unknown keys pass through as strings.
export const PLATFORM_SETTING_KEYS = {
	// billing
	"billing.vatRate": "number",
	"billing.vatEnabled": "boolean",
	"billing.currencyDefault": "string",
	"billing.invoicePrefix": "string",
	"billing.invoiceYearReset": "boolean",
	"billing.paymentDueDays": "number",
	"billing.gracePeriodDays": "number",
	"billing.readOnlyPeriodDays": "number",
	"billing.lockoutAfterDays": "number",
	"billing.reminderSchedule": "json",
	"billing.autoSendInvoice": "boolean",
	"billing.autoGenerateRenewalInvoice": "boolean",
	"billing.chapaEnabled": "boolean",
	"billing.manualPaymentMethods": "json",

	// platform
	"platform.supportEmail": "string",
	"platform.supportPhone": "string",
	"platform.companyName": "string",
	"platform.companyAddress": "string",
	"platform.companyTin": "string",
	"platform.dunningFromEmail": "string",

	// dunning
	"dunning.templateKey.reminder": "string",
	"dunning.templateKey.overdue": "string",
	"dunning.templateKey.grace": "string",
	"dunning.templateKey.readOnly": "string",
	"dunning.templateKey.locked": "string",
	"dunning.templateKey.renewal": "string",
} as const;

export type PlatformSettingKey = keyof typeof PLATFORM_SETTING_KEYS;
export type PlatformSettingType = (typeof PLATFORM_SETTING_KEYS)[PlatformSettingKey];

@Injectable()
export class PlatformSettingsService {
	private readonly logger = new Logger(PlatformSettingsService.name);
	private cache = new Map<string, { value: unknown; at: number }>();
	private readonly ttlMs = 60_000;

	constructor(private readonly prisma: PrismaService) {}

	async getAll() {
		return this.prisma.platformSettings.findMany({ orderBy: { key: "asc" } });
	}

	async get<T = string | number | boolean | unknown[] | Record<string, unknown>>(key: string): Promise<T | null> {
		const cached = this.cache.get(key);
		if (cached && Date.now() - cached.at < this.ttlMs) return cached.value as T;
		const row = await this.prisma.platformSettings.findUnique({ where: { key } });
		if (!row) return null;
		const parsed = this.parse(key, row.value) as T;
		this.cache.set(key, { value: parsed, at: Date.now() });
		return parsed;
	}

	async getString(key: string, fallback = ""): Promise<string> {
		const v = await this.get<string>(key);
		return typeof v === "string" ? v : fallback;
	}

	async getNumber(key: string, fallback = 0): Promise<number> {
		const v = await this.get<number>(key);
		return typeof v === "number" && Number.isFinite(v) ? v : fallback;
	}

	async getBool(key: string, fallback = false): Promise<boolean> {
		const v = await this.get<boolean>(key);
		return typeof v === "boolean" ? v : fallback;
	}

	async getJson<T>(key: string, fallback: T): Promise<T> {
		const v = await this.get<T>(key);
		return v == null ? fallback : v;
	}

	async set(key: string, rawValue: string) {
		// validate against registry if known
		this.parse(key, rawValue);
		await this.prisma.platformSettings.upsert({
			where: { key },
			update: { value: rawValue },
			create: { key, value: rawValue },
		});
		this.cache.delete(key);
	}

	async setMany(entries: Array<{ key: string; value: string }>) {
		for (const e of entries) {
			this.parse(e.key, e.value);
		}
		await this.prisma.$transaction(
			entries.map((e) =>
				this.prisma.platformSettings.upsert({
					where: { key: e.key },
					update: { value: e.value },
					create: { key: e.key, value: e.value },
				}),
			),
		);
		for (const e of entries) this.cache.delete(e.key);
	}

	invalidate(key?: string) {
		if (key) this.cache.delete(key);
		else this.cache.clear();
	}

	private parse(key: string, raw: string): unknown {
		const type = (PLATFORM_SETTING_KEYS as Record<string, PlatformSettingType>)[key];
		if (!type) return raw;
		try {
			switch (type) {
				case "number": {
					const n = Number(raw);
					if (!Number.isFinite(n)) throw new Error(`invalid number for ${key}`);
					return n;
				}
				case "boolean":
					if (raw === "true") return true;
					if (raw === "false") return false;
					throw new Error(`invalid boolean for ${key}`);
				case "json":
					return JSON.parse(raw);
				default:
					return raw;
			}
		} catch (e) {
			this.logger.warn(`platform setting ${key} parse failed: ${(e as Error).message}`);
			throw e;
		}
	}
}
