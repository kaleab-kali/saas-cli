const readPositiveIntegerEnv = (name: string, fallback: number) => {
	const raw = process.env[name];
	if (!raw) return fallback;
	const parsed = Number.parseInt(raw, 10);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const apiRateLimitTtlMs = () => readPositiveIntegerEnv("API_RATE_LIMIT_TTL_MS", 60_000);
export const apiRateLimitPerTenant = () => readPositiveIntegerEnv("API_RATE_LIMIT_PER_TENANT", 60);
export const apiRateLimitBlockMs = () => readPositiveIntegerEnv("API_RATE_LIMIT_BLOCK_MS", apiRateLimitTtlMs());
