import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey() {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("APP_ENCRYPTION_KEY is required");
  }

  const normalized = raw.length === 44 ? Buffer.from(raw, "base64") : Buffer.from(raw, "utf8");
  if (normalized.length < 32) {
    throw new Error("APP_ENCRYPTION_KEY must be 32 bytes or a base64 equivalent");
  }

  return normalized.subarray(0, 32);
}

export function encryptSecret(value?: string | null) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(value?: string | null) {
  if (!value) return null;
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}
