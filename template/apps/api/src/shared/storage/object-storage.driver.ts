import { createHash, createHmac } from "node:crypto";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import { createId } from "@paralleldrive/cuid2";
import type { StorageDriver, StoredFile } from "./storage.interface";

const MAX_FILENAME_LENGTH = 80;
const EMPTY_SHA256 = createHash("sha256").update("").digest("hex");

interface ObjectStorageConfig {
	endpoint: string;
	bucket: string;
	region: string;
	accessKey: string;
	secretKey: string;
	publicUrl?: string;
}

const safeName = (name: string): string => {
	const parsed = path.parse(name);
	const base = parsed.name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, MAX_FILENAME_LENGTH);
	const ext = parsed.ext
		.toLowerCase()
		.replace(/[^.a-z0-9]/g, "")
		.slice(0, 16);
	return `${base || "file"}${ext}`;
};

const sha256Hex = (input: Buffer | string) => createHash("sha256").update(input).digest("hex");

const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data).digest();

const hmacHex = (key: Buffer, data: string) => createHmac("sha256", key).update(data).digest("hex");

const amzDate = (date: Date) => date.toISOString().replace(/[:-]|\.\d{3}/g, "");

const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");

@Injectable()
export class ObjectStorageDriver implements StorageDriver {
	async save(params: {
		organizationId: string;
		folder: string;
		buffer: Buffer;
		originalName: string;
		mimeType: string;
	}): Promise<StoredFile> {
		const filename = `${createId()}_${safeName(params.originalName)}`;
		const key = `${params.organizationId}/${params.folder}/${filename}`;
		const config = this.config();
		const url = this.objectUrl(config, key);
		const contentHash = sha256Hex(params.buffer);
		const headers = this.sign({
			config,
			method: "PUT",
			url,
			bodyHash: contentHash,
			contentType: params.mimeType,
		});

		const response = await fetch(url, {
			method: "PUT",
			body: new Blob([new Uint8Array(params.buffer)]),
			headers,
		});

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			throw new Error(`Object storage upload failed (${response.status}): ${body.slice(0, 500)}`);
		}

		return {
			key,
			url: this.getUrl(key),
			filename: params.originalName,
			mimeType: params.mimeType,
			size: params.buffer.length,
		};
	}

	async delete(key: string): Promise<void> {
		const config = this.config();
		const url = this.objectUrl(config, key);
		const headers = this.sign({
			config,
			method: "DELETE",
			url,
			bodyHash: EMPTY_SHA256,
			contentType: "application/octet-stream",
		});
		const response = await fetch(url, { method: "DELETE", headers });
		if (!response.ok && response.status !== 404) {
			const body = await response.text().catch(() => "");
			throw new Error(`Object storage delete failed (${response.status}): ${body.slice(0, 500)}`);
		}
	}

	getUrl(key: string): string {
		const config = this.config();
		const base = config.publicUrl ? new URL(config.publicUrl) : this.objectUrl(config, "");
		base.pathname = `${base.pathname.replace(/\/$/, "")}/${encodeKey(key)}`;
		return base.toString();
	}

	private config(): ObjectStorageConfig {
		const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
		const bucket = process.env.OBJECT_STORAGE_BUCKET;
		const accessKey = process.env.OBJECT_STORAGE_ACCESS_KEY;
		const secretKey = process.env.OBJECT_STORAGE_SECRET_KEY;
		if (!endpoint || !bucket || !accessKey || !secretKey) {
			throw new Error(
				"Object storage is enabled but OBJECT_STORAGE_ENDPOINT, OBJECT_STORAGE_BUCKET, OBJECT_STORAGE_ACCESS_KEY, or OBJECT_STORAGE_SECRET_KEY is missing.",
			);
		}
		return {
			endpoint,
			bucket,
			region: process.env.OBJECT_STORAGE_REGION || "us-east-1",
			accessKey,
			secretKey,
			publicUrl: process.env.OBJECT_STORAGE_PUBLIC_URL || undefined,
		};
	}

	private objectUrl(config: ObjectStorageConfig, key: string): URL {
		const url = new URL(config.endpoint);
		const prefix = url.pathname.replace(/\/$/, "");
		const suffix = key ? `/${encodeKey(key)}` : "";
		url.pathname = `${prefix}/${config.bucket}${suffix}`;
		return url;
	}

	private sign(input: {
		config: ObjectStorageConfig;
		method: "DELETE" | "PUT";
		url: URL;
		bodyHash: string;
		contentType: string;
	}): Record<string, string> {
		const now = new Date();
		const requestDate = amzDate(now);
		const dateStamp = requestDate.slice(0, 8);
		const credentialScope = `${dateStamp}/${input.config.region}/s3/aws4_request`;
		const host = input.url.host;
		const canonicalHeaders = [
			["content-type", input.contentType],
			["host", host],
			["x-amz-content-sha256", input.bodyHash],
			["x-amz-date", requestDate],
		]
			.map(([key, value]) => `${key}:${value}\n`)
			.join("");
		const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
		const canonicalRequest = [
			input.method,
			input.url.pathname,
			input.url.searchParams.toString(),
			canonicalHeaders,
			signedHeaders,
			input.bodyHash,
		].join("\n");
		const stringToSign = ["AWS4-HMAC-SHA256", requestDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");
		const dateKey = hmac(`AWS4${input.config.secretKey}`, dateStamp);
		const dateRegionKey = hmac(dateKey, input.config.region);
		const dateRegionServiceKey = hmac(dateRegionKey, "s3");
		const signingKey = hmac(dateRegionServiceKey, "aws4_request");
		const signature = hmacHex(signingKey, stringToSign);

		return {
			authorization: `AWS4-HMAC-SHA256 Credential=${input.config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
			"content-type": input.contentType,
			"x-amz-content-sha256": input.bodyHash,
			"x-amz-date": requestDate,
		};
	}
}
