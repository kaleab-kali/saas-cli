import { Controller, Get, Headers, Param, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { EimsLookupService } from "./eims-lookup.service";

interface CacheAwareResponse {
	setHeader(name: string, value: string): void;
	status(code: number): void;
}

@Controller("eims/lookups")
@UseGuards(AuthGuard, PermissionsGuard)
export class EimsLookupController {
	constructor(private readonly lookups: EimsLookupService) {}

	@Get(":name")
	@RequirePermissions("eims-enterprise:read")
	get(
		@Param("name") name: string,
		@Headers("if-none-match") ifNoneMatch: string | undefined,
		@Res({ passthrough: true }) response: CacheAwareResponse,
	) {
		const lookup = this.lookups.get(name);
		response.setHeader("ETag", lookup.etag);
		response.setHeader("Cache-Control", lookup.cacheControl);
		if (this.lookups.matchesEtag(name, ifNoneMatch)) {
			response.status(304);
			return undefined;
		}
		return lookup;
	}
}
