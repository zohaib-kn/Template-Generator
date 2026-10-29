/**
 * app/api/templates/route.ts
 *
 * REST API for approved invariant templates.
 * GET /api/templates — lists all approved templates, optionally filtered by country and docType.
 * Read-only: when the collection is empty or unreachable, the built-in SEED_TEMPLATES are
 * returned without writing anything to the database.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { TemplateModel } from "@/models/Template";
import { SEED_TEMPLATES } from "@/services/templateEngine/seedTemplates";
import { requireSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country")?.trim();
    const docType = searchParams.get("docType")?.trim();

    const matchesFilters = (t: { targetCountry?: string; documentType?: string; status?: string }) =>
      t.status === "APPROVED" &&
      (!country || t.targetCountry === country || t.targetCountry === "Global") &&
      (!docType || t.documentType === docType);

    await connectToDatabase();

    if ((await TemplateModel.estimatedDocumentCount()) === 0) {
      return NextResponse.json({
        success: true,
        templates: SEED_TEMPLATES.filter(matchesFilters),
        source: "seed",
      });
    }

    const query: Record<string, unknown> = {
      status: "APPROVED",
    };

    if (country) {
      query.$or = [{ targetCountry: country }, { targetCountry: "Global" }];
    }

    if (docType) {
      query.documentType = docType;
    }

    const templates = await TemplateModel.find(query).sort({ updatedAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (err: unknown) {
    // DB unreachable (e.g. offline unit test mode): serve built-in templates; details stay in server logs
    console.error("[api/templates] Falling back to built-in templates:", err instanceof Error ? err.message : err);
    return NextResponse.json({
      success: true,
      templates: SEED_TEMPLATES,
      source: "seed_fallback",
    });
  }
}
