export interface SourceSubmissionReadiness {
	approvalStatus: string;
	active: boolean;
	systemNumber?: string | null;
	credentialLastTestedAt?: Date | null;
	certificateValidTo?: Date | null;
	counterInitialized: boolean;
}

export function evaluateSourceSubmissionReadiness(source: SourceSubmissionReadiness, now = new Date()) {
	const reasons: string[] = [];

	if (source.approvalStatus !== "approved") reasons.push("source_not_approved");
	if (!source.active) reasons.push("source_inactive");
	if (!source.systemNumber) reasons.push("missing_system_number");
	if (!source.credentialLastTestedAt) reasons.push("credential_not_tested");
	if (!source.certificateValidTo) reasons.push("certificate_missing");
	else if (source.certificateValidTo <= now) reasons.push("certificate_expired");
	if (!source.counterInitialized) reasons.push("counter_not_initialized");

	return { ready: reasons.length === 0, reasons };
}
