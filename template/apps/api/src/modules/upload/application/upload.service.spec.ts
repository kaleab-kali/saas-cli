import { BadRequestException } from "@nestjs/common";
import { UploadService } from "./upload.service";

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const pdf = Buffer.from("%PDF-1.7\n");

const makeService = () => {
	const prisma = {
		fileAsset: {
			create: jest.fn(async ({ data }) => ({ id: "file_1", ...data })),
			delete: jest.fn(),
			findFirst: jest.fn(),
			findMany: jest.fn(),
		},
	};
	const policies = {
		assertFeature: jest.fn(),
		assertWithinLimit: jest.fn(),
	};
	const storage = {
		delete: jest.fn(),
		getUrl: jest.fn((key: string) => `/uploads/${key}`),
		save: jest.fn(async (params) => ({
			key: `${params.organizationId}/${params.folder}/file.png`,
			url: `/uploads/${params.organizationId}/${params.folder}/file.png`,
			filename: params.originalName,
			mimeType: params.mimeType,
			size: params.buffer.length,
		})),
	};

	return {
		policies,
		prisma,
		service: new UploadService(prisma as never, policies as never, storage as never),
		storage,
	};
};

describe("UploadService", () => {
	const originalAllowedTypes = process.env.UPLOAD_ALLOWED_MIME_TYPES;
	const originalMaxBytes = process.env.UPLOAD_MAX_BYTES;

	afterEach(() => {
		if (originalAllowedTypes === undefined) delete process.env.UPLOAD_ALLOWED_MIME_TYPES;
		else process.env.UPLOAD_ALLOWED_MIME_TYPES = originalAllowedTypes;
		if (originalMaxBytes === undefined) delete process.env.UPLOAD_MAX_BYTES;
		else process.env.UPLOAD_MAX_BYTES = originalMaxBytes;
	});

	it("stores allowed files with normalized folder and MIME metadata", async () => {
		delete process.env.UPLOAD_ALLOWED_MIME_TYPES;
		const { policies, service, storage } = makeService();

		const result = await service.upload({
			organizationId: "org_1",
			userId: "user_1",
			folder: "Team Docs/../../",
			file: {
				buffer: png,
				originalname: "Logo.PNG",
				mimetype: "image/png; charset=binary",
				size: png.length,
			},
		});

		expect(storage.save).toHaveBeenCalledWith(
			expect.objectContaining({
				folder: "team-docs",
				mimeType: "image/png",
				originalName: "Logo.PNG",
			}),
		);
		expect(policies.assertWithinLimit).toHaveBeenCalledWith("org_1", "platform.storage-bytes", png.length);
		expect(result).toMatchObject({ folder: "team-docs", mimeType: "image/png", size: png.length });
	});

	it("rejects extension and content mismatches", async () => {
		const { service } = makeService();

		await expect(
			service.upload({
				organizationId: "org_1",
				userId: null,
				folder: "general",
				file: { buffer: png, originalname: "invoice.pdf", mimetype: "image/png", size: png.length },
			}),
		).rejects.toThrow(BadRequestException);

		await expect(
			service.upload({
				organizationId: "org_1",
				userId: null,
				folder: "general",
				file: { buffer: Buffer.from("not a pdf"), originalname: "invoice.pdf", mimetype: "application/pdf", size: 9 },
			}),
		).rejects.toThrow(BadRequestException);
	});

	it("rejects SVG and HTML-style text uploads", async () => {
		const { service } = makeService();

		await expect(
			service.upload({
				organizationId: "org_1",
				userId: null,
				folder: "general",
				file: {
					buffer: Buffer.from("<svg><script>alert(1)</script></svg>"),
					originalname: "image.svg",
					mimetype: "image/svg+xml",
					size: 36,
				},
			}),
		).rejects.toThrow(/unsupported file type/);

		await expect(
			service.upload({
				organizationId: "org_1",
				userId: null,
				folder: "general",
				file: {
					buffer: Buffer.from("<html><script>alert(1)</script></html>"),
					originalname: "notes.txt",
					mimetype: "text/plain",
					size: 38,
				},
			}),
		).rejects.toThrow(/unsafe content/);
	});

	it("honors configured MIME allowlists", async () => {
		process.env.UPLOAD_ALLOWED_MIME_TYPES = "application/pdf";
		const { service } = makeService();

		await expect(
			service.upload({
				organizationId: "org_1",
				userId: null,
				folder: "general",
				file: { buffer: png, originalname: "logo.png", mimetype: "image/png", size: png.length },
			}),
		).rejects.toThrow(/unsupported file type/);

		await expect(
			service.upload({
				organizationId: "org_1",
				userId: null,
				folder: "general",
				file: { buffer: pdf, originalname: "invoice.pdf", mimetype: "application/pdf", size: pdf.length },
			}),
		).resolves.toMatchObject({ mimeType: "application/pdf" });
	});
});
