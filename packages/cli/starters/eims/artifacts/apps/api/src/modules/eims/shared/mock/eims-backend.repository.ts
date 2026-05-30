export const EIMS_BACKEND_REPOSITORY = Symbol("EIMS_BACKEND_REPOSITORY");

export interface EimsBackendObjectEnvelope {
	data: Record<string, unknown>;
	meta?: Record<string, unknown>;
}

export interface EimsBackendListEnvelope {
	data: unknown[];
	meta?: Record<string, unknown>;
}

export interface EimsBackendRepository {
	tenantOverview(organizationId: string): EimsBackendObjectEnvelope;
	tenantWorkspace(organizationId: string): EimsBackendObjectEnvelope;
	submissions(organizationId: string): EimsBackendListEnvelope;
	createAcceptedSubmission(organizationId: string, documentNumber?: string): EimsBackendObjectEnvelope;
	receipts(organizationId: string): EimsBackendListEnvelope;
	createAcceptedReceipt(organizationId: string, input: Record<string, unknown>): EimsBackendObjectEnvelope;
	credentials(organizationId: string): EimsBackendListEnvelope;
	saveCredential(organizationId: string, body: Record<string, unknown>): EimsBackendObjectEnvelope;
	testCredential(organizationId: string, sourceSystemId?: string): EimsBackendObjectEnvelope;
	certificates(organizationId: string): EimsBackendListEnvelope;
	generateCsr(organizationId: string, sourceSystemId?: string): EimsBackendObjectEnvelope;
	importCertificate(organizationId: string, body: Record<string, unknown>): EimsBackendObjectEnvelope;
	bulkBatches(organizationId: string): EimsBackendListEnvelope;
	submitBulk(organizationId: string): EimsBackendObjectEnvelope;
	reconcileBulk(organizationId: string, conversationId?: string): EimsBackendObjectEnvelope;
	cancellations(organizationId: string): EimsBackendListEnvelope;
	cancelInvoice(organizationId: string, body: Record<string, unknown>): EimsBackendObjectEnvelope;
	buyers(organizationId: string): EimsBackendListEnvelope;
	printLayouts(organizationId: string): EimsBackendListEnvelope;
	notificationLogs(organizationId: string): EimsBackendListEnvelope;
	branchHealth(organizationId: string): EimsBackendListEnvelope;
	complianceEvidence(organizationId: string): EimsBackendObjectEnvelope;
	generateEvidence(organizationId: string): EimsBackendObjectEnvelope;
	adminOverview(): EimsBackendObjectEnvelope;
	adminTenants(): EimsBackendListEnvelope;
	adminFailures(): EimsBackendListEnvelope;
	adminCertificates(): EimsBackendListEnvelope;
	adminResources(): EimsBackendObjectEnvelope;
	adminCompliance(): EimsBackendObjectEnvelope;
	adminRunAction(action: string, targetId?: string): EimsBackendObjectEnvelope;
}
