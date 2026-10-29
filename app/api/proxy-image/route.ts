import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { fetchRemoteImage, ImageFetchError } from "@/lib/net/safeImageFetch";

/**
 * GET /api/proxy-image?url=<encoded_url>
 *
 * Same-origin image proxy so html2canvas can draw remote student photos (e.g. from S3)
 * without tainting the canvas. SSRF protections, redirect refusal, the 5 MB cap and
 * image-type sniffing live in lib/net/safeImageFetch.ts.
 */
export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if (auth.response) return auth.response;

  const imageUrl = req.nextUrl.searchParams.get("url")?.trim();

  try {
    const { body, contentType } = await fetchRemoteImage(imageUrl);
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(body.length),
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: unknown) {
    if (err instanceof ImageFetchError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to fetch image upstream." }, { status: 502 });
  }
}
