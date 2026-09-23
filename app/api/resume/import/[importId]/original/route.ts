/**
 * app/api/resume/import/[importId]/original/route.ts
 *
 * Streams the original uploaded resume file directly from MongoDB GridFS.
 * Ensures the file is private and only accessible via this authenticated endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ResumeImportModel } from "@/models/ResumeImport";
import { getFileFromGridFS } from "@/services/import/storage/gridfsStorage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const { importId } = await params;
    await connectToDatabase();

    const record = await ResumeImportModel.findOne({ id: importId });
    if (!record || !record.gridfsFileId) {
      return NextResponse.json(
        { success: false, error: "Original file not found for this import." },
        { status: 404 }
      );
    }

    const file = await getFileFromGridFS(record.gridfsFileId.toString());
    if (!file) {
      return NextResponse.json(
        { success: false, error: "File could not be retrieved from storage." },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${file.fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
