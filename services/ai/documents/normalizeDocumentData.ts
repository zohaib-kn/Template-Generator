/**
 * services/ai/documents/normalizeDocumentData.ts
 *
 * Normalizes varied input payloads into the canonical CanonicalDocumentData schema.
 * Handles:
 * - NormalizedStudentProfile (from services/normalization)
 * - StudentDocumentContext (from features/sop-generator)
 * - LorDocument (from features/lor-generator)
 * - Raw form / API payloads
 *
 * Rules:
 * 1. Safe parsing — zero crashes on missing fields.
 * 2. Never invent missing fields — unprovided fields remain empty or undefined.
 * 3. Exact preservation of strings, numbers, currencies, and dates.
 */

import { DocumentType, DOCUMENT_TYPES, isValidDocumentType } from "../config/documentTypes";
import {
  CanonicalDocumentData,
  CanonicalApplicant,
  CanonicalEducation,
  CanonicalLanguageTest,
  CanonicalFamily,
  CanonicalUniversity,
  CanonicalCourse,
  CanonicalMotivation,
  CanonicalCareer,
  CanonicalFinancials,
  CanonicalAccommodation,
  CanonicalInsurance,
  CanonicalTravel,
  CanonicalRecommender,
  CanonicalProject,
  CanonicalWorkExperience,
} from "./canonicalDocument";

export interface NormalizationInput {
  documentType?: string;
  studentId?: string;
  applicationId?: string;
  // May receive raw body with nested fields
  [key: string]: unknown;
}

function parseStringList(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof val === "string" && val.trim().length > 0) {
    return val
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function safeString(val: unknown, fallback = ""): string {
  if (val === null || val === undefined) return fallback;
  const s = String(val).trim();
  return s;
}

function asRecord(val: unknown): Record<string, unknown> {
  return val && typeof val === "object" ? (val as Record<string, unknown>) : {};
}

export function normalizeDocumentData(input: NormalizationInput): CanonicalDocumentData {
  const docTypeStr = safeString(input.documentType || input.type || DOCUMENT_TYPES.VISA_COVER_LETTER);
  const documentType: DocumentType = isValidDocumentType(docTypeStr)
    ? docTypeStr
    : DOCUMENT_TYPES.VISA_COVER_LETTER;

  const raw = asRecord(input.data && typeof input.data === "object" ? input.data : input);

  // 1. Applicant Normalization
  const rawStudent = asRecord(raw.applicant || raw.student);
  const rawPersonal = asRecord(rawStudent.personalDetails || rawStudent.personal || raw.personal);
  const rawPassportInfo = asRecord(raw.passportInfo);

  const fullName =
    safeString(rawStudent.fullName) ||
    safeString(rawStudent.name) ||
    [rawPersonal.firstName, rawPersonal.middleName, rawPersonal.lastName].filter(Boolean).join(" ").trim() ||
    "Applicant";

  const applicant: CanonicalApplicant = {
    name: fullName,
    firstName: safeString(rawPersonal.firstName || rawStudent.firstName),
    lastName: safeString(rawPersonal.lastName || rawStudent.lastName),
    nationality: safeString(rawStudent.nationality || rawPersonal.nationality || raw.nationality, "Indian"),
    city: safeString(rawStudent.city || rawPersonal.city || raw.city),
    country: safeString(rawStudent.country || rawPersonal.country || raw.country, "India"),
    passportNumber: safeString(
      rawStudent.passportNumber ||
      rawPersonal.passportNumber ||
      rawPassportInfo.passportNumber ||
      raw.passportNumber
    ),
    dateOfBirth: safeString(rawStudent.dateOfBirth || rawPersonal.dob || rawStudent.dob),
    address: safeString(rawStudent.address || rawPersonal.address || raw.address),
    phone: safeString(rawStudent.phone || rawPersonal.mobile || rawStudent.mobile),
    email: safeString(rawStudent.email || rawPersonal.email || rawStudent.personalEmail),
  };

  // 2. Education Normalization
  const rawAcademics = asRecord(raw.education || raw.academics);
  const latestQual = asRecord(rawAcademics.latest || rawAcademics);

  const education: CanonicalEducation = {
    qualification: safeString(
      latestQual.qualification ||
      latestQual.latestQualification ||
      latestQual.levelOfStudy
    ),
    institution: safeString(latestQual.institution || latestQual.institutionName),
    boardOrUniversity: safeString(latestQual.board || latestQual.boardOrUniversity),
    year: safeString(latestQual.completionYear || latestQual.year || latestQual.endDate),
    percentage: safeString(latestQual.percentage || latestQual.score),
    gpa: safeString(latestQual.gpa),
    subjects: parseStringList(latestQual.subjects),
  };

  // 3. Language Tests Normalization
  const languageTests: CanonicalLanguageTest[] = [];
  const rawTests = raw.languageTests || raw.tests;
  const rawTestsRecord = asRecord(rawTests);

  if (Array.isArray(rawTests)) {
    for (const t of rawTests) {
      if (t && typeof t === "object") {
        const tr = t as Record<string, unknown>;
        languageTests.push({
          name: safeString(tr.name || tr.type, "English Test"),
          overall: safeString(tr.overall || tr.overallScore),
          components: (tr.components || tr.subscores || {}) as Record<string, string>,
          dateTaken: safeString(tr.dateTaken || tr.testDate),
        });
      }
    }
  } else if (rawTestsRecord.ielts) {
    const ieltsRec = asRecord(rawTestsRecord.ielts);
    languageTests.push({
      name: "IELTS Academic",
      overall: safeString(ieltsRec.overall || ieltsRec.overallScore),
      components: {
        listening: safeString(ieltsRec.listening),
        reading: safeString(ieltsRec.reading),
        writing: safeString(ieltsRec.writing),
        speaking: safeString(ieltsRec.speaking),
      },
      dateTaken: safeString(ieltsRec.dateTaken || ieltsRec.testDate),
    });
  } else if (rawTestsRecord.english) {
    const engRec = asRecord(rawTestsRecord.english);
    languageTests.push({
      name: safeString(engRec.type, "English Proficiency Test"),
      overall: safeString(engRec.overallScore),
      components: engRec.subscores as Record<string, string> | undefined,
      dateTaken: safeString(engRec.testDate),
    });
  }

  // 4. University Normalization
  const rawDest = asRecord(raw.destination || raw.university);
  const rawUni = asRecord(rawDest.university);
  const uniName =
    safeString(rawUni.officialName || rawUni.name) ||
    (typeof rawDest.university === "string" ? rawDest.university : "") ||
    safeString(raw.targetUniversity);

  const university: CanonicalUniversity = {
    name: uniName,
    officialName: uniName,
    country: safeString(rawDest.country || rawUni.country || raw.targetCountry, "Italy"),
    city: safeString(rawDest.city || rawUni.city || raw.targetCity),
    department: safeString(rawUni.department || raw.department),
  };

  // 5. Course Normalization
  const rawCourse = asRecord(rawDest.course);
  const courseTitle =
    safeString(rawCourse.officialName || rawCourse.title || rawCourse.name) ||
    (typeof rawDest.course === "string" ? rawDest.course : "") ||
    safeString(raw.targetProgram);

  const course: CanonicalCourse = {
    officialName: courseTitle,
    level: safeString(rawDest.degreeLevel || rawCourse.level || "Degree"),
    duration: safeString(rawDest.duration || rawCourse.duration, "Standard Duration"),
    startDate: safeString(rawCourse.startDate),
    intakeMonth: safeString(rawDest.intakeMonth || rawCourse.intakeMonth),
    intakeYear: safeString(rawDest.intakeYear || rawCourse.intakeYear),
    subjectsOrAreas: parseStringList(rawCourse.subjectsOrAreas || raw.subjectsOrAreas),
  };

  // 6. Motivation & Career
  const rawMotivation = asRecord(raw.motivation);
  const motivation: CanonicalMotivation = {
    academicInterests: parseStringList(rawMotivation.academicInterests),
    courseReasons: parseStringList(rawMotivation.courseReasons),
    universityReasons: parseStringList(rawMotivation.universityReasons),
    countryReasons: parseStringList(rawMotivation.countryReasons),
  };

  const rawCareer = asRecord(raw.career);
  const career: CanonicalCareer = {
    higherStudyPlan: safeString(rawCareer.higherStudyPlan),
    shortTermPlan: safeString(rawCareer.shortTermGoal || rawCareer.shortTermPlan),
    longTermPlan: safeString(rawCareer.longTermGoal || rawCareer.longTermPlan),
    returnCountry: safeString(rawCareer.returnCountry || applicant.country, "India"),
    returnReasons: parseStringList(rawCareer.returnIntention || rawCareer.returnReasons),
  };

  // 7. Family & Financials
  const rawFamily = asRecord(raw.family);
  const rawFather = asRecord(rawFamily.father);
  const rawMother = asRecord(rawFamily.mother);
  const rawFinancials = asRecord(raw.financials);
  const rawSponsor = asRecord(raw.sponsor || rawFinancials.sponsor);
  const rawFinance = asRecord(raw.finance || raw.financials);
  const rawEduLoan = asRecord(rawFinance.educationLoan);
  const rawBankFunds = asRecord(rawFinance.bankFunds);

  const family: CanonicalFamily = {
    father: {
      name: safeString(rawFather.name || (rawSponsor.relationship === "Father" ? rawSponsor.name : "")),
      occupation: safeString(rawFather.occupation || (rawSponsor.relationship === "Father" ? rawSponsor.occupation : "")),
      annualIncome: safeString(rawFather.annualIncome || (rawSponsor.relationship === "Father" ? rawSponsor.annualIncome : "")),
      phone: safeString(rawFather.phone),
    },
    mother: {
      name: safeString(rawMother.name),
      occupation: safeString(rawMother.occupation),
      annualIncome: safeString(rawMother.annualIncome),
    },
    siblings: parseStringList(rawFamily.siblings),
    homeTies: parseStringList(rawFamily.homeTies || rawCareer.returnIntention),
  };

  const financials: CanonicalFinancials = {
    sponsor: {
      name: safeString(rawSponsor.name),
      relationship: safeString(rawSponsor.relationship, "Parent"),
      occupation: safeString(rawSponsor.occupation),
      annualIncome: safeString(rawSponsor.annualIncome),
      incomeSource: safeString(rawSponsor.incomeSource),
    },
    educationLoan: {
      amount: safeString(rawFinance.educationLoanAmount || rawEduLoan.amount),
      bank: safeString(rawFinance.loanProvider || rawEduLoan.bank),
      status: safeString(rawEduLoan.status, "Sanctioned"),
    },
    bankFunds: {
      balance: safeString(rawFinance.availableBalance || rawBankFunds.balance),
      bank: safeString(rawFinance.bankName || rawBankFunds.bank),
      currency: safeString(rawFinance.currency || rawBankFunds.currency, "INR"),
    },
    totalFunds: safeString(rawFinance.totalFundsAvailable || rawFinance.totalFunds),
    netWorth: safeString(rawFinance.netWorth),
    supportingDocuments: parseStringList(rawFinance.supportingDocuments),
  };

  // 8. Logistics
  const rawLogistics = asRecord(raw.visaLogistics);
  const rawAccom = asRecord(raw.accommodation || rawLogistics.accommodation);
  const accommodation: CanonicalAccommodation | undefined = rawAccom.name
    ? {
        name: safeString(rawAccom.name),
        type: safeString(rawAccom.type),
        address: safeString(rawAccom.address),
        city: safeString(rawAccom.city),
        country: safeString(rawAccom.country),
        fromDate: safeString(rawAccom.fromDate),
        toDate: safeString(rawAccom.toDate),
        bookingReference: safeString(rawAccom.bookingReference),
      }
    : undefined;

  const rawIns = asRecord(raw.insurance || rawLogistics.insurance);
  const insurance: CanonicalInsurance | undefined = rawIns.provider || rawIns.policyNumber
    ? {
        provider: safeString(rawIns.provider),
        policyNumber: safeString(rawIns.policyNumber),
        type: safeString(rawIns.type),
        fromDate: safeString(rawIns.fromDate),
        toDate: safeString(rawIns.toDate),
        coverageAmount: safeString(rawIns.coverageAmount),
      }
    : undefined;

  const rawTravel = asRecord(raw.travel || rawLogistics.travel);
  const travel: CanonicalTravel | undefined = rawTravel.flightNumber || rawTravel.pnr
    ? {
        airline: safeString(rawTravel.airline),
        flightNumber: safeString(rawTravel.flightNumber),
        origin: safeString(rawTravel.origin),
        destination: safeString(rawTravel.destination),
        travelDate: safeString(rawTravel.travelDate),
        pnr: safeString(rawTravel.pnr),
        returnDate: safeString(rawTravel.returnDate),
      }
    : undefined;

  // 9. Recommender (LOR)
  const rawRecommender = asRecord(raw.recommender);
  const rawStudentObj = asRecord(raw.student);
  const recommender: CanonicalRecommender | undefined =
    rawRecommender.fullName || rawRecommender.name
      ? {
          prefix: safeString(rawRecommender.prefix),
          name: safeString(rawRecommender.fullName || rawRecommender.name),
          title: safeString(rawRecommender.designation || rawRecommender.title),
          role: safeString(rawRecommender.role),
          department: safeString(rawRecommender.department),
          institution: safeString(rawRecommender.institutionName || rawRecommender.institution),
          email: safeString(rawRecommender.email),
          phone: safeString(rawRecommender.phone),
          relationship: safeString(rawRecommender.relationship),
          durationKnown: safeString(rawRecommender.durationKnown),
          coursesTaught: parseStringList(rawRecommender.coursesTaught || rawStudentObj.courseTaught),
          academicStandingNote: safeString(rawStudentObj.academicStanding),
        }
      : undefined;

  // 10. Projects & Work Experience
  const projects: CanonicalProject[] = [];
  const rawProjects = raw.projects;
  if (Array.isArray(rawProjects)) {
    for (const p of rawProjects) {
      if (p && typeof p === "object") {
        const pr = p as Record<string, unknown>;
        projects.push({
          title: safeString(pr.title || pr.name),
          technologies: safeString(pr.technologies || pr.technologiesUsed),
          description: safeString(pr.description || pr.summary || pr.projectSummary),
          role: safeString(pr.role),
          duration: safeString(pr.duration),
        });
      }
    }
  } else if (rawStudentObj.projectTitle) {
    projects.push({
      title: safeString(rawStudentObj.projectTitle),
      technologies: safeString(rawStudentObj.technologiesUsed),
      description: safeString(rawStudentObj.projectSummary),
    });
  }

  const workExperience: CanonicalWorkExperience[] = [];
  const rawWork = raw.workExperience;
  if (Array.isArray(rawWork)) {
    for (const w of rawWork) {
      if (w && typeof w === "object") {
        const wr = w as Record<string, unknown>;
        workExperience.push({
          position: safeString(wr.position || wr.role),
          organisation: safeString(wr.organisation || wr.company),
          location: safeString(wr.location),
          startDate: safeString(wr.startDate || wr.workingFrom),
          endDate: safeString(wr.endDate || wr.workingUpto),
          description: safeString(wr.description || wr.jobProfile),
        });
      }
    }
  }

  return {
    documentType,
    studentId: safeString(input.studentId || raw.studentId),
    applicationId: safeString(input.applicationId || raw.applicationId),
    applicant,
    education,
    languageTests,
    otherTests: Array.isArray(raw.otherTests) ? raw.otherTests : [],
    family,
    university,
    course,
    motivation,
    career,
    financials,
    accommodation,
    insurance,
    travel,
    recommender,
    projects,
    workExperience,
    achievements: parseStringList(raw.achievements),
    additionalFacts: parseStringList(raw.additionalFacts),
  };
}
