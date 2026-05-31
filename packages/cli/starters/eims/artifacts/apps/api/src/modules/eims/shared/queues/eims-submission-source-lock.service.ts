import { randomUUID } from "node:crypto";
import { Injectable, OnModuleDestroy, ServiceUnavailableException } from "@nestjs/common";
import IORedis from "ioredis";

interface RedisLockClient {
	set(key: string, value: string, ttlMode: "PX", ttlMs: number, setMode: "NX"): Promise<"OK" | null>;
	eval(script: string, keyCount: number, key: string, token: string, ttlMs?: number): Promise<number | string>;
	quit?(): Promise<void>;
}

interface EimsSubmissionSourceLockOptions {
	redisUrl?: string;
	locksEnabled?: boolean;
	lockTtlMs?: number;
	lockWaitMs?: number;
	redis?: RedisLockClient;
	sleepMs?: (ms: number) => Promise<void>;
}

const RELEASE_SCRIPT =
	'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';
const RENEW_SCRIPT =
	'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("pexpire", KEYS[1], ARGV[2]) else return 0 end';

@Injectable()
export class EimsSubmissionSourceLockService implements OnModuleDestroy {
	private connection: RedisLockClient | null = null;

	constructor(private readonly options?: EimsSubmissionSourceLockOptions) {}

	async onModuleDestroy() {
		await this.connection?.quit?.();
	}

	status() {
		const enabled = this.locksEnabled();
		const redisConfigured = Boolean(this.redisUrl() || this.options?.redis);
		return {
			enabled,
			redisConfigured,
			lockTtlMs: this.lockTtlMs(),
			lockWaitMs: this.lockWaitMs(),
			reason: enabled && !redisConfigured ? "Set REDIS_URL before enabling EIMS_SUBMISSION_DISTRIBUTED_LOCKS" : null,
		};
	}

	async withSourceLock<T>(organizationId: string, sourceSystemId: string, callback: () => Promise<T>): Promise<T> {
		if (!this.locksEnabled()) return callback();
		const redis = this.redis();
		const key = this.lockKey(organizationId, sourceSystemId);
		const token = randomUUID();

		await this.acquire(redis, key, token, sourceSystemId);
		const renewTimer = setInterval(
			() => {
				void this.renew(redis, key, token);
			},
			Math.max(1_000, Math.floor(this.lockTtlMs() / 3)),
		);
		(renewTimer as unknown as { unref?: () => void }).unref?.();

		try {
			return await callback();
		} finally {
			clearInterval(renewTimer);
			await this.release(redis, key, token);
		}
	}

	private async acquire(redis: RedisLockClient, key: string, token: string, sourceSystemId: string) {
		const ttlMs = this.lockTtlMs();
		const waitMs = this.lockWaitMs();
		const deadline = Date.now() + waitMs;

		for (;;) {
			const result = await redis.set(key, token, "PX", ttlMs, "NX");
			if (result === "OK") return;
			if (Date.now() >= deadline) {
				throw new ServiceUnavailableException(`Timed out waiting for EIMS submission source lock ${sourceSystemId}`);
			}
			await this.sleep(Math.min(250, Math.max(25, Math.floor(waitMs / 20))));
		}
	}

	private async renew(redis: RedisLockClient, key: string, token: string) {
		await redis.eval(RENEW_SCRIPT, 1, key, token, this.lockTtlMs());
	}

	private async release(redis: RedisLockClient, key: string, token: string) {
		await redis.eval(RELEASE_SCRIPT, 1, key, token);
	}

	private redis() {
		if (this.connection) return this.connection;
		if (this.options?.redis) {
			this.connection = this.options.redis;
			return this.connection;
		}
		const redisUrl = this.redisUrl();
		if (!redisUrl) throw new ServiceUnavailableException("REDIS_URL is required for EIMS distributed submission locks");
		this.connection = new IORedis(redisUrl, {
			maxRetriesPerRequest: null,
		}) as unknown as RedisLockClient;
		return this.connection;
	}

	private lockKey(organizationId: string, sourceSystemId: string) {
		return `eims:submission-lock:${organizationId}:${sourceSystemId}`;
	}

	private redisUrl() {
		return this.options?.redisUrl ?? process.env.REDIS_URL;
	}

	private locksEnabled() {
		return this.options?.locksEnabled ?? process.env.EIMS_SUBMISSION_DISTRIBUTED_LOCKS === "true";
	}

	private lockTtlMs() {
		return this.positiveNumber(this.options?.lockTtlMs ?? process.env.EIMS_SUBMISSION_LOCK_TTL_MS, 30_000);
	}

	private lockWaitMs() {
		return this.positiveNumber(this.options?.lockWaitMs ?? process.env.EIMS_SUBMISSION_LOCK_WAIT_MS, 10_000);
	}

	private positiveNumber(value: unknown, fallback: number) {
		const parsed = Number(value);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
	}

	private sleep(ms: number) {
		if (this.options?.sleepMs) return this.options.sleepMs(ms);
		return new Promise<void>((resolve) => setTimeout(resolve, ms));
	}
}
