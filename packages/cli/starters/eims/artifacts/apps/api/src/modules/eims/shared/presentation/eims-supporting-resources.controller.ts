import { Body, Controller, Get, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { PermissionsGuard } from "#modules/auth/guards/permissions.guard";
import { RequirePermissions } from "#shared/decorators/permissions.decorator";
import { EimsCredentialSecretService } from "../crypto/eims-credential-secret.service";
import { EIMS_BACKEND_REPOSITORY, type EimsBackendRepository } from "../mock/eims-backend.repository";
import { type EimsPrintProofInput, EimsPrintProofService } from "../printing/eims-print-proof.service";

interface AuthedRequest {
	organizationId: string;
}

@Controller("eims")
@UseGuards(AuthGuard, PermissionsGuard)
export class EimsSupportingResourcesController {
	constructor(
		@Inject(EIMS_BACKEND_REPOSITORY) private readonly repository: EimsBackendRepository,
		private readonly credentialSecrets: EimsCredentialSecretService,
		private readonly printProof: EimsPrintProofService,
	) {}

	@Get("credentials")
	@RequirePermissions("eims-credential:read")
	credentials(@Req() req: AuthedRequest) {
		return this.repository.credentials(req.organizationId);
	}

	@Post("credentials")
	@RequirePermissions("eims-credential:create")
	saveCredential(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
		const sealed = this.credentialSecrets.sealPayload(body);
		return this.credentialSecrets.withRedactionMetadata(
			this.repository.saveCredential(req.organizationId, sealed.persistablePayload),
			sealed,
		);
	}

	@Post("credentials/test")
	@RequirePermissions("eims-credential:create")
	testCredential(@Req() req: AuthedRequest, @Body() body: { sourceSystemId?: string }) {
		return this.repository.testCredential(req.organizationId, body.sourceSystemId);
	}

	@Post("credentials/rotate")
	@RequirePermissions("eims-credential:rotate")
	rotateCredential(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
		const rotated = this.credentialSecrets.sealRotationPayload(body);
		return this.credentialSecrets.withRedactionMetadata(
			this.repository.saveCredential(req.organizationId, rotated.persistablePayload),
			rotated,
		);
	}

	@Get("certificates")
	@RequirePermissions("eims-certificate:read")
	certificates(@Req() req: AuthedRequest) {
		return this.repository.certificates(req.organizationId);
	}

	@Post("certificates/generate-csr")
	@RequirePermissions("eims-certificate:import")
	generateCsr(@Req() req: AuthedRequest, @Body() body: { sourceSystemId?: string }) {
		return this.repository.generateCsr(req.organizationId, body.sourceSystemId);
	}

	@Post("certificates/import")
	@RequirePermissions("eims-certificate:import")
	importCertificate(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
		return this.repository.importCertificate(req.organizationId, body);
	}

	@Get("bulk")
	@RequirePermissions("eims-bulk:read")
	bulk(@Req() req: AuthedRequest) {
		return this.repository.bulkBatches(req.organizationId);
	}

	@Post("bulk")
	@RequirePermissions("eims-bulk:create")
	submitBulk(@Req() req: AuthedRequest) {
		return this.repository.submitBulk(req.organizationId);
	}

	@Post("bulk/reconcile")
	@RequirePermissions("eims-bulk:retry")
	reconcileBulk(@Req() req: AuthedRequest, @Body() body: { conversationId?: string }) {
		return this.repository.reconcileBulk(req.organizationId, body.conversationId);
	}

	@Get("cancellations")
	@RequirePermissions("invoice:read")
	cancellations(@Req() req: AuthedRequest) {
		return this.repository.cancellations(req.organizationId);
	}

	@Post("cancellations")
	@RequirePermissions("invoice:cancel")
	cancelInvoice(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
		return this.repository.cancelInvoice(req.organizationId, body);
	}

	@Get("buyers")
	@RequirePermissions("invoice:read")
	buyers(@Req() req: AuthedRequest) {
		return this.repository.buyers(req.organizationId);
	}

	@Get("print-layouts")
	@RequirePermissions("invoice:read")
	printLayouts(@Req() req: AuthedRequest) {
		return this.repository.printLayouts(req.organizationId);
	}

	@Post("print-layouts/proof")
	@RequirePermissions("invoice:read")
	printLayoutProof(@Req() req: AuthedRequest, @Body() body: Omit<EimsPrintProofInput, "organizationId">) {
		return this.printProof.generate({ ...body, organizationId: req.organizationId });
	}

	@Get("notifications")
	@RequirePermissions("invoice:read")
	notifications(@Req() req: AuthedRequest) {
		return this.repository.notificationLogs(req.organizationId);
	}

	@Get("branch-health")
	@RequirePermissions("eims-source:read")
	branchHealth(@Req() req: AuthedRequest) {
		return this.repository.branchHealth(req.organizationId);
	}

	@Post("compliance/evidence")
	@RequirePermissions("eims-compliance:export")
	generateEvidence(@Req() req: AuthedRequest) {
		return this.repository.generateEvidence(req.organizationId);
	}
}
