import { Controller, Get, Req, Res, UnauthorizedException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "@thallesp/nestjs-better-auth";
import type { Request, Response } from "express";
import { MetricsService } from "./metrics.service";

@ApiTags("Metrics")
@Controller("metrics")
@Public()
export class MetricsController {
	constructor(private readonly metricsService: MetricsService) {}

	@Get()
	@ApiOperation({ summary: "Prometheus metrics scrape endpoint" })
	async metrics(@Req() req: Request, @Res() res: Response) {
		const token = process.env.METRICS_TOKEN;
		if (token && req.headers.authorization !== `Bearer ${token}`) {
			throw new UnauthorizedException("invalid metrics token");
		}
		res.setHeader("Content-Type", this.metricsService.contentType());
		res.send(await this.metricsService.metrics());
	}
}
