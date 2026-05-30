import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PolicyService } from "#modules/billing/application/services/policy.service";
import { PrismaService } from "#shared/database/prisma.service";
import { STORAGE_DRIVER, type StorageDriver } from "#shared/storage/storage.interface";

const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "text/csv", "text/plain"];

export interface UploadFileInput {
	organizationId: string;
	userId: string | null;
	folder: string;
	file: {
		buffer: Buffer;
		originalname: string;
		mimetype: string;
		size: number;
	};
}

@Injectable()
export class UploadService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly policies: PolicyService,
		@Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
	) {}

	async list(organizationId: string, folder?: string) {
		return this.prisma.fileAsset.findMany({
			where: {
				organizationId,
				...(folder ? { folder } : {}),
			},
			orderBy: { createdAt: "desc" },
			take: 100,
		});
	}

	async upload(input: UploadFileInput) {
		this.assertAllowedFile(input.file);
		await this.policies.assertFeature(input.organizationId, "platform.file-upload");
		await this.policies.assertWithinLimit(input.organizationId, "platform.file-count");
		await this.policies.assertWithinLimit(input.organizationId, "platform.storage-bytes", input.file.size);
		const folder = this.safeFolder(input.folder);
		const saved = await this.storage.save({
			organizationId: input.organizationId,
			folder,
			buffer: input.file.buffer,
			originalName: input.file.originalname,
			mimeType: input.file.mimetype,
		});
		return this.prisma.fileAsset.create({
			data: {
				organizationId: input.organizationId,
				uploadedByUserId: input.userId,
				folder,
				key: saved.key,
				url: saved.url,
				filename: saved.filename,
				mimeType: saved.mimeType,
				size: saved.size,
				storageDriver: process.env.STORAGE_DRIVER === "object" ? "object" : "local",
			},
		});
	}

	async delete(organizationId: string, id: string) {
		const file = await this.prisma.fileAsset.findFirst({ where: { id, organizationId } });
		if (!file) throw new NotFoundException("file");
		await this.storage.delete(file.key);
		await this.prisma.fileAsset.delete({ where: { id } });
		return { id };
	}

	private assertAllowedFile(file: UploadFileInput["file"]) {
		const maxBytes = Number(process.env.UPLOAD_MAX_BYTES || DEFAULT_MAX_UPLOAD_BYTES);
		if (!file?.buffer?.length) throw new BadRequestException("file is required");
		if (file.size > maxBytes) throw new BadRequestException(`file exceeds ${maxBytes} bytes`);
		if (!ALLOWED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix))) {
			throw new BadRequestException(`unsupported file type: ${file.mimetype}`);
		}
	}

	private safeFolder(folder: string) {
		return (
			(folder || "general")
				.toLowerCase()
				.replace(/[^a-z0-9-_]/g, "-")
				.replace(/^-+|-+$/g, "")
				.slice(0, 80) || "general"
		);
	}
}
