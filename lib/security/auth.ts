import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "meta-lab-session";
const TTL_MS = 1000 * 60 * 60 * 12;

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.APP_ENCRYPTION_KEY ?? "dev-session-secret-change-me";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export async function createSessionCookie() {
  const expiresAt = Date.now() + TTL_MS;
  const payload = `${expiresAt}`;
  const signature = sign(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAuthenticated() {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return false;
  const [expiresAt, signature] = raw.split(".");
  if (!expiresAt || !signature) return false;
  if (sign(expiresAt) !== signature) return false;
  return Number(expiresAt) > Date.now();
}

export async function requireAuth() {
  const ok = await isAuthenticated();
  if (!ok) {
    redirect("/login");
  }
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("ADMIN_PASSWORD is not configured");
  }
  const passwordHash = crypto.createHash("sha256").update(password).digest();
  const expectedHash = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(passwordHash, expectedHash);
}
