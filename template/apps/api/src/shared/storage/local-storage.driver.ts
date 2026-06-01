import { promises as fs } from "node:fs";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import { createId } from "#shared/lib/id";
import type { StorageDriver, StoredFile } from "./storage.interface";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const MAX_FILENAME_LENGTH = 80;

const safeName = (name: string): string => {
	const parsed = path.parse(name);
	const base = parsed.name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, MAX_FILENAME_LENGTH);
	const ext = parsed.ext
		.toLowerCase()
		.replace(/[^.a-z0-9]/g, "")
		.slice(0, 16);
	return `${base || "file"}${ext}`;
};

const safeUploadsPath = (...parts: string[]) => {
	const target = path.resolve(UPLOADS_DIR, ...parts);
	const root = `${UPLOADS_DIR}${path.sep}`;
	if (target !== UPLOADS_DIR && !target.startsWith(root)) {
		throw new Error("upload path escaped storage root");
	}
	return target;
};

@Injectable()
export class LocalStorageDriver implements StorageDriver {
	async save(params: {
		organizationId: string;
		folder: string;
		buffer: Buffer;
		originalName: string;
		mimeType: string;
	}): Promise<StoredFile> {
		const filename = `${createId()}_${safeName(params.originalName)}`;
		const relativePath = path.join(params.organizationId, params.folder, filename);
		const fullPath = safeUploadsPath(relativePath);

		await fs.mkdir(path.dirname(fullPath), { recursive: true });
		await fs.writeFile(fullPath, params.buffer);

		const key = relativePath.replace(/\\/g, "/");
		return {
			key,
			url: this.getUrl(key),
			filename: params.originalName,
			mimeType: params.mimeType,
			size: params.buffer.length,
		};
	}

	async delete(key: string): Promise<void> {
		const fullPath = safeUploadsPath(key);
		try {
			await fs.unlink(fullPath);
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
		}
	}

	getUrl(key: string): string {
		return `/uploads/${key}`;
	}
}
