import { Injectable } from "@nestjs/common";
import { ReportSpecService } from "../../domain/services/report-spec.service";

@Injectable()
export class AllowedFieldsHandler {
	constructor(private readonly spec: ReportSpecService) {}

	execute(dataSource: string): string[] {
		return this.spec.allowedFields(dataSource);
	}
}
