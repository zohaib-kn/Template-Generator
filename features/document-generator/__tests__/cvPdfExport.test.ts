import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildFilename,
  safeFilenamePart,
} from "@/features/document-generator/pdf/generateDocumentPdf";
import type { DocumentData } from "@/types";

describe("Phase 2: CV PDF Generation & Direct Download", () => {
  const sampleCvData: DocumentData = {
    personal: {
      fullName: "Angad Deep",
      nationality: "Indian",
    },
  };

  describe("1. PDF Filename Generation & Custom Filename Contract", () => {
    it("respects explicit customFilename when provided", () => {
      const filename = buildFilename(sampleCvData, {
        customFilename: "Angad_Deep_CV.pdf",
      });
      assert.equal(filename, "Angad_Deep_CV.pdf");
    });

    it("automatically appends .pdf extension if omitted from customFilename", () => {
      const filename = buildFilename(sampleCvData, {
        customFilename: "Angad_Deep_CV",
      });
      assert.equal(filename, "Angad_Deep_CV.pdf");
    });

    it("falls back to standard [Name]_[DocType]_[Country]_[Year].pdf when customFilename is omitted", () => {
      const filename = buildFilename(sampleCvData, {
        documentType: "CV",
        country: "India",
        year: 2026,
      });
      assert.equal(filename, "Angad_Deep_CV_India_2026.pdf");
    });

    it("sanitizes unsafe characters in filename segments safely", () => {
      const sanitized = safeFilenamePart("Angad Deep / Special-Chars & Spaces!!");
      assert.equal(sanitized, "Angad_Deep_Special_Chars_Spaces");
    });
  });
});
