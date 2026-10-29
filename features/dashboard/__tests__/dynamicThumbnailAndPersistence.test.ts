import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { getSampleAafiaAmeenSnapshot, getSampleAaravMehtaSnapshot, getSampleRohanIyerSnapshot } from "@/lib/sampleStudents";
import { hydrateDocumentFromSnapshot, RECENT_DOCS_STORAGE_KEY } from "@/features/dashboard/utils/documentHydrator";
import { DocumentThumbnailPreview } from "@/features/dashboard/components/DocumentThumbnailPreview";

describe("Dynamic Student Document Thumbnails & Studio Persistence", () => {
  it("Aarav Mehta Cover Letter thumbnail renders Aarav's dynamic profile and zero Aafia Ameen data", () => {
    const aaravSnapshot = getSampleAaravMehtaSnapshot();
    const aaravDoc = hydrateDocumentFromSnapshot(
      "COVER_LETTER",
      aaravSnapshot,
      "sample-aarav-mehta",
      "italy-type-d-student-visa-cover-letter"
    );

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(DocumentThumbnailPreview, {
        docType: aaravDoc.docType,
        studentName: aaravDoc.studentName,
        targetUniversity: aaravDoc.targetUniversity,
        targetCourse: aaravDoc.targetCourse,
        targetCountry: aaravDoc.targetCountry,
        sections: aaravDoc.sections,
        isTemplateCard: false,
      })
    );

    // Must dynamically display Aarav Mehta's personal details
    assert.ok(html.includes("Aarav Mehta"), "Should render Aarav Mehta name");
    assert.ok(html.includes("Bhopal School of Management Studies") || html.includes("Bhopal"), "Should render Aarav academic institution/city");
    assert.ok(html.includes("aarav.mehta.test@example.com"), "Should render Aarav's personal email");
    assert.ok(html.includes("+91 98765 43210"), "Should render Aarav's contact number");

    // Must NOT contain Aafia Ameen's hardcoded data
    assert.ok(!html.includes("Aafia Ameen"), "Must not display Aafia Ameen");
    assert.ok(!html.includes("National College Bangalore"), "Must not display Aafia's school");
    assert.ok(!html.includes("aafia.ameen.test@example.com"), "Must not display Aafia's email");
    assert.ok(!html.includes("Sample Student Residence"), "Must not display Aafia's accommodation");
  });

  it("Fardeen Europass CV thumbnail renders Fardeen's initials monogram and zero Rohan Iyer data", () => {
    const fardeenSections = [
      {
        heading: "ABOUT ME",
        content: "Ambitious international finance graduate seeking admission to Master in Management at ESCP Business School, Paris, France.",
      },
      {
        heading: "WORK EXPERIENCE",
        content: "Financial Analyst Trainee\nDeloitte India [ 06/2023 – 04/2024 ]\nLocation: Mumbai, India\n• Automated quarterly portfolio reconciliation",
      },
      {
        heading: "EDUCATION AND TRAINING",
        content: "Bachelor of Commerce (International Finance)\nUniversity of Mumbai [ 2020 – 2023 ]\nLocation: Mumbai, India | Final grade: GPA 8.7/10",
      },
      {
        heading: "LANGUAGE SKILLS",
        content: "Mother tongue: Hindi\nOther languages: English (C1 Fluent - IELTS 7.5), French (A2 Elementary)",
      },
    ];

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(DocumentThumbnailPreview, {
        docType: "CV",
        studentName: "Fardeen",
        targetUniversity: "ESCP Business School",
        targetCourse: "Master in Management",
        targetCountry: "France",
        sections: fardeenSections,
        isTemplateCard: false,
      })
    );

    // Must render Fardeen's dynamic details
    assert.ok(html.includes("FARDEEN"), "Should render FARDEEN in uppercase");
    assert.ok(html.includes("<span>FA</span>") || html.includes("<span>F</span>"), "Should render authoritative initials monogram");
    assert.ok(html.includes("Deloitte India"), "Should render Deloitte India work experience");
    assert.ok(html.includes("Financial Analyst Trainee"), "Should render role");
    assert.ok(html.includes("Bachelor of Commerce"), "Should render Fardeen's degree");

    // Must NOT contain Rohan Iyer's photo, passport, or internship
    assert.ok(!html.includes("/sample-avatar.png"), "Must NOT render Rohan's avatar image for Fardeen");
    assert.ok(!html.includes("ROHAN IYER"), "Must NOT render Rohan's name");
    assert.ok(!html.includes("rohan.iyer.test@example.com"), "Must NOT render Rohan's email");
    assert.ok(!html.includes("TechSolutions Global"), "Must NOT render TechSolutions Global");
  });

  it("CV thumbnail renders the candidate photo only when one is supplied", () => {
    const rohanSnapshot = getSampleRohanIyerSnapshot();
    const rohanDoc = hydrateDocumentFromSnapshot("CV", rohanSnapshot, "sample-rohan-iyer");

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(DocumentThumbnailPreview, {
        docType: rohanDoc.docType,
        studentName: rohanDoc.studentName,
        targetUniversity: rohanDoc.targetUniversity,
        targetCourse: rohanDoc.targetCourse,
        targetCountry: rohanDoc.targetCountry,
        sections: rohanDoc.sections,
        isTemplateCard: false,
        photoUrl: "/sample-avatar.png",
      })
    );

    assert.ok(html.includes("ROHAN IYER"), "Should render Rohan's name");
    assert.ok(html.includes("/sample-avatar.png"), "Should render avatar photo for Rohan");
  });

  it("LocalStorage persistence key is exported and configured for operator session recovery", () => {
    assert.ok(RECENT_DOCS_STORAGE_KEY, "RECENT_DOCS_STORAGE_KEY should be exported");
    assert.equal(typeof RECENT_DOCS_STORAGE_KEY, "string");
    assert.ok(RECENT_DOCS_STORAGE_KEY.includes("antigravity_recent_documents"));
  });

  it("Rohan Iyer CV hydrates IELTS Test Report Form data and TRF number", () => {
    const rohanSnapshot = getSampleRohanIyerSnapshot();
    const rohanDoc = hydrateDocumentFromSnapshot("CV", rohanSnapshot, "sample-rohan-iyer");

    const certSection = rohanDoc.sections.find((s) => s.heading === "ENGLISH LANGUAGE CERTIFICATE");
    assert.ok(certSection, "Must include ENGLISH LANGUAGE CERTIFICATE section");
    assert.ok(certSection.content.includes("SAMPLE-TRF-0001"), "Must contain TRF Number SAMPLE-TRF-0001");
    assert.ok(certSection.content.includes("Listening - 9.0"), "Must contain Listening - 9.0");
    assert.ok(certSection.content.includes("Reading - 7.5"), "Must contain Reading - 7.5");
    assert.ok(certSection.content.includes("Writing - 6.5"), "Must contain Writing - 6.5");
    assert.ok(certSection.content.includes("Speaking - 7.0"), "Must contain Speaking - 7.0");
    assert.ok(certSection.content.includes("Overall Band Score - 7.5"), "Must contain Overall Band Score - 7.5");
    assert.ok(certSection.content.includes("23/08/2026") || certSection.content.includes("2026-08-23"), "Must contain Issue Date");
  });

  it("CEFR language skills levels accurately map from IELTS subscores (9.0 -> C2, 6.5 -> B2)", () => {
    const rohanSnapshot = getSampleRohanIyerSnapshot();
    const rohanDoc = hydrateDocumentFromSnapshot("CV", rohanSnapshot, "sample-rohan-iyer");

    const langSection = rohanDoc.sections.find((s) => s.heading === "LANGUAGE SKILLS");
    assert.ok(langSection, "Must include LANGUAGE SKILLS section");
    // Listening 9.0 -> C2
    assert.ok(langSection.content.includes("Listening C2"), "Listening 9.0 must map to CEFR C2");
    // Reading 7.5 -> C1
    assert.ok(langSection.content.includes("Reading C1"), "Reading 7.5 must map to CEFR C1");
    // Writing 6.5 -> B2
    assert.ok(langSection.content.includes("Writing B2"), "Writing 6.5 must map to CEFR B2");
    // Speaking 7.0 -> C1 (Interaction C1, Production B2)
    assert.ok(langSection.content.includes("Spoken Production B2"), "Speaking 7.0 must map to Spoken Production B2");
    assert.ok(langSection.content.includes("Spoken Interaction C1"), "Speaking 7.0 must map to Spoken Interaction C1");
  });
});
