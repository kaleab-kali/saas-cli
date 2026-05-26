import { createHash, createSign, generateKeyPairSync } from "node:crypto";

const payload = {
	documentType: "INV",
	transactionType: "B2C",
	documentNumber: "PHASE0-LOCAL-1",
	documentDate: "2026-05-26T10:00:00+03:00",
};

const canonicalJson = JSON.stringify(payload);
const { privateKey } = generateKeyPairSync("rsa", {
	modulusLength: 2048,
	privateKeyEncoding: { type: "pkcs8", format: "pem" },
	publicKeyEncoding: { type: "spki", format: "pem" },
});

const signer = createSign("SHA512");
signer.update(canonicalJson, "utf8");
const signature = signer.sign(privateKey, "base64");
const payloadHash = createHash("sha256").update(canonicalJson).digest("hex");

console.log(JSON.stringify({ ok: true, canonicalJson, payloadHash, signatureLength: signature.length }, null, 2));
