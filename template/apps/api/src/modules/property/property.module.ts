import { Module } from "@nestjs/common";
import { PropertyController } from "./presentation/controllers/property.controller";

@Module({
	controllers: [PropertyController],
	providers: [],
})
export class PropertyModule {}
