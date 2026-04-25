export const REPORTING_EVENTS = {
	REPORT_CREATED: "reporting.report.created",
	REPORT_UPDATED: "reporting.report.updated",
	REPORT_DELETED: "reporting.report.deleted",
	REPORT_EXECUTED: "reporting.report.executed",
	REPORT_FAILED: "reporting.report.failed",
	SCHEDULE_CREATED: "reporting.schedule.created",
	SCHEDULE_CANCELLED: "reporting.schedule.cancelled",
	SCHEDULE_DELIVERED: "reporting.schedule.delivered",
} as const;
export type ReportingEventName = (typeof REPORTING_EVENTS)[keyof typeof REPORTING_EVENTS];
