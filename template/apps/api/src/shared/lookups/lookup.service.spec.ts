import { BadRequestException } from "@nestjs/common";
import { LookupService } from "./lookup.service";

const makePrisma = () =>
	({
		lookup: {
			create: jest.fn(),
			createMany: jest.fn(),
			delete: jest.fn(),
			findFirst: jest.fn(),
			findMany: jest.fn(),
			update: jest.fn(),
		},
	}) as const;

describe("LookupService", () => {
	it("lists tenant-defined lookup kinds without requiring built-in defaults", async () => {
		const prisma = makePrisma();
		prisma.lookup.findMany.mockResolvedValueOnce([
			{
				id: "lookup_1",
				organizationId: "org_1",
				kind: "project_status",
				value: "active",
				label: "Active",
				description: null,
				color: "#22c55e",
				sortOrder: 10,
				isBuiltIn: false,
				archived: false,
			},
		]);

		const rows = await new LookupService(prisma as never).list("org_1", "project_status");

		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ kind: "project_status", value: "active" });
		expect(prisma.lookup.createMany).not.toHaveBeenCalled();
	});

	it("creates values for tenant-defined lookup kinds", async () => {
		const prisma = makePrisma();
		prisma.lookup.findFirst.mockResolvedValueOnce(null);
		prisma.lookup.create.mockResolvedValueOnce({
			id: "lookup_created",
			organizationId: "org_1",
			kind: "project_status",
			value: "waiting_on_customer",
			label: "Waiting on customer",
			description: null,
			color: null,
			sortOrder: 30,
			isBuiltIn: false,
			archived: false,
		});

		const row = await new LookupService(prisma as never).create("org_1", "project_status", {
			label: "Waiting on customer",
			sortOrder: 30,
		});

		expect(prisma.lookup.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				organizationId: "org_1",
				kind: "project_status",
				value: "waiting_on_customer",
				label: "Waiting on customer",
				sortOrder: 30,
				isBuiltIn: false,
			}),
		});
		expect(row).toMatchObject({ value: "waiting_on_customer", label: "Waiting on customer" });
	});

	it("rejects unsafe lookup kind route parameters", async () => {
		await expect(new LookupService(makePrisma() as never).list("org_1", "../secrets")).rejects.toBeInstanceOf(
			BadRequestException,
		);
	});
});
