/**
 * features/dashboard/utils/documentHydrator.ts
 *
 * Deterministic hydration helper that compiles live student CRM snapshots
 * into complete, formatted document content using authoritative branch templates:
 * 1. Statement of Purpose (SOP) via universitySopTemplate (9 academic admissions sections)
 *    or Italy Type D Student Visa Cover Letter (16 embassy sections)
 * 2. Europass Academic CV via mapNormalizedToResume + dynamic synthesizeEuropassAboutMe
 * 3. Academic Letter of Recommendation (LOR)
 */

import type { CrmSnapshot } from "@/types/crmSnapshot";
import { universitySopTemplate } from "@/features/sop-generator/templates/university-sop";
import { italyTypeDCoverLetter } from "@/features/sop-generator/templates/italy-type-d-cover-letter";
import { interpolate } from "@/features/sop-generator/lib/interpolateTemplate";
import {
  mapCrmToNormalizedStudent,
  mapNormalizedToSop,
  mapNormalizedToResume,
} from "@/services/normalization";

export const RECENT_DOCS_STORAGE_KEY = "antigravity_recent_documents_v3";

export interface HydratedDocumentData {
  title: string;
  docType: "SOP" | "CV" | "LOR" | "COVER_LETTER" | "BLANK";
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
  docType: "SOP" | "CV" | "LOR" | "COVER_LETTER",
  snapshot: CrmSnapshot,
  studentId: string,
  templateId?: string
): HydratedDocumentData {
  // Normalize CRM snapshot using central normalization engine
  const normalized = mapCrmToNormalizedStudent(snapshot);
  const p = normalized.personal;
  const a = normalized.academics;
  const prog = normalized.applications.activeProgram;

  const studentName = p.fullName || "Candidate";
  const firstName = studentName.split(" ")[0] || "Candidate";

  const targetCourse = prog?.course || "";
  const targetUniversity = prog?.university || "";
  const targetCountry = prog?.country || "Global";

  const latestQual = a.latest;
  const qualTitle = latestQual?.qualification || "";
  const qualInst = latestQual?.institution || "";
  const qualScore = latestQual?.score || "";
  const qualYear = latestQual?.completionYear || "";

  const testName = normalized.tests.english?.type || "";
  const testScore = normalized.tests.english?.overallScore
    ? `Band ${normalized.tests.english.overallScore}`
    : "";

  const latestWork = normalized.workExperience?.[0];
  const workRole = latestWork?.position || "";
  const workOrg = latestWork?.organisation || "";

  const todayStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── 1. Visa Cover Letter & Statement of Purpose (SOP) ─────────────────────────
  if (docType === "COVER_LETTER" || docType === "SOP") {
    const sopContext = mapNormalizedToSop(normalized);

    const isExplicitCoverLetter = docType === "COVER_LETTER";

    const isVisaLetter =
      isExplicitCoverLetter ||
      templateId === italyTypeDCoverLetter.id ||
      templateId === "VISA_COVER_LETTER" ||
      (templateId && templateId.toLowerCase().includes("visa"));

    const isItalyVisa =
      !templateId &&
      !isExplicitCoverLetter &&
      targetCountry.toLowerCase() === "italy" &&
      Boolean(
        normalized.visaLogistics?.consulate?.name ||
        normalized.visaLogistics?.accommodation?.name ||
        normalized.visaLogistics?.insurance?.provider ||
        normalized.visaLogistics?.travel?.flightNumber
      );

    const template = (isVisaLetter || isItalyVisa) ? italyTypeDCoverLetter : universitySopTemplate;
    const isVisa = template.id === italyTypeDCoverLetter.id;

    if (isVisa) {
      // Profile enrichment from the student's own CRM snapshot only
      const rawStudent = (snapshot.student as any) || {};
      const rawFamily = rawStudent.family || {};
      const rawVisa = (snapshot as any).visaLogistics || rawStudent.visaLogistics || {};
      const rawFinance = (snapshot as any).finance || rawStudent.finance || {};

      // Publicly verifiable facts for well-known institutions only; otherwise left missing
      if (!sopContext.destination.universityHistory) {
        const uni = targetUniversity.toLowerCase();
        if (uni.includes("padova") || uni.includes("padua")) {
          sopContext.destination.universityHistory = "800 years";
          sopContext.destination.distinguishedScholars = "Galileo Galilei, Nicolaus Copernicus, and William Harvey";
        } else if (uni.includes("bologna")) {
          sopContext.destination.universityHistory = "over 900 years";
          sopContext.destination.distinguishedScholars = "Petrarch, Erasmus, and Umberto Eco";
        } else if (uni.includes("politecnico di milano")) {
          sopContext.destination.universityHistory = "over 160 years";
          sopContext.destination.distinguishedScholars = "Giulio Natta (Nobel Laureate) and Renzo Piano";
        }
      }

      // Family & sponsor — only what the student's own CRM record states
      if (!sopContext.family && (rawFamily.count || rawFamily.father || rawFamily.mother || rawFamily.sibling)) {
        sopContext.family = {
          count: rawFamily.count || "",
          fatherOccupation: rawFamily.father?.occupation || normalized.family?.father?.occupation || "",
          motherOccupation: rawFamily.mother?.occupation || normalized.family?.mother?.occupation || "",
          siblingText: rawFamily.sibling ? `an ${rawFamily.sibling}` : "",
        };
      }
      if (!sopContext.sponsor.name && rawFamily.father?.name) {
        sopContext.sponsor.name = rawFamily.father.name;
        sopContext.sponsor.relationship = sopContext.sponsor.relationship || "father";
      }
      if (!sopContext.student.returnFamilyReason && rawFamily.returnReason) {
        sopContext.student.returnFamilyReason = rawFamily.returnReason;
      }

      // Tests
      if (!sopContext.tests.ielts.type && normalized.tests.english?.type) {
        sopContext.tests.ielts.type = normalized.tests.english.type;
      }

      // Logistics — copied from the snapshot when present, never invented
      const fill = (current: string | undefined, value: unknown): string =>
        current || (typeof value === "string" ? value : "");

      sopContext.accommodation.nameAndAddress = fill(
        sopContext.accommodation.nameAndAddress,
        rawVisa.accommodation?.address ||
          (rawVisa.accommodation?.name ? `${rawVisa.accommodation.name}, ${targetCountry}` : "")
      );
      sopContext.accommodation.fromDate = fill(sopContext.accommodation.fromDate, rawVisa.accommodation?.fromDate);
      sopContext.accommodation.toDate = fill(sopContext.accommodation.toDate, rawVisa.accommodation?.toDate);

      sopContext.insurance.policyType = fill(sopContext.insurance.policyType, rawVisa.insurance?.type);
      sopContext.insurance.policyNumber = fill(sopContext.insurance.policyNumber, rawVisa.insurance?.policyNumber);
      sopContext.insurance.fromDate = fill(sopContext.insurance.fromDate, rawVisa.insurance?.fromDate);
      sopContext.insurance.toDate = fill(sopContext.insurance.toDate, rawVisa.insurance?.toDate);

      sopContext.travel.airline = fill(sopContext.travel.airline, rawVisa.travel?.airline);
      sopContext.travel.origin = fill(sopContext.travel.origin, rawVisa.travel?.origin);
      sopContext.travel.destination = fill(sopContext.travel.destination, rawVisa.travel?.destination);
      sopContext.travel.transit = fill(sopContext.travel.transit, rawVisa.travel?.transit);
      sopContext.travel.travelDate = fill(sopContext.travel.travelDate, rawVisa.travel?.travelDate);
      sopContext.travel.pnr = fill(sopContext.travel.pnr, rawVisa.travel?.pnr);

      sopContext.finance.educationLoanAmount = fill(sopContext.finance.educationLoanAmount, rawFinance.loanAmountSanctioned);
      sopContext.finance.loanProvider = fill(sopContext.finance.loanProvider, rawFinance.bankName);
      sopContext.finance.disbursedAmount = fill(sopContext.finance.disbursedAmount, rawFinance.disbursedAmount);
      sopContext.finance.bankAccount = fill(sopContext.finance.bankAccount, rawFinance.bankAccount);
      sopContext.finance.statementDate = fill(sopContext.finance.statementDate, rawFinance.statementDate);
      sopContext.finance.availableBalance = fill(sopContext.finance.availableBalance, rawFinance.availableBalance);
      sopContext.finance.availableBalanceEur = fill(sopContext.finance.availableBalanceEur, rawFinance.availableBalanceEur);
      sopContext.finance.exchangeRate = fill(sopContext.finance.exchangeRate, rawFinance.exchangeRate);
      sopContext.finance.netWorth = fill(sopContext.finance.netWorth, rawFinance.netWorth);
      sopContext.finance.itrYears = fill(sopContext.finance.itrYears, rawFinance.itrYears);
    }

    const title = isVisa
      ? `${studentName} – Italy Visa Cover Letter`
      : `${studentName} – Statement of Purpose (${targetUniversity})`;

    const docTypeName = isVisa ? "Italy Type D Visa Cover Letter" : "Statement of Purpose (SOP)";
    const route = `/sop-generator?student=${studentId}&template=${template.id}`;

    const sections = template.sections.map((sec) => ({
      heading: sec.title,
      content: interpolate(sec.content, sopContext),
    }));

    const totalWords = sections.reduce(
      (acc, s) => acc + s.content.split(/\s+/).filter(Boolean).length,
      0
    );

    return {
      title,
      docType: isVisa ? "COVER_LETTER" : "SOP",
      docTypeName,
      studentName,
      studentId,
      updatedAt: "Just now",
      targetUniversity: isVisa && sopContext.destination.university ? sopContext.destination.university : targetUniversity,
      targetCourse: isVisa && sopContext.destination.course ? sopContext.destination.course : targetCourse,
      targetCountry,
      wordCount: totalWords,
      route,
      sections,
    };
  }

  // ── 2. Europass Academic CV / Resume ───────────────────────────────────────────
  if (docType === "CV") {
    const resumeProj = mapNormalizedToResume(normalized);
    const resumeStudent = resumeProj.student;

    const title = `${studentName} – Europass Academic CV`;
    const educationContent =
      resumeStudent?.education && resumeStudent.education.length > 0
        ? resumeStudent.education
            .map((edu) => {
              const lines = [
                edu.qualification || "Degree",
                `${edu.institution || ""} [ ${edu.startDate || ""} – ${edu.endDate || ""} ]`,
              ];
              const meta = [
                edu.address ? `Location: ${edu.address}` : "",
                edu.website ? `Website: ${edu.website}` : "",
                edu.finalGrade ? `Final grade: ${edu.finalGrade}` : "",
              ]
                .filter(Boolean)
                .join(" | ");
              if (meta) lines.push(meta);
              return lines.join("\n");
            })
            .join("\n\n")
        : qualTitle
        ? `${qualTitle}\n${qualInst} [ ${qualYear} ]${qualScore ? `\nFinal grade: ${qualScore}` : ""}`
        : "";

    const workExperienceContent =
      resumeStudent?.internships && resumeStudent.internships.length > 0
        ? resumeStudent.internships
            .map((exp) => {
              const lines = [
                exp.role || "Role",
                `${exp.company || ""} [ ${exp.startDate || ""} – ${exp.endDate || ""} ]`,
              ];
              if (exp.description) lines.push(exp.description);
              return lines.join("\n");
            })
            .join("\n\n")
        : "";

    const languageSkillsContent = (() => {
      const parts: string[] = [];
      if (resumeStudent?.motherTongue) {
        parts.push(`Mother tongue(s): ${resumeStudent.motherTongue}`);
      }
      if (resumeStudent?.languages && resumeStudent.languages.length > 0) {
        const otherLangs = resumeStudent.languages
          .map((lang) => {
            if (lang.listening && lang.reading && lang.writing) {
              return `${lang.language || "English"} (Listening ${lang.listening}, Reading ${lang.reading}, Writing ${lang.writing}, Spoken Production ${lang.spokenProduction || "B2"}, Spoken Interaction ${lang.spokenInteraction || "B2"})`;
            }
            return `${lang.language || "English"} (${lang.level || "Proficient"})`;
          })
          .join("; ");
        parts.push(`Other language(s): ${otherLangs}`);
      }
      return parts.join("\n");
    })();

    const englishCertContent = (() => {
      const cert = resumeStudent?.englishCertificate;
      if (!cert || (!cert.examName && !cert.score && !cert.listening && !cert.trfNumber)) {
        return "";
      }
      const exam = cert.examName || "IELTS";
      const isIelts = exam.toUpperCase().includes("IELTS");
      const bullets: string[] = [];
      if (cert.listening) bullets.push(`• Listening - ${cert.listening}`);
      if (cert.reading) bullets.push(`• Reading - ${cert.reading}`);
      if (cert.writing) bullets.push(`• Writing - ${cert.writing}`);
      if (cert.speaking) bullets.push(`• Speaking - ${cert.speaking}`);
      if (cert.score) bullets.push(`• Overall Band Score - ${cert.score}`);
      if (cert.dateTaken) {
        const d = cert.dateTaken.includes("-")
          ? cert.dateTaken.split("-").reverse().join("/")
          : cert.dateTaken;
        bullets.push(`• Issue Date - ${d}`);
      }
      if (cert.trfNumber) {
        bullets.push(`• Test Report Form Number - ${cert.trfNumber}`);
      }
      const lines = [
        isIelts ? "International English Language Testing System" : exam,
        ...(isIelts ? ["Test Report Form"] : []),
        ...bullets,
      ];
      return lines.join("\n");
    })();

    const hobbiesContent =
      resumeStudent?.hobbies && resumeStudent.hobbies.length > 0
        ? resumeStudent.hobbies.map((h) => h.name).filter(Boolean).join(" • ")
        : "";

    const certificationsContent =
      resumeStudent?.certifications && resumeStudent.certifications.length > 0
        ? resumeStudent.certifications
            .map((c) => (c.provider ? `${c.name} – ${c.provider}.` : `${c.name}.`))
            .join("\n")
        : "";

    const skillsContent =
      resumeStudent?.skills && resumeStudent.skills.length > 0
        ? resumeStudent.skills.map((s) => s.name).filter(Boolean).join(" / ")
        : "";

    const sections = [
      {
        heading: "ABOUT ME",
        content: resumeStudent?.aboutMe || "",
      },
      {
        heading: "EDUCATION AND TRAINING",
        content: educationContent,
      },
      {
        heading: "WORK EXPERIENCE",
        content: workExperienceContent,
      },
      {
        heading: "LANGUAGE SKILLS",
        content: languageSkillsContent,
      },
      {
        heading: "ENGLISH LANGUAGE CERTIFICATE",
        content: englishCertContent,
      },
      {
        heading: "SKILLS",
        content: skillsContent,
      },
      {
        heading: "CERTIFICATIONS",
        content: certificationsContent,
      },
      {
        heading: "HOBBIES AND INTERESTS",
        content: hobbiesContent,
      },
      {
        heading: "DECLARATION",
        content:
          resumeStudent?.declaration ||
          "I hereby declare that the above furnished details are true to the best of my knowledge and belief.",
      },
    ];

    const totalWords = sections.reduce(
      (acc, s) => acc + s.content.split(/\s+/).filter(Boolean).length,
      0
    );

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

  // ── 3. Academic Letter of Recommendation (LOR) ───────────────────────────────
  const title = `${studentName} – Academic Letter of Recommendation`;
  const sections = [
    {
      heading: "Institutional Letterhead",
      content: `DEPARTMENT OF ACADEMIC AFFAIRS & RESEARCH\n${qualInst}\nDate: ${todayStr}`,
    },
    {
      heading: "Recipient",
      content: `To,\nThe Admissions Directorate & Graduate Review Committee\n${targetUniversity}\n${targetCountry}\n\nSubject: Academic Recommendation for ${studentName}`,
    },
    {
      heading: "1. Relationship & Context",
      content: `It gives me immense pleasure to write this letter of recommendation for ${studentName}, who graduated from our institution with a ${qualTitle} in ${qualYear}, securing ${qualScore}. As [MISSING: recommender.designation], I have closely observed ${firstName}'s scholarly dedication, critical thinking faculties, and classroom participation over multiple academic semesters.`,
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
      content: `I am confident that ${studentName} will prove to be an invaluable asset to the ${targetCourse} program at ${targetUniversity}. I recommend their application with the utmost enthusiasm and without reservation.\n\nSincerely,\n[MISSING: recommender.name]\n[MISSING: recommender.designation]\n${qualInst}\nEmail: [MISSING: recommender.email]`,
    },
  ];

  const totalWords = sections.reduce(
    (acc, s) => acc + s.content.split(/\s+/).filter(Boolean).length,
    0
  );

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
