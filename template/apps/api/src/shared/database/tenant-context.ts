import { AsyncLocalStorage } from "node:async_hooks";
import { Global, Injectable, Module } from "@nestjs/common";

interface TenantStore {
	organizationId: string;
	userId?: string;
	apiKeyId?: string;
}

const als = new AsyncLocalStorage<TenantStore>();

@Injectable()
export class TenantContext {
	run<T>(store: TenantStore, fn: () => T): T {
		return als.run(store, fn);
	}

	get(): TenantStore | undefined {
		return als.getStore();
	}

	organizationId(): string | undefined {
		return als.getStore()?.organizationId;
	}

	requireOrganizationId(): string {
		const id = this.organizationId();
		if (!id) throw new Error("TenantContext.organizationId is not set");
		return id;
	}
}

@Global()
@Module({ providers: [TenantContext], exports: [TenantContext] })
export class TenantContextModule {}
