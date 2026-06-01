import { BadRequestException } from "@nestjs/common";
import { nextSourceApprovalState } from "./source-approval.workflow";

describe("source approval workflow", () => {
	it("walks a source through the MoR approval statuses", () => {
		expect(nextSourceApprovalState("draft", "submitted")).toEqual({ approvalStatus: "submitted", active: false });
		expect(nextSourceApprovalState("submitted", "pending_mor_approval")).toEqual({
			approvalStatus: "pending_mor_approval",
			active: false,
		});
		expect(nextSourceApprovalState("pending_mor_approval", "approved")).toEqual({
			approvalStatus: "approved",
			active: true,
		});
	});

	it("turns off submission when an approved source is disabled", () => {
		expect(nextSourceApprovalState("approved", "disabled")).toEqual({ approvalStatus: "disabled", active: false });
	});

	it("rejects skipped or unknown authority approval states", () => {
		expect(() => nextSourceApprovalState("draft", "approved")).toThrow(BadRequestException);
		expect(() => nextSourceApprovalState("draft", "unknown")).toThrow(BadRequestException);
	});
});
