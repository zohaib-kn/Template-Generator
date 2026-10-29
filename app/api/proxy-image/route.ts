import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

/**
 * GET /api/proxy-image?url=<encoded_url>
 *
 * Server-side image proxy that fetches cross-origin images (e.g. from AWS S3)
 * and returns them with permissive CORS headers. This allows HTML5 canvas and
 * html2canvas to draw them without tainted-canvas CORS drops.
 */
export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get("url")?.trim();

  // 1. Validate URL parameter and enforce SSRF protections
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    return NextResponse.json(
      { error: "Invalid or missing image URL parameter. Must be an http/https URL." },
      { status: 400 }
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: "Malformed URL format." }, { status: 400 });
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block private IPs, loopbacks, and cloud metadata services
  const isPrivate =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "169.254.169.254" ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname);

  if (isPrivate) {
    return NextResponse.json(
      { error: "Access to private or internal network addresses is forbidden." },
      { status: 403 }
    );
  }

  // 2. Fetch server-side (server requests are not restricted by browser CORS)
  try {
    const upstream = await fetch(imageUrl, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": "TemplateGenerator-ImageProxy/1.0",
      },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream image fetch failed with HTTP ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    // 3. Return image with permissive CORS & cache headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    const message = isTimeout
      ? "Image proxy request timed out after 10 seconds."
      : err instanceof Error
      ? err.message
      : "Failed to fetch image upstream.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
