import type { UsageSnapshot } from "../entities/usage-snapshot.entity";

export abstract class UsageSnapshotRepository {
	abstract save(s: UsageSnapshot): Promise<UsageSnapshot>;
	abstract findLatestByOrg(organizationId: string): Promise<UsageSnapshot | null>;
	abstract listByOrg(organizationId: string, take: number): Promise<UsageSnapshot[]>;
}
