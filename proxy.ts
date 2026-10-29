/**
 * proxy.ts
 *
 * Network-boundary authentication for every page and API route.
 *
 * - /auth/* and /api/auth/* are public (sign-in flow).
 * - /api/documents/* also accepts the server-to-server X-API-Key webhook credential,
 *   validated here and again inside each handler.
 * - Everything else needs an operator session (signed cookie or CRM bearer token).
 *
 * Route handlers that touch student data re-check the session and student-level access
 * themselves (lib/auth/session.ts → requireSession); this proxy is the outer layer only.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { authenticateWebhookRequest } from "@/services/webhook/authenticate";

function isPublicPath(pathname: string): boolean {
  return pathname === "/auth" || pathname.startsWith("/auth/") || pathname.startsWith("/api/auth/");
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const isApi = pathname.startsWith("/api/");

  if (isApi && pathname.startsWith("/api/documents/")) {
    if (req.method === "OPTIONS" || authenticateWebhookRequest(req)) return NextResponse.next();
  }

  const session = await getSession(req);
  if (session) return NextResponse.next();

  if (isApi) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Sign in through the CRM to use this service." } },
      { status: 401 }
    );
  }

  const url = new URL("/auth/required", req.url);
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  // Every API path, plus all pages except Next.js internals and static files (file extension).
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
