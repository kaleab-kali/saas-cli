import * as path from "node:path";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PolicyService } from "#modules/billing/application/services/policy.service";
import { PrismaService } from "#shared/database/prisma.service";
import { STORAGE_DRIVER, type StorageDriver } from "#shared/storage/storage.interface";

const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

interface UploadTypePolicy {
	extensions: readonly string[];
	matches?: (buffer: Buffer) => boolean;
	text?: boolean;
}

const UPLOAD_TYPE_POLICIES: Record<string, UploadTypePolicy> = {
	"application/pdf": {
		extensions: [".pdf"],
		matches: (buffer) => buffer.subarray(0, 5).equals(Buffer.from("%PDF-")),
	},
	"image/gif": {
		extensions: [".gif"],
		matches: (buffer) =>
			["GIF87a", "GIF89a"].some((signature) => buffer.subarray(0, 6).toString("ascii") === signature),
	},
	"image/jpeg": {
		extensions: [".jpg", ".jpeg"],
		matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
	},
	"image/png": {
		extensions: [".png"],
		matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
	},
	"image/webp": {
		extensions: [".webp"],
		matches: (buffer) =>
			buffer.length >= 12 &&
			buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
			buffer.subarray(8, 12).toString("ascii") === "WEBP",
	},
	"text/csv": { extensions: [".csv"], text: true },
	"text/plain": { extensions: [".log", ".text", ".txt"], text: true },
};

export const uploadMaxBytes = () => {
	const configured = Number(process.env.UPLOAD_MAX_BYTES);
	return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_UPLOAD_BYTES;
};

const configuredAllowedMimeTypes = () => {
	const configured = process.env.UPLOAD_ALLOWED_MIME_TYPES?.split(",")
		.map((item) => normalizeMimeType(item))
		.filter(Boolean);
	const requested = configured?.length ? configured : Object.keys(UPLOAD_TYPE_POLICIES);
	return new Set(requested.filter((mimeType) => mimeType in UPLOAD_TYPE_POLICIES));
};

const normalizeMimeType = (mimeType: string) => mimeType.split(";")[0].trim().toLowerCase();

const looksLikeSafeText = (buffer: Buffer) => {
	if (buffer.includes(0)) return false;
	const start = buffer.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
	return !/^<(?:!doctype|html|script|svg|iframe|head|body)\b/.test(start);
};

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
		const file = this.assertAllowedFile(input.file);
		await this.policies.assertFeature(input.organizationId, "platform.file-upload");
		await this.policies.assertWithinLimit(input.organizationId, "platform.file-count");
		await this.policies.assertWithinLimit(input.organizationId, "platform.storage-bytes", file.size);
		const folder = this.safeFolder(input.folder);
		const saved = await this.storage.save({
			organizationId: input.organizationId,
			folder,
			buffer: file.buffer,
			originalName: file.originalname,
			mimeType: file.mimetype,
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

	private assertAllowedFile(file: UploadFileInput["file"]): UploadFileInput["file"] {
		const maxBytes = uploadMaxBytes();
		if (!file?.buffer?.length) throw new BadRequestException("file is required");
		if (file.size > maxBytes) throw new BadRequestException(`file exceeds ${maxBytes} bytes`);
		const mimeType = normalizeMimeType(file.mimetype);
		const policy = UPLOAD_TYPE_POLICIES[mimeType];
		if (!policy || !configuredAllowedMimeTypes().has(mimeType)) {
			throw new BadRequestException(`unsupported file type: ${file.mimetype}`);
		}

		const extension = path.extname(file.originalname).toLowerCase();
		if (!policy.extensions.includes(extension)) {
			throw new BadRequestException(`file extension does not match declared type: ${extension || "missing"}`);
		}
		if (policy.matches && !policy.matches(file.buffer)) {
			throw new BadRequestException("file content does not match declared type");
		}
		if (policy.text && !looksLikeSafeText(file.buffer)) {
			throw new BadRequestException("text upload contains unsafe content");
		}

		return { ...file, mimetype: mimeType, size: file.buffer.length };
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
