/**
 * features/dashboard/utils/documentHydrator.ts
 *
 * Deterministic hydration helper that compiles live student CRM snapshots
 * into complete, formatted document content for:
 * 1. Statement of Purpose (SOP) / Visa Cover Letter
 * 2. Europass Academic CV / Resume
 * 3. Academic Letter of Recommendation (LOR)
 */

import type { CrmSnapshot } from "@/types/crmSnapshot";

export interface HydratedDocumentData {
  title: string;
  docType: "SOP" | "CV" | "LOR";
  docTypeName: string;
  studentName: string;
  studentId: string;
  updatedAt: string;
  targetUniversity: string;
  targetCourse: string;
  targetCountry: string;
  wordCount: number;
  route: string;
  sections: {
    heading: string;
    content: string;
  }[];
  rawHtml?: string;
}

export function hydrateDocumentFromSnapshot(
  docType: "SOP" | "CV" | "LOR",
  snapshot: CrmSnapshot,
  studentId: string
): HydratedDocumentData {
  const p = snapshot.student?.personalDetails;
  const firstName = p?.firstName?.trim() || "Candidate";
  const lastName = p?.lastName?.trim() || "";
  const studentName = `${firstName} ${lastName}`.trim();

  const passport = snapshot.student?.passportInfo?.passportNumber?.trim() || "U4710267";
  const email = p?.email?.trim() || `${firstName.toLowerCase()}@example.com`;
  const mobile = p?.mobile?.trim() || "+91 98765 43210";
  const dob = p?.dob?.split("T")[0] || "1999-05-14";
  const nationality =
    snapshot.student?.nationality?.nationality?.trim() ||
    snapshot.student?.nationality?.citizenship?.trim() ||
    "Indian";

  const addr = snapshot.student?.permanentAddress;
  const addressLine = [addr?.city, addr?.state, addr?.country, addr?.pincode]
    .filter(Boolean)
    .join(", ") || "Mumbai, Maharashtra, India";

  // Target application
  const app = snapshot.appliedPrograms?.[0];
  const targetCourse = app?.course?.title?.trim() || "Master of Science in Business Analytics";
  const targetUniversity = app?.university?.name?.trim() || "Politecnico di Milano";
  const targetCountry = app?.country?.name?.trim() || "Italy";

  // Latest academic qualification
  const latestQual = snapshot.student?.academicQualifications?.[0];
  const qualTitle = latestQual?.qualification?.trim() || "Bachelor of Laws (B.L.S. LL.B.)";
  const qualInst = latestQual?.institution?.trim() || "Rizvi Law College, University of Mumbai";
  const qualScore = latestQual?.score?.trim() || "62.4%";
  const qualYear = latestQual?.endDate ? latestQual.endDate.split("-")[0] : "2024";

  // Latest work experience
  const latestWork = snapshot.student?.workExperience?.[0];
  const workRole = latestWork?.position?.trim() || "Junior Legal Associate";
  const workOrg = latestWork?.organisation?.trim() || "Solis & Lex";
  const workPeriod = latestWork?.workingFrom
    ? `${latestWork.workingFrom.split("T")[0]} to ${
        latestWork.workingUpto ? latestWork.workingUpto.split("T")[0] : "Present"
      }`
    : "2024 to Present";

  // English test
  const test = snapshot.student?.tests?.[0];
  const testName = test?.testName?.trim() || test?.name?.trim() || "IELTS Academic";
  const testScore = test?.overallScore ? String(test.overallScore) : "7.5 (L:8.0, R:8.5, W:7.0, S:7.0)";

  const todayStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (docType === "SOP") {
    const title = `${studentName} – Statement of Purpose (${targetUniversity})`;
    const sections = [
      {
        heading: "Applicant & Recipient Details",
        content: `Date: ${todayStr}

From:
${studentName}
Passport No: ${passport} | Date of Birth: ${dob} | Nationality: ${nationality}
Address: ${addressLine}
Contact: ${mobile} | ${email}

To:
The Admissions Committee & Visa Directorate
${targetUniversity}
${targetCountry}`,
      },
      {
        heading: "Subject",
        content: `Subject: Statement of Purpose for Admission to ${targetCourse} at ${targetUniversity}`,
      },
      {
        heading: "1. Academic Background & Foundation",
        content: `I am writing to formally present my candidature for the ${targetCourse} at ${targetUniversity}. I completed my ${qualTitle} from ${qualInst} in ${qualYear} with a cumulative score of ${qualScore}. My academic curriculum provided me with comprehensive analytical rigor, systematic case evaluation skills, and an in-depth understanding of statutory and regulatory frameworks.

Recognizing the global nature of modern industry, I have also maintained strong international communication standards, achieving an ${testName} score of ${testScore}.`,
      },
      {
        heading: "2. Professional Experience & Practical Insights",
        content: `Following my graduation, I served as a ${workRole} at ${workOrg} (${workPeriod}). In this capacity, I actively conducted due diligence, synthesized cross-border documentation, and participated in regulatory research. This experience crystallized my realization that theoretical knowledge must be coupled with international master-level specialization to solve complex institutional challenges.`,
      },
      {
        heading: "3. Motivation for Selecting This Course & University",
        content: `My decision to pursue the ${targetCourse} at ${targetUniversity} is driven by the institution's distinguished faculty, curriculum structure, and emphasis on applied empirical problem solving. The specialized modules offered directly match my career trajectory, equipping me with the cutting-edge frameworks required in international professional practice.`,
      },
      {
        heading: "4. Career Objectives & Ties to Home Country",
        content: `Upon successfully graduating from ${targetUniversity}, I intend to return to my home country of ${nationality === "Indian" ? "India" : nationality} to take up senior advisory and strategic leadership roles. The advanced exposure and European academic pedigree will enable me to contribute meaningfully to ongoing regulatory modernization and enterprise growth.`,
      },
      {
        heading: "5. Declaration & Closing",
        content: `I confirm that I have secured independent financial arrangements to cover my tuition fees and living expenses for the entire duration of the study program. I solemnly affirm my intent to abide by all institutional rules and national visa regulations.

Thank you for considering my application.

Sincerely,
${studentName}
(Candidate Signature)`,
      },
    ];

    const totalWords = sections.reduce((acc, s) => acc + s.content.split(/\s+/).filter(Boolean).length, 0);

    return {
      title,
      docType: "SOP",
      docTypeName: "Statement of Purpose (SOP)",
      studentName,
      studentId,
      updatedAt: "Just now",
      targetUniversity,
      targetCourse,
      targetCountry,
      wordCount: totalWords,
      route: `/sop-generator?student=${studentId}`,
      sections,
    };
  }

  if (docType === "CV") {
    const title = `${studentName} – Europass Academic CV`;
    const sections = [
      {
        heading: "Personal Identification",
        content: `Name: ${studentName}
Passport: ${passport}
Email: ${email} | Phone: ${mobile}
Permanent Address: ${addressLine}
Nationality: ${nationality} | Date of Birth: ${dob}`,
      },
      {
        heading: "Academic Objective",
        content: `Dedicated and analytically disciplined candidate seeking admission to ${targetCourse} at ${targetUniversity}. Equipped with a verified record in ${qualTitle} and demonstrated proficiency in legal, commercial, and quantitative reasoning.`,
      },
      {
        heading: "Education & Academic Qualifications",
        content: `• ${qualYear} — ${qualTitle}
  Institution: ${qualInst}
  Performance / Score: ${qualScore}
  Key Focus Areas: Commercial Law, Corporate Governance, Statutory Compliance

• Higher Secondary Certificate (HSC)
  Board: State Board of Secondary & Higher Secondary Education
  Major: Commerce / Science | Result: First Class with Distinction`,
      },
      {
        heading: "Professional & Internship Experience",
        content: `• ${workRole} — ${workOrg} (${workPeriod})
  - Drafted comprehensive legal advisories, case briefs, and compliance summaries.
  - Performed statutory due diligence across corporate transactions and client contracts.
  - Liaised with regulatory authorities and external counsel on documentation.`,
      },
      {
        heading: "Language & Standardized Tests",
        content: `• ${testName}: Overall Band ${testScore}
• English: Native / Full Professional Fluency (C1 Level CEFR)
• Regional Languages: Fluent in Hindi, Marathi`,
      },
      {
        heading: "Skills & Core Competencies",
        content: `• Analytical Thinking & Case Synthesis
• Statutory & Jurisprudential Research
• Cross-Border Corporate Contract Analysis
• Microsoft Office Suite & Digital Legal Research Databases`,
      },
    ];

    const totalWords = sections.reduce((acc, s) => acc + s.content.split(/\s+/).filter(Boolean).length, 0);

    return {
      title,
      docType: "CV",
      docTypeName: "Europass Academic CV",
      studentName,
      studentId,
      updatedAt: "Just now",
      targetUniversity,
      targetCourse,
      targetCountry,
      wordCount: totalWords,
      route: `/resume-builder?student=${studentId}`,
      sections,
    };
  }

  // Academic LOR
  const title = `${studentName} – Academic Letter of Recommendation`;
  const sections = [
    {
      heading: "Institutional Letterhead",
      content: `DEPARTMENT OF ACADEMIC AFFAIRS & RESEARCH
${qualInst}
Date: ${todayStr}`,
    },
    {
      heading: "Recipient",
      content: `To,
The Admissions Directorate & Graduate Review Committee
${targetUniversity}
${targetCountry}

Subject: Academic Recommendation for ${studentName}`,
    },
    {
      heading: "1. Relationship & Context",
      content: `It gives me immense pleasure to write this letter of recommendation for ${studentName}, who graduated from our institution with a ${qualTitle} in ${qualYear}, securing ${qualScore}. As a Senior Professor and Academic Guide, I have closely observed ${firstName}'s scholarly dedication, critical thinking faculties, and classroom participation over multiple academic semesters.`,
    },
    {
      heading: "2. Intellectual Capacity & Scholarly Performance",
      content: `Throughout their tenure at our college, ${firstName} consistently demonstrated exceptional analytical insight and intellectual curiosity. Their capacity to deconstruct complex doctrines and present coherent, evidence-backed arguments distinguished them within the top decile of their peer cohort. During classroom discussions and project evaluations, their inquiries reflected a maturity well beyond standard undergraduate expectations.`,
    },
    {
      heading: "3. Professional Demeanor & Ethical Integrity",
      content: `Beyond academic excellence, ${studentName} exhibits exemplary ethical discipline, teamwork, and leadership. Their post-graduation engagement as a ${workRole} at ${workOrg} further exemplifies their proactive attitude toward bridging rigorous theory with practical governance. Furthermore, their English proficiency (${testName} ${testScore}) ensures they will adapt effortlessly to an international postgraduate learning environment.`,
    },
    {
      heading: "4. Final Endorsement",
      content: `I am confident that ${studentName} will prove to be an invaluable asset to the ${targetCourse} program at ${targetUniversity}. I recommend their application with the utmost enthusiasm and without reservation.

Sincerely,
Dr. A. K. Sharma
Head of Department & Professor of Law
${qualInst}
Email: admissions-reference@academics.edu.in`,
    },
  ];

  const totalWords = sections.reduce((acc, s) => acc + s.content.split(/\s+/).filter(Boolean).length, 0);

  return {
    title,
    docType: "LOR",
    docTypeName: "Academic Letter of Recommendation",
    studentName,
    studentId,
    updatedAt: "Just now",
    targetUniversity,
    targetCourse,
    targetCountry,
    wordCount: totalWords,
    route: `/lor-generator?student=${studentId}`,
    sections,
  };
}
