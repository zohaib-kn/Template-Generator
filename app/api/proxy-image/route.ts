import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/proxy-image?url=<encoded_url>
 *
 * Server-side image proxy that fetches cross-origin images (e.g. from AWS S3)
 * and returns them with permissive CORS headers. This allows HTML5 canvas and
 * html2canvas to draw them without tainted-canvas CORS drops.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get("url")?.trim();

  // 1. Validate URL parameter
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    return NextResponse.json(
      { error: "Invalid or missing image URL parameter. Must be an http/https URL." },
      { status: 400 }
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
