import "dotenv/config";
import { prisma } from "../src/shared/database/prisma-instance";

const TEMPLATES: Array<{
	key: string;
	subject: string;
	bodyHtml: string;
	variables: string;
}> = [
	{
		key: "dunning_reminder",
		subject: "Reminder: {{invoiceNumber}} is due on {{dueDate}}",
		bodyHtml: `<p>Hi {{orgName}},</p>
<p>This is a reminder that invoice <strong>{{invoiceNumber}}</strong> for your <strong>{{planName}}</strong> subscription is due on <strong>{{dueDate}}</strong> ({{amount}}).</p>
<p>Please settle it via the <a href="{{payUrl}}">billing portal</a> to avoid any service interruption.</p>`,
		variables: "orgName,planName,invoiceNumber,dueDate,amount,payUrl",
	},
	{
		key: "dunning_overdue",
		subject: "Overdue: Please settle {{invoiceNumber}}",
		bodyHtml: `<p>Hi {{orgName}},</p>
<p>Your invoice <strong>{{invoiceNumber}}</strong> ({{amount}}) was due on <strong>{{dueDate}}</strong> and remains unpaid.</p>
<p>Please pay now at <a href="{{payUrl}}">{{payUrl}}</a>.</p>`,
		variables: "orgName,invoiceNumber,amount,dueDate,payUrl",
	},
	{
		key: "dunning_grace",
		subject: "Payment overdue — {{planName}} access warning",
		bodyHtml: `<p>Hi {{orgName}},</p>
<p>Payment for your <strong>{{planName}}</strong> subscription is overdue. Your account is in grace period until <strong>{{gracePeriodEndsAt}}</strong>, after which write access will be revoked.</p>
<p>Pay now: <a href="{{payUrl}}">{{payUrl}}</a>.</p>`,
		variables: "orgName,planName,gracePeriodEndsAt,payUrl",
	},
	{
		key: "dunning_read_only",
		subject: "Action required — your {{planName}} subscription is read-only",
		bodyHtml: `<p>Hi {{orgName}},</p>
<p>Write access to your <strong>{{planName}}</strong> account has been suspended due to non-payment. Your data is safe and visible, but you cannot create or edit records until payment is received.</p>
<p>Full lockout will occur on <strong>{{readOnlyModeEndsAt}}</strong>.</p>
<p>Pay: <a href="{{payUrl}}">{{payUrl}}</a></p>`,
		variables: "orgName,planName,readOnlyModeEndsAt,payUrl",
	},
	{
		key: "dunning_locked",
		subject: "Account locked — {{planName}} subscription",
		bodyHtml: `<p>Hi {{orgName}},</p>
<p>Your <strong>{{planName}}</strong> account has been fully locked because the outstanding invoice was not paid in time. Contact billing to restore access.</p>`,
		variables: "orgName,planName",
	},
	{
		key: "dunning_renewal",
		subject: "Your {{planName}} renewal invoice",
		bodyHtml: `<p>Hi {{orgName}},</p>
<p>Your renewal invoice <strong>{{invoiceNumber}}</strong> ({{amount}}) has been generated and is due on <strong>{{dueDate}}</strong>.</p>
<p>View and pay at <a href="{{payUrl}}">{{payUrl}}</a>.</p>`,
		variables: "orgName,planName,invoiceNumber,amount,dueDate,payUrl",
	},
];

const seed = async () => {
	for (const tpl of TEMPLATES) {
		await prisma.systemEmailTemplate.upsert({
			where: { key: tpl.key },
			update: {},
			create: tpl,
		});
	}
	console.log(`Seeded ${TEMPLATES.length} system email templates.`);
};

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
