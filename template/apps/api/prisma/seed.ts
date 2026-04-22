import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const prisma = new PrismaClient({ adapter });

const seed = async () => {
	console.log("Seeding database...");

	// Clean existing data
	await prisma.building.deleteMany();
	await prisma.invitation.deleteMany();
	await prisma.member.deleteMany();
	await prisma.organization.deleteMany();
	await prisma.session.deleteMany();
	await prisma.account.deleteMany();
	await prisma.verification.deleteMany();
	await prisma.user.deleteMany();

	console.log("Cleared existing data");

	// Seed data will be added here as modules are implemented
	// For now, the database is clean and ready for Better Auth
	// to create users and organizations via the API.

	console.log("Seeding complete");
};

seed()
	.catch((e) => {
		console.error("Seed failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
