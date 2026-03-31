import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path)) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const session = request.cookies.get("meta-lab-session")?.value;
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const [expiresAt, signature] = session.split(".");
  if (!expiresAt || !signature || Number(expiresAt) <= Date.now()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const expected = await sign(expiresAt);
  if (signature !== expected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

async function sign(payload: string) {
  const secret = process.env.ADMIN_SESSION_SECRET ?? process.env.APP_ENCRYPTION_KEY ?? "dev-session-secret-change-me";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
