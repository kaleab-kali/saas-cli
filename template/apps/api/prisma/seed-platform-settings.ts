import "dotenv/config";
import { prisma } from "../src/shared/database/prisma-instance";

// Platform settings registry. Values are stored as strings and read through typed accessors.

const DEFAULTS: Array<{ key: string; value: string }> = [
	// billing
	{ key: "billing.vatRate", value: "15" },
	{ key: "billing.vatEnabled", value: "true" },
	{ key: "billing.currencyDefault", value: "USD" },
	{ key: "billing.invoicePrefix", value: "INV" },
	{ key: "billing.invoiceYearReset", value: "true" },
	{ key: "billing.paymentDueDays", value: "7" },
	{ key: "billing.gracePeriodDays", value: "7" },
	{ key: "billing.readOnlyPeriodDays", value: "14" },
	{ key: "billing.lockoutAfterDays", value: "30" },
	{ key: "billing.reminderSchedule", value: JSON.stringify([-7, -3, -1, 0, 3, 7, 14, 21, 28]) },
	{ key: "billing.autoSendInvoice", value: "true" },
	{ key: "billing.autoGenerateRenewalInvoice", value: "true" },
	{ key: "billing.chapaEnabled", value: "false" },
	{ key: "billing.manualPaymentMethods", value: JSON.stringify(["manual_bank", "manual_other"]) },

	// platform
	{ key: "platform.supportEmail", value: "support@example.com" },
	{ key: "platform.supportPhone", value: "" },
	{ key: "platform.companyName", value: "{{projectName}}" },
	{ key: "platform.companyAddress", value: "" },
	{ key: "platform.companyTin", value: "" },
	{ key: "platform.dunningFromEmail", value: "billing@example.com" },

	// dunning template keys
	{ key: "dunning.templateKey.reminder", value: "dunning_reminder" },
	{ key: "dunning.templateKey.overdue", value: "dunning_overdue" },
	{ key: "dunning.templateKey.grace", value: "dunning_grace" },
	{ key: "dunning.templateKey.readOnly", value: "dunning_read_only" },
	{ key: "dunning.templateKey.locked", value: "dunning_locked" },
	{ key: "dunning.templateKey.renewal", value: "dunning_renewal" },
];

const seed = async () => {
	console.log("Seeding platform settings defaults...");
	for (const s of DEFAULTS) {
		await prisma.platformSettings.upsert({
			where: { key: s.key },
			update: {},
			create: { key: s.key, value: s.value },
		});
	}
	console.log(`${DEFAULTS.length} platform settings ensured.`);
};

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
