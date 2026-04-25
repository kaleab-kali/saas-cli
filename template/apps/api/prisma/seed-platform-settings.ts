import "dotenv/config";
import { prisma } from "../src/shared/database/prisma-instance";

// Phase 12d — platform settings registry (super-admin editable).
// Values stored as strings (ints/bools/JSON serialized), consumed via typed accessor.

const DEFAULTS: Array<{ key: string; value: string }> = [
	// billing
	{ key: "billing.vatRate", value: "15" },
	{ key: "billing.vatEnabled", value: "true" },
	{ key: "billing.currencyDefault", value: "ETB" },
	{ key: "billing.invoicePrefix", value: "PF-INV" },
	{ key: "billing.invoiceYearReset", value: "true" },
	{ key: "billing.paymentDueDays", value: "7" },
	{ key: "billing.gracePeriodDays", value: "7" },
	{ key: "billing.readOnlyPeriodDays", value: "14" },
	{ key: "billing.lockoutAfterDays", value: "30" },
	{ key: "billing.reminderSchedule", value: JSON.stringify([-7, -3, -1, 0, 3, 7, 14, 21, 28]) },
	{ key: "billing.autoSendInvoice", value: "true" },
	{ key: "billing.autoGenerateRenewalInvoice", value: "true" },
	{ key: "billing.chapaEnabled", value: "true" },
	{
		key: "billing.manualPaymentMethods",
		value: JSON.stringify(["cash", "bank_transfer", "telebirr", "cbe_birr", "cheque"]),
	},

	// platform
	{ key: "platform.supportEmail", value: "support@propflow.et" },
	{ key: "platform.supportPhone", value: "+251-11-000-0000" },
	{ key: "platform.companyName", value: "PropFlow" },
	{ key: "platform.companyAddress", value: "Addis Ababa, Ethiopia" },
	{ key: "platform.companyTin", value: "" },
	{ key: "platform.dunningFromEmail", value: "billing@propflow.et" },

	// dunning template keys (template bodies live in EmailTemplate; these map type→key)
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
