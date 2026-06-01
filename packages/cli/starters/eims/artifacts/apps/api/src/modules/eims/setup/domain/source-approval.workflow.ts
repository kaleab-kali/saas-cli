import { BadRequestException } from "@nestjs/common";

export const EIMS_SOURCE_APPROVAL_STATUSES = [
	"draft",
	"submitted",
	"pending_mor_approval",
	"approved",
	"rejected",
	"disabled",
] as const;

export type EimsSourceApprovalStatus = (typeof EIMS_SOURCE_APPROVAL_STATUSES)[number];

const transitions: Record<EimsSourceApprovalStatus, readonly EimsSourceApprovalStatus[]> = {
	draft: ["submitted", "disabled"],
	submitted: ["pending_mor_approval", "rejected", "disabled"],
	pending_mor_approval: ["approved", "rejected", "disabled"],
	approved: ["disabled"],
	rejected: ["submitted", "disabled"],
	disabled: ["submitted"],
};

export function assertSourceApprovalStatus(value: string): asserts value is EimsSourceApprovalStatus {
	if (!EIMS_SOURCE_APPROVAL_STATUSES.includes(value as EimsSourceApprovalStatus)) {
		throw new BadRequestException(`Unsupported EIMS source approval status: ${value}`);
	}
}

export function nextSourceApprovalState(current: string, next: string) {
	assertSourceApprovalStatus(current);
	assertSourceApprovalStatus(next);
	if (current === next) return { approvalStatus: next, active: next === "approved" };
	if (!transitions[current].includes(next)) {
		throw new BadRequestException(`Cannot move EIMS source approval from ${current} to ${next}`);
	}
	return { approvalStatus: next, active: next === "approved" };
}
