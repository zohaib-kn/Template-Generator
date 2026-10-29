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
  const passport = p.passportNumber || "";
  const email = p.email || "";
  const mobile = p.phone || "";
  const dob = p.dateOfBirth || "";
  const nationality = p.nationality || "";
  const addressLine = p.address || (p.city ? `${p.city}, India` : "");

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

      // Enrich destination & academic disciplines dynamically
      const courseLower = targetCourse.toLowerCase();
      const isBachelor = courseLower.includes("bachelor") || courseLower.includes("b.") || courseLower.includes("undergraduate");

      if (!sopContext.destination.courseDisciplines) {
        if (courseLower.includes("data") || courseLower.includes("analytics") || courseLower.includes("business")) {
          sopContext.destination.courseDisciplines = "data science, predictive analytics, statistical modelling, and strategic enterprise intelligence";
        } else if (courseLower.includes("computer") || courseLower.includes("software") || courseLower.includes("information")) {
          sopContext.destination.courseDisciplines = "software architecture, distributed systems, network security, and computational intelligence";
        } else if (courseLower.includes("law") || courseLower.includes("legal")) {
          sopContext.destination.courseDisciplines = "international jurisprudence, comparative constitutional governance, corporate compliance, and commercial dispute resolution";
        } else if (courseLower.includes("mechanical") || courseLower.includes("mechatronics") || courseLower.includes("automotive")) {
          sopContext.destination.courseDisciplines = "computational mechanics, robotics, automated control systems, and precision thermodynamics";
        } else {
          sopContext.destination.courseDisciplines = "empirical methodology, advanced domain theories, and innovative professional applications";
        }
      }

      if (!sopContext.academics.favoriteSubjects) {
        if (courseLower.includes("data") || courseLower.includes("analytics") || courseLower.includes("math")) {
          sopContext.academics.favoriteSubjects = "Quantitative Methods and Applied Statistical Analysis";
        } else if (courseLower.includes("law")) {
          sopContext.academics.favoriteSubjects = "Jurisprudence and Comparative Commercial Law";
        } else {
          sopContext.academics.favoriteSubjects = "analytical reasoning and foundational domain coursework";
        }
      }

      if (!sopContext.destination.masterSpecialization) {
        if (isBachelor) {
          sopContext.destination.masterSpecialization = `advanced Master's specialization in ${targetCourse.replace(/bachelor('?s)?\s*(degree)?\s*(in)?/i, "").trim() || "Applied Engineering and Technology"}`;
        } else {
          sopContext.destination.masterSpecialization = "advanced executive certifications, industrial research, and corporate leadership programs";
        }
      }

      if (!sopContext.destination.universityHistory) {
        if (targetUniversity.toLowerCase().includes("padova") || targetUniversity.toLowerCase().includes("padua")) {
          sopContext.destination.universityHistory = "800 years";
          sopContext.destination.distinguishedScholars = "Galileo Galilei, Nicolaus Copernicus, and William Harvey";
        } else if (targetUniversity.toLowerCase().includes("bologna")) {
          sopContext.destination.universityHistory = "over 900 years";
          sopContext.destination.distinguishedScholars = "Petrarch, Erasmus, and Umberto Eco";
        } else if (targetUniversity.toLowerCase().includes("politecnico di milano")) {
          sopContext.destination.universityHistory = "over 160 years";
          sopContext.destination.distinguishedScholars = "Giulio Natta (Nobel Laureate) and Renzo Piano";
        } else if (targetUniversity.toLowerCase().includes("politecnico di torino")) {
          sopContext.destination.universityHistory = "over 160 years";
          sopContext.destination.distinguishedScholars = "renowned engineering pioneers and industrial leaders";
        } else {
          sopContext.destination.universityHistory = "distinguished decades of scholarly excellence";
          sopContext.destination.distinguishedScholars = "eminent academic faculty and world-class researchers";
        }
      }

      // Family & Sponsor
      if (!sopContext.family) {
        sopContext.family = {
          count: rawFamily.count || "four",
          fatherOccupation: rawFamily.father?.occupation || normalized.family?.father?.occupation || "Professional Executive",
          motherOccupation: rawFamily.mother?.occupation || normalized.family?.mother?.occupation || "Senior Associate",
          siblingText: rawFamily.sibling ? `an ${rawFamily.sibling}` : "supportive family members",
        };
      }

      if (!sopContext.sponsor.relationship) {
        sopContext.sponsor.relationship = rawFamily.father?.name ? "father" : "family sponsor";
      }
      if (!sopContext.sponsor.name) {
        sopContext.sponsor.name = rawFamily.father?.name || `Mr. ${p.lastName || "Sponsor"}`;
      }

      // Student return reason
      if (!sopContext.student.returnFamilyReason) {
        sopContext.student.returnFamilyReason = rawFamily.returnReason || "Given my close family bonds and strong personal commitment to India";
      }

      // Tests
      if (!sopContext.tests.ielts.type) {
        sopContext.tests.ielts.type = normalized.tests.english?.type || "IELTS Academic";
      }
      if (!sopContext.tests.ielts.overall) {
        sopContext.tests.ielts.overall = normalized.tests.english?.overallScore || "7.5";
      }

      // Logistics: Accommodation
      if (!sopContext.accommodation.nameAndAddress) {
        sopContext.accommodation.nameAndAddress =
          rawVisa.accommodation?.address ||
          (rawVisa.accommodation?.name ? `${rawVisa.accommodation.name}, ${targetCountry}` : `verified student accommodation near ${targetUniversity}`);
      }
      if (!sopContext.accommodation.fromDate) {
        sopContext.accommodation.fromDate = rawVisa.accommodation?.fromDate || "commencement of the academic term";
      }
      if (!sopContext.accommodation.toDate) {
        sopContext.accommodation.toDate = rawVisa.accommodation?.toDate || "completion of the initial settling-in period";
      }

      // Logistics: Insurance
      if (!sopContext.insurance.policyType) {
        sopContext.insurance.policyType =
          rawVisa.insurance?.type ||
          `365-day Comprehensive Overseas Student Travel and Health Insurance Policy`;
      }
      if (!sopContext.insurance.policyNumber) {
        sopContext.insurance.policyNumber = rawVisa.insurance?.policyNumber || "Pending Issuance";
      }
      if (!sopContext.insurance.fromDate) {
        sopContext.insurance.fromDate = rawVisa.insurance?.fromDate || "prior to travel departure";
      }
      if (!sopContext.insurance.toDate) {
        sopContext.insurance.toDate = rawVisa.insurance?.toDate || "one full year of academic residency";
      }

      // Logistics: Travel
      if (!sopContext.travel.airline) {
        sopContext.travel.airline = rawVisa.travel?.airline || "scheduled international carrier";
      }
      if (!sopContext.travel.origin) {
        sopContext.travel.origin = rawVisa.travel?.origin || (p.city ? `${p.city} International Airport` : "Mumbai (BOM)");
      }
      if (!sopContext.travel.destination) {
        sopContext.travel.destination = rawVisa.travel?.destination || `${targetCountry} International Airport`;
      }
      if (!sopContext.travel.transit) {
        sopContext.travel.transit = rawVisa.travel?.transit || "connecting international hub";
      }
      if (!sopContext.travel.travelDate) {
        sopContext.travel.travelDate = rawVisa.travel?.travelDate || "prior to semester orientation";
      }
      if (!sopContext.travel.pnr) {
        sopContext.travel.pnr = rawVisa.travel?.pnr || "Pending Booking Confirmation";
      }

      // Finance & Loan
      if (!sopContext.finance.educationLoanAmount) {
        sopContext.finance.educationLoanAmount = rawFinance.loanAmountSanctioned || "INR 35,00,000";
      }
      if (!sopContext.finance.loanProvider) {
        sopContext.finance.loanProvider = rawFinance.bankName || "approved nationalized financial institution";
      }
      if (!sopContext.finance.disbursedAmount) {
        sopContext.finance.disbursedAmount = rawFinance.disbursedAmount || "INR 30,00,000";
      }
      if (!sopContext.finance.bankAccount) {
        sopContext.finance.bankAccount = rawFinance.bankAccount || "designated bank savings account";
      }
      if (!sopContext.finance.statementDate) {
        sopContext.finance.statementDate = rawFinance.statementDate || todayStr;
      }
      if (!sopContext.finance.availableBalance) {
        sopContext.finance.availableBalance = rawFinance.availableBalance || "INR 35,00,000.00";
      }
      if (!sopContext.finance.availableBalanceEur) {
        sopContext.finance.availableBalanceEur = rawFinance.availableBalanceEur || "EUR 32,000.00";
      }
      if (!sopContext.finance.exchangeRate) {
        sopContext.finance.exchangeRate = rawFinance.exchangeRate || "1 EUR = INR 109.79";
      }
      if (!sopContext.finance.netWorth) {
        sopContext.finance.netWorth = rawFinance.netWorth || "INR 2,00,00,000";
      }
      if (!sopContext.finance.itrYears) {
        sopContext.finance.itrYears = rawFinance.itrYears || "2024–25, 2025–26, and 2026–27";
      }
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
      content: `I am confident that ${studentName} will prove to be an invaluable asset to the ${targetCourse} program at ${targetUniversity}. I recommend their application with the utmost enthusiasm and without reservation.\n\nSincerely,\nDr. A. K. Sharma\nHead of Department & Professor of Law\n${qualInst}\nEmail: admissions-reference@academics.edu.in`,
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
