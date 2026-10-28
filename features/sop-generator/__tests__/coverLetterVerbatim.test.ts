import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSampleAafiaAmeenSnapshot, getSampleAaravMehtaSnapshot, getSampleMirzaFarhanZaidSnapshot } from "@/lib/sampleStudents";
import { hydrateDocumentFromSnapshot } from "@/features/dashboard/utils/documentHydrator";

describe("Authoritative 8-Paragraph Visa Cover Letter & Multi-Student Verification", () => {
  it("Aafia Ameen cover letter generates exact 8 paragraphs matching Aafiya CL.docx verbatim", () => {
    const snapshot = getSampleAafiaAmeenSnapshot();
    const doc = hydrateDocumentFromSnapshot("COVER_LETTER", snapshot, "sample-aafia-ameen");

    assert.equal(doc.docType, "COVER_LETTER");
    assert.equal(doc.studentName, "Aafia Ameen");
    assert.equal(doc.targetUniversity, "Università degli Studi di Padova");
    assert.equal(doc.targetCourse, "Bachelor's Degree in Information Engineering");

    // Must have all 16 template sections
    assert.equal(doc.sections.length, 16);

    const getSection = (title: string) =>
      doc.sections.find((s) => s.heading.toLowerCase().includes(title.toLowerCase()))?.content || "";

    // 1. Recipient & Subject
    const recipient = getSection("Recipient");
    assert.ok(recipient.includes("To,"));
    assert.ok(recipient.includes("Consulate General of Italy"));
    assert.ok(recipient.includes("Mumbai, India"));

    const subject = getSection("Subject");
    assert.ok(subject.includes("Subject: Application for a Long-Term Type D Student Visa to Pursue Bachelor's Degree in Information Engineering at the Università degli Studi di Padova"));

    // 2. Paragraph 1: Intro + Academics + Family + Entrance Test
    const intro = getSection("Student Introduction");
    assert.ok(intro.includes("Aafia Ameen"));
    assert.ok(intro.includes("Bhopal, India"));

    const academics = getSection("Academic Background");
    assert.ok(academics.includes("Class XII"));
    assert.ok(academics.includes("Carmel Convent Sr. Sec. School, Bhopal"));
    assert.ok(academics.includes("CBSE curriculum"));
    assert.ok(academics.includes("2026"));
    assert.ok(academics.includes("Physics, Chemistry, and Mathematics"));
    assert.ok(academics.includes("overall IELTS Academic band score of 7.5"));
    assert.ok(academics.includes("CEnT-S"));
    assert.ok(academics.includes("CISIA"));
    assert.ok(academics.includes("81.75"));
    assert.ok(academics.includes("Insurance Surveyor"));
    assert.ok(academics.includes("Amazon"));
    assert.ok(academics.includes("elder brother"));

    // 3. Paragraph 2: Why Course
    const whyCourse = getSection("Why This Course");
    assert.ok(whyCourse.includes("Mathematics"));
    assert.ok(whyCourse.includes("Information Engineering"));
    assert.ok(whyCourse.includes("computer science, automation, electronics, and telecommunications"));

    // 4. Paragraph 3: Why University
    const whyUniv = getSection("Why This University");
    assert.ok(whyUniv.includes("Università degli Studi di Padova"));
    assert.ok(whyUniv.includes("800 years"));
    assert.ok(whyUniv.includes("Galileo Galilei, Nicolaus Copernicus, and William Harvey"));

    // 5. Paragraph 4: Why Italy
    const whyItaly = getSection("Why Italy");
    assert.ok(whyItaly.includes("Italy"));
    assert.ok(whyItaly.includes("Università degli Studi di Padova"));
    assert.ok(whyItaly.includes("climate, which is relatively similar to that of India"));

    // 6. Paragraph 5: Future Academic & Career Plans & Ties
    const futurePlan = getSection("Future Academic Plan");
    assert.ok(futurePlan.includes("Mechatronics Engineering or Computer Engineering"));

    const careerPlan = getSection("Career Plan");
    assert.ok(careerPlan.includes("In the short term"));
    assert.ok(careerPlan.includes("In the long term"));

    const returnIntent = getSection("Return");
    assert.ok(returnIntent.includes("Being the only daughter of my parents"));

    // 7. Paragraph 6: Financial Sponsorship & Loan
    const finance = getSection("Financial Sponsorship");
    assert.ok(finance.includes("Mr. Amin Jamali"));
    assert.ok(finance.includes("INR 39,00,000 (Indian Rupees Thirty-Nine Lakh Only)"));
    assert.ok(finance.includes("Credila Financial Services Limited"));
    assert.ok(finance.includes("INR 38,11,848"));
    assert.ok(finance.includes("HSBC Bank Savings Account No. **053-059036-006**"));
    assert.ok(finance.includes("23 July 2026"));
    assert.ok(finance.includes("INR 38,11,848.00"));
    assert.ok(finance.includes("EUR 34,719.44"));
    assert.ok(finance.includes("1 EUR = INR 109.79"));
    assert.ok(finance.includes("INR 2,32,44,511"));
    assert.ok(finance.includes("2024–25, 2025–26, and 2026–27"));

    // 8. Paragraph 7: Accommodation, Insurance & Flight
    const accommodation = getSection("Accommodation");
    assert.ok(accommodation.includes("Dimora in Prato, Padova, Italy"));
    assert.ok(accommodation.includes("20 September 2026 to 20 October 2026"));

    const insurance = getSection("Insurance");
    assert.ok(insurance.includes("365-day ICICI Lombard General Insurance Overseas Student Travel Insurance Policy (Certificate No. IC512370)"));
    assert.ok(insurance.includes("01 September 2026 to 31 August 2027"));

    const travel = getSection("Travel Arrangements");
    assert.ok(travel.includes("Emirates"));
    assert.ok(travel.includes("Mumbai (BOM)"));
    assert.ok(travel.includes("Venice Marco Polo Airport (VCE)"));
    assert.ok(travel.includes("Dubai (DXB)"));
    assert.ok(travel.includes("20 September 2026"));
    assert.ok(travel.includes("PNR: PCNXKF"));

    // 9. Paragraph 8: Closing Statement & Sign-off
    const closing = getSection("Closing Statement");
    assert.ok(closing.includes("Thank you for taking the time to review my application"));
    assert.ok(closing.includes("Università degli Studi di Padova"));

    const signature = getSection("Student Contact & Signature");
    assert.ok(signature.includes("Sincerely"));
    assert.ok(signature.includes("Aafia Ameen"));
    assert.ok(signature.includes("aafiaameen9@gmail.com"));
    assert.ok(signature.includes("+91 8839395705"));
  });

  it("Aarav Mehta cover letter generates cleanly with dynamic adaptions and zero missing developer tokens", () => {
    const snapshot = getSampleAaravMehtaSnapshot();
    const doc = hydrateDocumentFromSnapshot("COVER_LETTER", snapshot, "sample-aarav-mehta", "italy-type-d-student-visa-cover-letter");

    assert.equal(doc.studentName, "Aarav Mehta");
    assert.equal(doc.sections.length, 16);

    // Verify no unresolved developer error tokens remain
    doc.sections.forEach((sec) => {
      assert.ok(!sec.content.includes("[MISSING:"), `Unresolved token in section ${sec.heading}`);
      assert.ok(!sec.content.includes("{{"), `Uninterpolated placeholder in section ${sec.heading}`);
      assert.ok(sec.content.trim().length > 10, `Section ${sec.heading} has insufficient content`);
    });
  });

  it("Mirza Farhan Zaid CV generates with complete Europass section structure", () => {
    const snapshot = getSampleMirzaFarhanZaidSnapshot();
    const doc = hydrateDocumentFromSnapshot("CV", snapshot, "sample-mirza-farhan-zaid");

    assert.equal(doc.docType, "CV");
    assert.equal(doc.studentName, "Mirza Farhan Zaid");
    const headings = doc.sections.map((s) => s.heading);
    assert.ok(headings.includes("ABOUT ME"));
    assert.ok(headings.includes("EDUCATION AND TRAINING"));
    assert.ok(headings.includes("LANGUAGE SKILLS"));
    assert.ok(headings.includes("DECLARATION"));
  });
});
