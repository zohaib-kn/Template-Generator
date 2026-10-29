import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import mammoth from "mammoth";
import { POST as exportDocx } from "../docx/route";
import { POST as exportPdf } from "../pdf/route";
import { testSessionCookie } from "@/lib/auth/__tests__/testSession";

describe("Export Endpoints — Master Template Verification", () => {
  const sampleCoverLetterSections = [
    {
      title: "Recipient / Consulate",
      content: "To,\nThe Respected Visa Officer,\nEmbassy of Italy / Consulate General,\nMumbai, India.",
    },
    {
      title: "Subject Line",
      content: "Subject: Application for a Long-Term Type D Student Visa to Pursue Computer Engineering at Università degli Studi di Padova",
    },
    {
      title: "Student Introduction",
      content: "My name is **Mohammad Taha Faisal**, and I am from **Bhopal, India**.",
    },
    {
      title: "Academic Background",
      content: "I completed my Class XII from **Sagar Public School Huzur Bhopal Mp** under CBSE in 2024 with 85%. I also scored 7.5 on IELTS Academic.",
    },
    {
      title: "Why This Course",
      content: "I chose Computer Engineering because it combines hardware, software, and innovative applications.",
    },
    {
      title: "Why This University",
      content: "Università degli Studi di Padova has an 800-year legacy associated with Galileo Galilei.",
    },
    {
      title: "Why Italy",
      content: "Italy offers world-class technical education and an inspiring academic culture.",
    },
    {
      title: "Future Academic Plan",
      content: "After completing my Bachelor's degree, I intend to specialize in distributed systems.",
    },
    {
      title: "Career Plan",
      content: "In the long term, I will return to India to work as a Software Architect.",
    },
    {
      title: "Intent to Return to Home Country",
      content: "Being the only son of my parents, I have strong familial commitments in India.",
    },
    {
      title: "Financial Capability & Sponsorship",
      content: "My studies are fully funded by an education loan of INR 39,00,000 from Credila Financial Services.",
    },
    {
      title: "Accommodation Arrangement",
      content: "I have arranged housing at Dimora in Prato, Padova, Italy.",
    },
    {
      title: "Health Insurance Coverage",
      content: "I hold a comprehensive overseas student health insurance policy.",
    },
    {
      title: "Travel & Flight Details",
      content: "I have booked travel on Emirates Airlines from Mumbai to Venice.",
    },
    {
      title: "Closing Statement",
      content: "Thank you for considering my student visa application.",
    },
    {
      title: "Student Contact & Signature",
      content: "Sincerely,\nMohammad Taha Faisal\ntaha@example.com\n+91 9876543210",
    },
  ];

  it("DOCX export follows master cover letter format and removes internal developer section headings", async () => {
    const req = new NextRequest("http://localhost:3000/api/export/docx", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: testSessionCookie() },
      body: JSON.stringify({
        title: "Mohammad Taha Faisal – Italy Visa Cover Letter",
        studentName: "Mohammad Taha Faisal",
        documentType: "COVER_LETTER",
        sections: sampleCoverLetterSections,
      }),
    });

    const res = await exportDocx(req);
    assert.equal(res.status, 200);

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse DOCX content using mammoth
    const { value: text } = await mammoth.extractRawText({ buffer });

    // 1. Must start with standard COVER LETTER header
    assert.ok(text.includes("COVER LETTER"), "Must include centered COVER LETTER header");

    // 2. Must NOT include candidate subheader banner
    assert.ok(!text.includes("Candidate: Mohammad Taha Faisal"), "Must not include candidate subheader");
    assert.ok(!text.includes("Document: COVER_LETTER"), "Must not include document type label");

    // 3. Must NOT include internal section headings
    assert.ok(!text.includes("Recipient / Consulate"), "Must not include Recipient / Consulate heading");
    assert.ok(!text.includes("Subject Line"), "Must not include Subject Line heading");
    assert.ok(!text.includes("Student Introduction"), "Must not include Student Introduction heading");
    assert.ok(!text.includes("Academic Background"), "Must not include Academic Background heading");
    assert.ok(!text.includes("Why This Course"), "Must not include Why This Course heading");
    assert.ok(!text.includes("Why This University"), "Must not include Why This University heading");
    assert.ok(!text.includes("Closing Statement"), "Must not include Closing Statement heading");
    assert.ok(!text.includes("Student Contact & Signature"), "Must not include Signature heading");

    // 4. Must include the actual letter text
    assert.ok(text.includes("To,") && text.includes("The Respected Visa Officer"), "Must include recipient block");
    assert.ok(text.includes("Subject: Application for a Long-Term Type D Student Visa"), "Must include subject line");
    assert.ok(text.includes("My name is Mohammad Taha Faisal"), "Must include student introduction");
    assert.ok(text.includes("Sagar Public School Huzur Bhopal Mp"), "Must include academic background");
    assert.ok(text.includes("Sincerely,"), "Must include closing signoff");
  });

  it("DOCX export correctly parses live HTML when provided from Tiptap editor", async () => {
    const liveHtml = `<div style="text-align: center;"><span style="font-weight: bold; text-decoration: underline;">COVER LETTER</span></div><p>To,<br/>The Respected Visa Officer,<br/>Consulate of Italy</p><p><strong>Subject: Visa Application</strong></p><p>My name is <strong>Mohammad Taha Faisal</strong>.</p><p>Sincerely,<br/>Mohammad Taha Faisal</p>`;

    const req = new NextRequest("http://localhost:3000/api/export/docx", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: testSessionCookie() },
      body: JSON.stringify({
        title: "Mohammad Taha Faisal – Italy Visa Cover Letter",
        studentName: "Mohammad Taha Faisal",
        documentType: "COVER_LETTER",
        html: liveHtml,
        sections: sampleCoverLetterSections,
      }),
    });

    const res = await exportDocx(req);
    assert.equal(res.status, 200);

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { value: text } = await mammoth.extractRawText({ buffer });

    assert.ok(text.includes("COVER LETTER"));
    assert.ok(text.includes("Mohammad Taha Faisal"));
    assert.ok(text.includes("Subject: Visa Application"));
    assert.ok(!text.includes("Recipient / Consulate"));
  });

  it("PDF vector export follows master cover letter format and removes internal developer headings", async () => {
    const req = new NextRequest("http://localhost:3000/api/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: testSessionCookie() },
      body: JSON.stringify({
        title: "Mohammad Taha Faisal – Italy Visa Cover Letter",
        studentName: "Mohammad Taha Faisal",
        documentType: "COVER_LETTER",
        sections: sampleCoverLetterSections,
      }),
    });

    const res = await exportPdf(req);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/pdf");

    const arrayBuffer = await res.arrayBuffer();
    assert.ok(arrayBuffer.byteLength > 1000, "PDF buffer must be non-empty");
  });

  it("DOCX export handles custom font family including Calibri", async () => {
    const req = new NextRequest("http://localhost:3000/api/export/docx", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: testSessionCookie() },
      body: JSON.stringify({
        title: "Mohammad Taha Faisal – Italy Visa Cover Letter",
        studentName: "Mohammad Taha Faisal",
        documentType: "COVER_LETTER",
        fontFamily: "Calibri",
        sections: sampleCoverLetterSections,
      }),
    });

    const res = await exportDocx(req);
    assert.equal(res.status, 200);
    assert.equal(
      res.headers.get("content-type"),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { value: text } = await mammoth.extractRawText({ buffer });

    assert.ok(text.includes("COVER LETTER"));
    assert.ok(text.includes("Mohammad Taha Faisal"));
  });
});
