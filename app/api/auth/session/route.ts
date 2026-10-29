/**
 * app/api/auth/session/route.ts
 *
 * GET    → current operator (or 401)
 * POST   → exchange `Authorization: Bearer <crm-token>` for a session cookie
 * DELETE → sign out (clears the session cookie)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCrmToken } from "@/lib/auth/crmTokenVerifier";
import {
  encodeSession,
  getSession,
  sessionCookieOptions,
  unauthorizedResponse,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return unauthorizedResponse();
  return NextResponse.json({
    success: true,
    user: { id: session.sub, name: session.name ?? null },
    expiresAt: new Date(session.exp * 1000).toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const match = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
  if (!match) return unauthorizedResponse();

  const session = await verifyCrmToken(match[1]);
  if (!session) return unauthorizedResponse();

  const cookie = encodeSession(session);
  if (!cookie) {
    console.error("[auth] SESSION_SECRET is missing or shorter than 32 characters.");
    return NextResponse.json(
      { success: false, error: { code: "CONFIG_ERROR", message: "Authentication is not configured on this server." } },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ success: true, user: { id: session.sub, name: session.name ?? null } });
  res.cookies.set(SESSION_COOKIE_NAME, cookie, sessionCookieOptions(session.exp - Math.floor(Date.now() / 1000)));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return res;
}
