/**
 * lib/auth/session.ts
 *
 * Operator session handling for CRM token passthrough.
 *
 * Flow:
 *   CRM issues a short-lived token → the operator lands on /api/auth/launch?token=…
 *   (or a server client sends Authorization: Bearer …) → the token is verified against
 *   CRM_AUTH_VERIFY_URL (see lib/auth/crmTokenVerifier.ts and docs/crm-auth-contract.md)
 *   → the verified identity and its allowed student IDs are sealed into an HMAC-signed,
 *   HttpOnly session cookie.
 *
 * Security:
 * - Fails closed: with no SESSION_SECRET or no verify endpoint, nobody is authenticated.
 * - Cookie signature is compared with timingSafeEqual; expired sessions are rejected.
 * - AUTH_DEV_BYPASS=true grants a local-only session and is ignored in production.
 */

import crypto from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isSampleStudentId } from "@/lib/sampleStudents";
import { verifyCrmToken } from "@/lib/auth/crmTokenVerifier";

export const SESSION_COOKIE_NAME = "tg_session";

export interface OperatorSession {
  /** CRM user ID of the operator. */
  sub: string;
  name?: string;
  /** Student IDs this operator may act on, or "*" for all students. */
  students: string[] | "*";
  /** Expiry, seconds since epoch. */
  exp: number;
}

function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

function isDevBypassEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_BYPASS === "true";
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function encodeSession(session: OperatorSession): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function decodeSession(value: string | undefined | null): OperatorSession | null {
  const secret = getSessionSecret();
  if (!secret || !value) return null;

  const dot = value.indexOf(".");
  if (dot <= 0) return null;
  const payload = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(payload, secret));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OperatorSession;
    if (typeof parsed.sub !== "string" || !parsed.sub) return null;
    if (typeof parsed.exp !== "number" || parsed.exp * 1000 <= Date.now()) return null;
    if (parsed.students !== "*" && !Array.isArray(parsed.students)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getBearerToken(req: Request | NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

function readCookie(req: Request | NextRequest, name: string): string | undefined {
  if ("cookies" in req && typeof req.cookies?.get === "function") {
    return req.cookies.get(name)?.value;
  }
  const raw = req.headers.get("cookie");
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

/**
 * Resolves the operator for a request: signed session cookie first, then a CRM bearer
 * token (verified against the CRM on every call that lacks a cookie). Null = unauthenticated.
 */
export async function getSession(req: Request | NextRequest): Promise<OperatorSession | null> {
  const fromCookie = decodeSession(readCookie(req, SESSION_COOKIE_NAME));
  if (fromCookie) return fromCookie;

  const bearer = getBearerToken(req);
  if (bearer) return verifyCrmToken(bearer);

  if (isDevBypassEnabled()) {
    return { sub: "local-dev", name: "Local developer", students: "*", exp: Math.floor(Date.now() / 1000) + 3600 };
  }
  return null;
}

/** Fictional sample students are open to any authenticated operator. */
export function canAccessStudent(session: OperatorSession, studentId: string | null | undefined): boolean {
  if (!studentId) return false;
  if (isSampleStudentId(studentId)) return true;
  if (session.students === "*") return true;
  return session.students.includes(studentId);
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: { code: "UNAUTHORIZED", message: "Sign in through the CRM to use this service." } },
    { status: 401 }
  );
}

export function forbiddenResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: { code: "FORBIDDEN", message: "You do not have access to this student." } },
    { status: 403 }
  );
}

/**
 * Route-handler guard. Returns the session, or a 401/403 response to return as-is.
 * Pass studentId to additionally enforce student-level access.
 */
export async function requireSession(
  req: Request | NextRequest,
  options: { studentId?: string | null } = {}
): Promise<{ session: OperatorSession; response?: undefined } | { session?: undefined; response: NextResponse }> {
  const session = await getSession(req);
  if (!session) return { response: unauthorizedResponse() };
  if (options.studentId !== undefined && options.studentId !== null && !canAccessStudent(session, options.studentId)) {
    return { response: forbiddenResponse() };
  }
  return { session };
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Only allow redirects to same-origin relative paths ("/x", never "//host" or "/\\host"). */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
