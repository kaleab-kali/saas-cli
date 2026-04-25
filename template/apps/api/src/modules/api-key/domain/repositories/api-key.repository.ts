import type { ApiKey } from "../entities/api-key.entity";

export abstract class ApiKeyRepository {
	abstract list(organizationId: string, includeRevoked?: boolean): Promise<ApiKey[]>;
	abstract findById(organizationId: string, id: string): Promise<ApiKey | null>;
	abstract findByHash(hash: string): Promise<ApiKey | null>;
	abstract save(key: ApiKey): Promise<ApiKey>;
	abstract update(organizationId: string, id: string, key: ApiKey): Promise<ApiKey>;
}
