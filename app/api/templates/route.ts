/**
 * app/api/templates/route.ts
 *
 * REST API for approved invariant templates.
 * GET /api/templates — lists all approved templates, optionally filtered by country and docType.
 * Auto-seeds initial templates from SEED_TEMPLATES if MongoDB is empty.
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

    await connectToDatabase();

    // Check count and seed initial approved templates if collection is empty
    const count = await TemplateModel.countDocuments();
    if (count === 0) {
      await TemplateModel.insertMany(SEED_TEMPLATES);
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
    const message = err instanceof Error ? err.message : "Failed to retrieve templates";
    // If DB is unreachable (e.g. offline unit test mode), return SEED_TEMPLATES gracefully
    return NextResponse.json({
      success: true,
      templates: SEED_TEMPLATES,
      source: "seed_fallback",
      warning: message,
    });
  }
}
