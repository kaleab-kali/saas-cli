import { Global, Module } from "@nestjs/common";
import { LocalStorageDriver } from "./local-storage.driver";
import { ObjectStorageDriver } from "./object-storage.driver";
import { STORAGE_DRIVER } from "./storage.interface";

@Global()
@Module({
	providers: [
		LocalStorageDriver,
		ObjectStorageDriver,
		{
			provide: STORAGE_DRIVER,
			useFactory: (local: LocalStorageDriver, object: ObjectStorageDriver) =>
				process.env.STORAGE_DRIVER === "object" ? object : local,
			inject: [LocalStorageDriver, ObjectStorageDriver],
		},
	],
	exports: [STORAGE_DRIVER, LocalStorageDriver, ObjectStorageDriver],
})
export class StorageModule {}
