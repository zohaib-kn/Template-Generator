/**
 * app/api/auth/launch/route.ts
 *
 * GET /api/auth/launch?token=<crm-token>&next=/path
 *
 * Entry point when an operator opens the Template Generator from the CRM. The CRM token
 * is verified server-side, exchanged for an HttpOnly session cookie and the operator is
 * redirected to `next` (same-origin relative paths only). The token never reaches page code.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCrmToken } from "@/lib/auth/crmTokenVerifier";
import { encodeSession, safeNextPath, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  const next = safeNextPath(req.nextUrl.searchParams.get("next"));

  const fail = (reason: string) => {
    const url = new URL("/auth/required", req.url);
    url.searchParams.set("reason", reason);
    return NextResponse.redirect(url);
  };

  if (!token) return fail("missing_token");

  const session = await verifyCrmToken(token);
  if (!session) return fail("invalid_token");

  const cookie = encodeSession(session);
  if (!cookie) {
    console.error("[auth] SESSION_SECRET is missing or shorter than 32 characters.");
    return fail("server_config");
  }

  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.set(SESSION_COOKIE_NAME, cookie, sessionCookieOptions(session.exp - Math.floor(Date.now() / 1000)));
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
