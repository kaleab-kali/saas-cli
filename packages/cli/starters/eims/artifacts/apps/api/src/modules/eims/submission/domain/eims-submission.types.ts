export type EimsSubmissionStatus =
	| "draft"
	| "validated"
	| "pending_offline"
	| "queued"
	| "counter_reserved"
	| "submitting"
	| "accepted"
	| "rejected"
	| "failed_retryable"
	| "failed_final"
	| "unknown_submission"
	| "verified"
	| "cancel_requested"
	| "cancelled";

export type EimsCounterReservationStatus =
	| "reserved"
	| "submitting"
	| "accepted"
	| "rejected_reusable"
	| "rejected_consumed"
	| "unknown"
	| "manual_review";

export interface EimsSubmissionCommand {
	organizationId: string;
	sourceSystemId?: string;
	documentNumber?: string;
	payload?: unknown;
}
