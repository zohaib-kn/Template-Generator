import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import mammoth from "mammoth";
import { extractText } from "unpdf";
import { POST as exportDocx } from "../docx/route";
import { POST as exportPdf } from "../pdf/route";
import { testSessionCookie } from "@/lib/auth/__tests__/testSession";
import { buildCoverLetterLayout } from "@/lib/export/coverLetterLayout";
import { resolveExportFont } from "@/lib/export/fonts";

function post(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: testSessionCookie() },
    body: JSON.stringify(body),
  });
}

async function docxText(res: Response) {
  return (await mammoth.extractRawText({ buffer: Buffer.from(await res.arrayBuffer()) })).value;
}
async function docxHtml(res: Response) {
  return (await mammoth.convertToHtml({ buffer: Buffer.from(await res.arrayBuffer()) })).value;
}
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

const coverSections = [
  { title: "Recipient / Consulate", content: "To,\nConsulate General of Italy\nMumbai, India" },
  { title: "Subject Line", content: "Subject: Student visa application" },
  { title: "Student Introduction", content: "My name is Sample Applicant." },
  { title: "Travel & Health Insurance", content: "INSURANCE-PARAGRAPH-UNIQUE policy obtained." },
  { title: "Travel Arrangements", content: "TRAVEL-PARAGRAPH-UNIQUE flight booked." },
  { title: "Additional Notes", content: "UNCLASSIFIED-SECTION-UNIQUE extra context." },
  { title: "Closing Statement", content: "Thank you for your consideration." },
  { title: "Student Contact & Signature", content: "Sincerely,\nSample Applicant\nEmail: applicant@example.com" },
];

describe("Export consistency", () => {
  it("assigns each cover-letter section exactly once and keeps unclassified sections", () => {
    const layout = buildCoverLetterLayout(coverSections);
    const body = layout.paragraphs.join("\n");
    assert.equal(count(body, "INSURANCE-PARAGRAPH-UNIQUE"), 1);
    assert.equal(count(body, "TRAVEL-PARAGRAPH-UNIQUE"), 1);
    assert.equal(count(body, "UNCLASSIFIED-SECTION-UNIQUE"), 1);
    assert.ok(body.indexOf("UNCLASSIFIED") < body.indexOf("Thank you"), "unclassified content precedes the closing");
  });

  it("DOCX cover letter prints insurance once and keeps travel arrangements", async () => {
    const res = await exportDocx(post("http://localhost/api/export/docx", { documentType: "COVER_LETTER", sections: coverSections }));
    const text = await docxText(res);
    assert.equal(count(text, "INSURANCE-PARAGRAPH-UNIQUE"), 1);
    assert.equal(count(text, "TRAVEL-PARAGRAPH-UNIQUE"), 1);
    assert.equal(count(text, "UNCLASSIFIED-SECTION-UNIQUE"), 1);
  });

  it("PDF cover letter prints insurance once and keeps travel arrangements", async () => {
    const res = await exportPdf(post("http://localhost/api/export/pdf", { documentType: "COVER_LETTER", sections: coverSections }));
    const { text } = await extractText(new Uint8Array(await res.arrayBuffer()), { mergePages: true });
    assert.equal(count(text, "INSURANCE-PARAGRAPH-UNIQUE"), 1);
    assert.equal(count(text, "TRAVEL-PARAGRAPH-UNIQUE"), 1);
  });

  it("DOCX HTML import keeps nested-block text, loose text and outer bold across </span>", async () => {
    const html =
      "<div><div>NESTED-FIRST</div><p>NESTED-SECOND</p></div>LOOSE-TEXT" +
      "<p><strong>BOLD-START <span style=\"color:red\">inner</span> BOLD-AFTER-SPAN</strong></p>" +
      "<ul><li>ITEM-ONE</li><li>ITEM-TWO</li></ul><p>Fish &amp; chips &#8211; &#x2014;</p>";
    const res = await exportDocx(post("http://localhost/api/export/docx", { documentType: "SOP", html, sections: [] }));
    const buf = Buffer.from(await res.arrayBuffer());
    const { value: text } = await mammoth.extractRawText({ buffer: buf });
    for (const t of ["NESTED-FIRST", "NESTED-SECOND", "LOOSE-TEXT", "ITEM-ONE", "ITEM-TWO", "Fish & chips – —"]) {
      assert.ok(text.includes(t), `missing "${t}"`);
    }
    const { value: out } = await mammoth.convertToHtml({ buffer: buf });
    assert.match(out, /<strong>[^<]*BOLD-AFTER-SPAN<\/strong>/, "text after </span> must stay bold");
  });

  it("CV DOCX follows the Europass section structure rather than the flat editor HTML", async () => {
    const res = await exportDocx(
      post("http://localhost/api/export/docx", {
        documentType: "CV",
        studentName: "Sample Applicant",
        html: "<p>FLAT-EDITOR-HTML-SHOULD-NOT-BE-USED</p>",
        sections: [
          { title: "Education and Training", content: "BSc Computer Science\nSample University [ 2020 – 2023 ]\n• Final grade: 8/10" },
          { title: "Skills", content: "SQL / Python" },
        ],
      })
    );
    const out = await docxHtml(res);
    assert.ok(out.includes("SAMPLE APPLICANT"));
    assert.ok(out.includes("EDUCATION AND TRAINING"));
    assert.match(out, /<strong>BSc Computer Science<\/strong>/);
    assert.ok(out.includes("• Final grade: 8/10") || out.includes("Final grade: 8/10"));
    assert.ok(!out.includes("FLAT-EDITOR-HTML-SHOULD-NOT-BE-USED"));
  });

  it("PDF never silently truncates: overflow adds pages and is reported", async () => {
    const long = Array.from({ length: 60 }, (_, i) => `Paragraph ${i} ` + "lorem ipsum dolor sit amet ".repeat(12)).join("\n");
    const res = await exportPdf(
      post("http://localhost/api/export/pdf", { documentType: "SOP", sections: [{ title: "Body", content: long + "\nFINAL-LINE-UNIQUE" }], maxPages: 1 })
    );
    assert.equal(res.headers.get("X-Exceeds-Page-Limit"), "true");
    assert.ok(Number(res.headers.get("X-Page-Count")) > 1);
    const { text } = await extractText(new Uint8Array(await res.arrayBuffer()), { mergePages: true });
    assert.ok(text.includes("FINAL-LINE-UNIQUE"), "last line must be present");
  });

  it("only allow-listed fonts are written into documents", () => {
    assert.equal(resolveExportFont("'Georgia', serif", "Calibri"), "Georgia");
    assert.equal(resolveExportFont("Evil\"/><w:font", "Calibri"), "Calibri");
    assert.equal(resolveExportFont(undefined, "Arial"), "Arial");
  });
});
