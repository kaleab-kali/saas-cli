import { Injectable } from "@nestjs/common";
import { EimsSetupRepository } from "../../domain/eims-setup.repository";

@Injectable()
export class ListEimsSetupHandler {
	constructor(private readonly repo: EimsSetupRepository) {}

	async execute(organizationId: string) {
		const [enterprises, establishments, sourceSystems] = await Promise.all([
			this.repo.listEnterprises(organizationId),
			this.repo.listEstablishments(organizationId),
			this.repo.listSourceSystems(organizationId),
		]);

		return {
			status: sourceSystems.some((source) => source.approvalStatus === "approved") ? "ready" : "setup_required",
			counts: {
				enterprises: enterprises.length,
				establishments: establishments.length,
				sourceSystems: sourceSystems.length,
			},
			enterprises,
			establishments,
			sourceSystems,
		};
	}
}
