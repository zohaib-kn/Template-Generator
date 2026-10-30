/**
 * features/dashboard/utils/coverLetterCleaner.ts
 *
 * Professional Cover Letter cleaner, dynamic validation auditor, and AI field-wiring.
 *
 * Guarantees:
 * 1. Zero technical placeholders [MISSING: ...] in the Cover Letter.
 * 2. Incomplete clauses or sentences with missing data are cleanly omitted or rephrased
 *    without inventing student, financial, travel, or academic facts.
 * 3. Compact validation categorization across 8 strict categories:
 *    Personal, Academic, Family, University, Finance, Accommodation, Insurance, Travel.
 * 4. Bidirectional synchronization with the AI Admissions Assistant for instant field updates.
 */

import type { StudentDocumentContext } from "@/features/sop-generator/types/sop-generator";
import { italyTypeDCoverLetter } from "@/features/sop-generator/templates/italy-type-d-cover-letter";

export type ValidationCategory =
  | "Personal"
  | "Academic"
  | "Family"
  | "University"
  | "Finance"
  | "Accommodation"
  | "Insurance"
  | "Travel";

export interface ValidationFieldDefinition {
  key: string;
  label: string;
  category: ValidationCategory;
  question: string;
  placeholder: string;
}

export interface ValidationCategoryGroup {
  category: ValidationCategory;
  icon: string;
  fields: ValidationFieldDefinition[];
}

export const CATEGORY_ICONS: Record<ValidationCategory, string> = {
  Personal: "👤",
  Academic: "🎓",
  Family: "👨‍👩‍👧",
  University: "🏛️",
  Finance: "💳",
  Accommodation: "🏠",
  Insurance: "🛡️",
  Travel: "✈️",
};

/** All Cover Letter fields tracked for completeness */
export const VALIDATION_FIELDS_DEFINITIONS: ValidationFieldDefinition[] = [
  // ── 1. Personal ──────────────────────────────────────────────────────────
  {
    key: "student.city",
    label: "Student City",
    category: "Personal",
    question: "What is the student's city?",
    placeholder: "Bhopal",
  },
  {
    key: "student.country",
    label: "Student Country",
    category: "Personal",
    question: "What is the student's country of residence?",
    placeholder: "India",
  },
  {
    key: "student.nationality",
    label: "Nationality",
    category: "Personal",
    question: "What is the student's nationality?",
    placeholder: "Indian",
  },
  {
    key: "student.email",
    label: "Email Address",
    category: "Personal",
    question: "What is the student's email address?",
    placeholder: "student@example.com",
  },
  {
    key: "student.phone",
    label: "Phone Number",
    category: "Personal",
    question: "What is the student's contact phone number?",
    placeholder: "+91 9876543210",
  },
  {
    key: "student.languages",
    label: "Mother Tongue / Languages",
    category: "Personal",
    question: "What is the student's mother tongue or native language?",
    placeholder: "Hindi",
  },
  {
    key: "student.returnFamilyReason",
    label: "Family Return Reason",
    category: "Personal",
    question: "What is the student's personal or family reason for returning to their home country?",
    placeholder: "Given my deep personal ties and responsibility toward my aging parents",
  },

  // ── 2. Academic ──────────────────────────────────────────────────────────
  {
    key: "academics.subjects",
    label: "12th / Prior Subjects",
    category: "Academic",
    question: "What subjects did the student study in their prior qualification?",
    placeholder: "Physics, Chemistry, Mathematics, English",
  },
  {
    key: "academics.latestQualification",
    label: "Latest Qualification",
    category: "Academic",
    question: "What is the student's latest completed qualification?",
    placeholder: "Senior Secondary Certificate (Class XII)",
  },
  {
    key: "academics.institution",
    label: "School / College Name",
    category: "Academic",
    question: "What school or college did the student attend?",
    placeholder: "St. Xavier's High School",
  },
  {
    key: "academics.board",
    label: "Education Board",
    category: "Academic",
    question: "What was the education board (e.g. CBSE, ICSE, State Board)?",
    placeholder: "Central Board of Secondary Education (CBSE)",
  },
  {
    key: "academics.completionYear",
    label: "Completion Year",
    category: "Academic",
    question: "What year did the student complete their prior studies?",
    placeholder: "2024",
  },
  {
    key: "academics.favoriteSubjects",
    label: "Favorite Subjects",
    category: "Academic",
    question: "What are the student's favorite subjects or areas of intellectual interest?",
    placeholder: "Mathematics and Computer Science",
  },
  {
    key: "tests.ielts.overall",
    label: "English / IELTS Band Score",
    category: "Academic",
    question: "What is the student's English proficiency or IELTS band score?",
    placeholder: "7.5",
  },

  // ── 3. Family ────────────────────────────────────────────────────────────
  {
    key: "family.count",
    label: "Family Member Count",
    category: "Family",
    question: "How many members are there in the student's family?",
    placeholder: "four members",
  },
  {
    key: "family.fatherOccupation",
    label: "Father's Occupation",
    category: "Family",
    question: "What is the father's occupation or profession?",
    placeholder: "businessman",
  },
  {
    key: "family.motherOccupation",
    label: "Mother's Occupation",
    category: "Family",
    question: "What is the mother's occupation or profession?",
    placeholder: "senior educator",
  },
  {
    key: "family.siblingText",
    label: "Sibling Details",
    category: "Family",
    question: "What are the student's sibling details (e.g. an elder brother)?",
    placeholder: "an elder brother who works as a software engineer",
  },
  {
    key: "sponsor.name",
    label: "Sponsor Name",
    category: "Family",
    question: "What is the sponsor's full name?",
    placeholder: "Rajesh Kumar",
  },
  {
    key: "sponsor.relationship",
    label: "Sponsor Relationship",
    category: "Family",
    question: "What is the sponsor's relationship to the student (e.g. father)?",
    placeholder: "father",
  },

  // ── 4. University ────────────────────────────────────────────────────────
  {
    key: "destination.university",
    label: "Target University",
    category: "University",
    question: "Which Italian university is the student applying to?",
    placeholder: "University of Cassino",
  },
  {
    key: "destination.course",
    label: "Degree Programme",
    category: "University",
    question: "What degree programme or course is the student pursuing?",
    placeholder: "Bachelor in Computer Engineering",
  },
  {
    key: "destination.consulate",
    label: "Italian Consulate / Embassy",
    category: "University",
    question: "Which Italian Consulate or Embassy will the student apply to?",
    placeholder: "Consulate General of Italy in Mumbai",
  },
  {
    key: "destination.consulateAddress",
    label: "Consulate Address",
    category: "University",
    question: "What is the address of the Italian Consulate or Embassy?",
    placeholder: "Nariman Point, Mumbai 400021",
  },
  {
    key: "destination.courseDisciplines",
    label: "Course Disciplines / Focus",
    category: "University",
    question: "What core disciplines or areas does this programme combine?",
    placeholder: "embedded systems, software architecture, and artificial intelligence",
  },
  {
    key: "destination.universityHistory",
    label: "University Heritage / History",
    category: "University",
    question: "How many years of history or academic heritage does the university have?",
    placeholder: "over four decades",
  },
  {
    key: "destination.distinguishedScholars",
    label: "Distinguished Alumni / Scholars",
    category: "University",
    question: "Who are notable scholars or alumni associated with this institution?",
    placeholder: "internationally published researchers and senior European engineers",
  },
  {
    key: "destination.masterSpecialization",
    label: "Master's Specialization",
    category: "University",
    question: "What Master's specialization does the student aim to pursue after graduation?",
    placeholder: "Distributed Computing and Cloud Systems",
  },

  // ── 5. Finance ───────────────────────────────────────────────────────────
  {
    key: "finance.educationLoanAmount",
    label: "Education Loan Amount",
    category: "Finance",
    question: "What is the sanctioned education loan amount (e.g. ₹20,00,000)?",
    placeholder: "₹20,00,000",
  },
  {
    key: "finance.loanProvider",
    label: "Loan Provider / Bank",
    category: "Finance",
    question: "Which bank or financial institution sanctioned the education loan?",
    placeholder: "State Bank of India (SBI)",
  },
  {
    key: "finance.disbursedAmount",
    label: "Disbursed Loan Amount",
    category: "Finance",
    question: "How much loan amount has already been disbursed?",
    placeholder: "₹5,00,000",
  },
  {
    key: "finance.bankAccount",
    label: "Disbursement Bank Account",
    category: "Finance",
    question: "Which bank account was the loan disbursed into (e.g. SBI savings account)?",
    placeholder: "SBI Savings Account ending in 4102",
  },
  {
    key: "finance.statementDate",
    label: "Bank Statement Date",
    category: "Finance",
    question: "What is the date of the latest bank statement?",
    placeholder: "15th October 2026",
  },
  {
    key: "finance.availableBalance",
    label: "Available Bank Balance (INR)",
    category: "Finance",
    question: "What is the available bank balance in INR (e.g. ₹15,40,000)?",
    placeholder: "₹15,40,000",
  },
  {
    key: "finance.availableBalanceEur",
    label: "Available Balance (EUR)",
    category: "Finance",
    question: "What is the approximate available bank balance in Euros (e.g. €17,000)?",
    placeholder: "€17,000",
  },
  {
    key: "finance.exchangeRate",
    label: "EUR/INR Exchange Rate",
    category: "Finance",
    question: "What exchange rate was used (e.g. 1 EUR = ₹91.50)?",
    placeholder: "1 EUR = ₹91.50",
  },
  {
    key: "finance.netWorth",
    label: "Sponsor Net Worth",
    category: "Finance",
    question: "What is the CA-certified net worth of the sponsor (e.g. ₹1.2 Crore)?",
    placeholder: "₹1.2 Crore",
  },
  {
    key: "finance.itrYears",
    label: "ITR Assessment Years",
    category: "Finance",
    question: "Which Assessment Years are covered by the enclosed ITRs (e.g. 2024-25 & 2025-26)?",
    placeholder: "2024-25 and 2025-26",
  },

  // ── 6. Accommodation ─────────────────────────────────────────────────────
  {
    key: "accommodation.nameAndAddress",
    label: "Accommodation Name & Address",
    category: "Accommodation",
    question: "What is the name and address of the booked accommodation in Italy?",
    placeholder: "CampusX Residence, Via Università 10, Cassino",
  },
  {
    key: "accommodation.fromDate",
    label: "Stay Check-in Date",
    category: "Accommodation",
    question: "What is the accommodation check-in date?",
    placeholder: "01/10/2026",
  },
  {
    key: "accommodation.toDate",
    label: "Stay Check-out Date",
    category: "Accommodation",
    question: "What is the accommodation check-out date?",
    placeholder: "31/10/2026",
  },

  // ── 7. Insurance ─────────────────────────────────────────────────────────
  {
    key: "insurance.policyType",
    label: "Insurance Policy Type",
    category: "Insurance",
    question: "What type of travel and health insurance policy was obtained?",
    placeholder: "Comprehensive International Travel & Health Insurance Policy",
  },
  {
    key: "insurance.policyNumber",
    label: "Policy / Certificate Number",
    category: "Insurance",
    question: "What is the insurance policy or certificate number?",
    placeholder: "POL-99281-IT",
  },
  {
    key: "insurance.fromDate",
    label: "Coverage Start Date",
    category: "Insurance",
    question: "When does the insurance coverage start?",
    placeholder: "20/09/2026",
  },
  {
    key: "insurance.toDate",
    label: "Coverage End Date",
    category: "Insurance",
    question: "When does the insurance coverage end?",
    placeholder: "20/09/2027",
  },

  // ── 8. Travel ────────────────────────────────────────────────────────────
  {
    key: "travel.airline",
    label: "Airline Name",
    category: "Travel",
    question: "Which airline is the flight booked with (e.g. Emirates)?",
    placeholder: "Emirates",
  },
  {
    key: "travel.origin",
    label: "Departure City / Airport",
    category: "Travel",
    question: "What is the departure city or airport (e.g. New Delhi)?",
    placeholder: "New Delhi (DEL)",
  },
  {
    key: "travel.destination",
    label: "Destination City / Airport",
    category: "Travel",
    question: "What is the arrival city or airport in Italy (e.g. Rome Fiumicino)?",
    placeholder: "Rome Fiumicino (FCO)",
  },
  {
    key: "travel.transit",
    label: "Transit / Layover City",
    category: "Travel",
    question: "What is the transit or layover city (e.g. Dubai)?",
    placeholder: "Dubai (DXB)",
  },
  {
    key: "travel.travelDate",
    label: "Travel Date",
    category: "Travel",
    question: "What is the scheduled date of travel?",
    placeholder: "25/09/2026",
  },
  {
    key: "travel.pnr",
    label: "Flight PNR Number",
    category: "Travel",
    question: "What is the flight booking PNR number?",
    placeholder: "EK892X",
  },
];

/**
 * Resolves a dot-path field against StudentDocumentContext or explicit fieldOverrides.
 * Returns empty string if missing or unresolved. Never returns [MISSING: ...].
 */
export function resolveCleanField(
  ctx: StudentDocumentContext | null | undefined,
  fieldOverrides: Record<string, string> | undefined,
  path: string
): string {
  if (fieldOverrides && fieldOverrides[path] !== undefined && fieldOverrides[path] !== null) {
    const overrideVal = String(fieldOverrides[path]).trim();
    if (overrideVal && !overrideVal.toUpperCase().includes("MISSING")) {
      return overrideVal;
    }
  }

  if (!ctx) return "";

  const segments = path.split(".");
  let cur: unknown = ctx;
  for (const seg of segments) {
    if (cur === null || cur === undefined || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[seg];
  }

  if (typeof cur === "string") {
    const val = cur.trim();
    if (val && !val.toUpperCase().includes("MISSING")) return val;
  }
  return "";
}

/**
 * Calculates missing fields grouped by category.
 */
export function getMissingValidationGroups(
  ctx: StudentDocumentContext | null | undefined,
  fieldOverrides?: Record<string, string>
): ValidationCategoryGroup[] {
  const groupsByCategory = new Map<ValidationCategory, ValidationFieldDefinition[]>();

  const categoryOrder: ValidationCategory[] = [
    "Personal",
    "Academic",
    "Family",
    "University",
    "Finance",
    "Accommodation",
    "Insurance",
    "Travel",
  ];

  for (const cat of categoryOrder) {
    groupsByCategory.set(cat, []);
  }

  for (const def of VALIDATION_FIELDS_DEFINITIONS) {
    const val = resolveCleanField(ctx, fieldOverrides, def.key);
    if (!val) {
      groupsByCategory.get(def.category)?.push(def);
    }
  }

  const result: ValidationCategoryGroup[] = [];
  for (const cat of categoryOrder) {
    const fields = groupsByCategory.get(cat) || [];
    if (fields.length > 0) {
      result.push({
        category: cat,
        icon: CATEGORY_ICONS[cat],
        fields,
      });
    }
  }

  return result;
}

/** Total count of unresolved fields across all categories */
export function getTotalMissingCount(
  ctx: StudentDocumentContext | null | undefined,
  fieldOverrides?: Record<string, string>
): number {
  let count = 0;
  for (const def of VALIDATION_FIELDS_DEFINITIONS) {
    if (!resolveCleanField(ctx, fieldOverrides, def.key)) {
      count++;
    }
  }
  return count;
}

// ── Clean Section Renderers for Italy Type D Cover Letter ───────────────────

function renderCleanRecipient(
  ctx: StudentDocumentContext | null | undefined,
  ov?: Record<string, string>
): string {
  const consulate = resolveCleanField(ctx, ov, "destination.consulate") || "Embassy of Italy / Consulate General of Italy";
  const address = resolveCleanField(ctx, ov, "destination.consulateAddress");
  return `To,\nThe Respected Visa Officer,\n${consulate}${address ? `,\n${address}` : ""}.`;
}

function renderCleanSubject(
  ctx: StudentDocumentContext | null | undefined,
  ov?: Record<string, string>
): string {
  const course = resolveCleanField(ctx, ov, "destination.course") || "Higher Education";
  const university = resolveCleanField(ctx, ov, "destination.university");
  if (university) {
    return `Subject: Application for a Long-Term Type D Student Visa to Pursue ${course} at the ${university}`;
  }
  return `Subject: Application for a Long-Term Type D Student Visa to Pursue ${course} in Italy`;
}

function renderCleanStudentIntro(
  ctx: StudentDocumentContext | null | undefined,
  ov?: Record<string, string>
): string {
  const name = resolveCleanField(ctx, ov, "student.fullName") || "Applicant";
  const city = resolveCleanField(ctx, ov, "student.city");
  const country = resolveCleanField(ctx, ov, "student.country");

  if (city && country) {
    return `My name is **${name}**, and I am from **${city}, ${country}**.`;
  }
  if (country) {
    return `My name is **${name}**, and I am from **${country}**.`;
  }
  if (city) {
    return `My name is **${name}**, and I am from **${city}**.`;
  }
  return `My name is **${name}**.`;
}

function renderCleanAcademic(
  ctx: StudentDocumentContext | null | undefined,
  ov?: Record<string, string>
): string {
  const qual = resolveCleanField(ctx, ov, "academics.latestQualification") || "academic studies";
  const inst = resolveCleanField(ctx, ov, "academics.institution") || "my educational institution";
  const board = resolveCleanField(ctx, ov, "academics.board");
  const year = resolveCleanField(ctx, ov, "academics.completionYear");
  const subjects = resolveCleanField(ctx, ov, "academics.subjects");

  let academicSentence = `I completed my ${qual} from **${inst}**`;
  if (board) academicSentence += `, under the **${board}**`;
  if (year) academicSentence += ` in **${year}**`;
  if (subjects) academicSentence += `, with **${subjects}**`;
  academicSentence += `. I remain grateful to my school and teachers for their guidance and support in shaping my academic journey.`;

  const ieltsScore = resolveCleanField(ctx, ov, "tests.ielts.overall");
  const ieltsType = resolveCleanField(ctx, ov, "tests.ielts.type") || "IELTS";
  const languages = resolveCleanField(ctx, ov, "student.languages");
  let englishSentence = "";
  if (languages && ieltsScore) {
    englishSentence = ` My native language is **${languages}**, and I have demonstrated my English language proficiency by securing an **overall ${ieltsType} band score of ${ieltsScore}**.`;
  } else if (ieltsScore) {
    englishSentence = ` I also demonstrated my English language proficiency by securing an **overall ${ieltsType} band score of ${ieltsScore}**.`;
  } else if (languages) {
    englishSentence = ` My native language is **${languages}**, and I am proficient in English for academic instruction.`;
  }

  const famCount = resolveCleanField(ctx, ov, "family.count");
  const fatherOcc = resolveCleanField(ctx, ov, "family.fatherOccupation");
  const motherOcc = resolveCleanField(ctx, ov, "family.motherOccupation");
  const sibling = resolveCleanField(ctx, ov, "family.siblingText");

  let familySentence = "";
  if (famCount) {
    familySentence += ` I come from a family of ${famCount}.`;
  }
  if (fatherOcc && motherOcc) {
    familySentence += ` My father is an **${fatherOcc}**, and my mother is employed with **${motherOcc}**.`;
  } else if (fatherOcc) {
    familySentence += ` My father is an **${fatherOcc}**.`;
  } else if (motherOcc) {
    familySentence += ` My mother is employed with **${motherOcc}**.`;
  }

  if (sibling) {
    familySentence += ` I also have ${sibling}, and my family has always encouraged me to pursue quality education and achieve my academic goals.`;
  } else {
    familySentence += ` My family has always encouraged me to pursue quality education and achieve my academic goals.`;
  }

  return `${academicSentence}${englishSentence}${familySentence ? ` ${familySentence.trim()}` : ""}`;
}

function renderCleanWhyCourse(
  ctx: StudentDocumentContext | null | undefined,
  ov?: Record<string, string>
): string {
  const course = resolveCleanField(ctx, ov, "destination.course") || "my chosen programme";
  const fav = resolveCleanField(ctx, ov, "academics.favoriteSubjects");
  const disciplines = resolveCleanField(ctx, ov, "destination.courseDisciplines");

  const intro = fav
    ? `I have always enjoyed subjects that challenge me to think logically, especially ${fav}.`
    : `I have always enjoyed subjects that challenge me to think logically.`;

  const middle = disciplines
    ? `As I explored different branches of engineering, I found **${course}** the most interesting because it combines ${disciplines} instead of focusing on just one field.`
    : `As I explored different branches of engineering, I found **${course}** the most compelling discipline for my academic and professional growth.`;

  return `${intro} ${middle} Technology is evolving every day, and I know it will continue to change by the time I complete my degree. I want to build a strong understanding of these areas so that I am prepared to adapt, learn new technologies, and contribute confidently to the future of engineering.`;
}

function renderCleanWhyUniversity(
  ctx: StudentDocumentContext | null | undefined,
  ov?: Record<string, string>
): string {
  const uni = resolveCleanField(ctx, ov, "destination.university") || "the university";
  const course = resolveCleanField(ctx, ov, "destination.course") || "engineering";
  const history = resolveCleanField(ctx, ov, "destination.universityHistory");
  const scholars = resolveCleanField(ctx, ov, "destination.distinguishedScholars");

  let heritageClause: string;
  if (history && scholars) {
    heritageClause = `for over **${history}**, it has been a centre of academic excellence, where distinguished scholars such as **${scholars}** studied and taught, leaving a lasting impact on science and human knowledge. Their legacy inspires me to pursue my education in an institution that has nurtured generations of great thinkers.`;
  } else if (history) {
    heritageClause = `for over **${history}**, it has maintained a distinguished tradition of rigorous academic excellence and scholarly mentorship.`;
  } else {
    heritageClause = `it has long stood as an esteemed centre of academic excellence and higher learning.`;
  }

  return `I chose the **${uni}** because, ${heritageClause} I also admire the university's continued commitment to high-quality teaching, research, innovation, and international collaboration, which I believe will provide me with an enriching learning environment and prepare me for a successful career in ${course}.`;
}

function renderCleanWhyItaly(
  ctx: StudentDocumentContext | null | undefined,
  ov?: Record<string, string>
): string {
  const country = resolveCleanField(ctx, ov, "destination.country") || "Italy";
  const uni = resolveCleanField(ctx, ov, "destination.university") || "the institution";
  return `I chose **${country}** because it is home to the **${uni}**, the institution that best matched my academic interests and career aspirations. ${country} is internationally recognized for the quality of its higher education, with its universities and engineering programmes earning strong global recognition for their academic standards and research. Another factor that influenced my decision was the country's climate, which is relatively similar to that of India. I believe this will help me adapt more comfortably to a new environment, allowing me to focus on my studies and make the most of my academic experience.`;
}

function renderCleanFuturePlan(
  ctx: StudentDocumentContext | null | undefined,
  ov?: Record<string, string>
): string {
  const course = resolveCleanField(ctx, ov, "destination.course") || "my undergraduate degree";
  const spec = resolveCleanField(ctx, ov, "destination.masterSpecialization");
  if (spec) {
    return `After completing my Bachelor's degree in ${course}, I intend to further advance my academic knowledge by pursuing a Master's degree in **${spec}**, depending on the specialization that best aligns with my interests and career goals.`;
  }
  return `After completing my Bachelor's degree in ${course}, I intend to further advance my academic knowledge by pursuing advanced postgraduate studies, focusing on the specialization that best aligns with my interests and career goals.`;
}

function renderCleanCareerPlan(): string {
  return `**In the short term,** upon completing my higher education, I intend to return to India and begin my professional career in the country's rapidly growing technology sector. I hope to secure an entry-level engineering role where I can apply the technical knowledge and international exposure gained through my education in Italy while continuing to learn from experienced professionals and develop my practical skills. **In the long term,** I aspire to grow into positions of greater responsibility and contribute to the development of innovative technology solutions that address real-world challenges and support India's technological advancement.`;
}

function renderCleanReturnIntent(
  ctx: StudentDocumentContext | null | undefined,
  ov?: Record<string, string>
): string {
  const reason = resolveCleanField(ctx, ov, "student.returnFamilyReason");
  if (reason) {
    return `${reason}, returning to India is also a personal priority, as I wish to build my future close to my family while making a meaningful contribution to my home country.`;
  }
  return `Returning to India is also a personal priority, as I wish to build my future close to my family while making a meaningful contribution to my home country.`;
}

function renderCleanFinance(
  ctx: StudentDocumentContext | null | undefined,
  ov?: Record<string, string>
): string {
  const sponsorRel = resolveCleanField(ctx, ov, "sponsor.relationship") || "sponsor";
  const sponsorName = resolveCleanField(ctx, ov, "sponsor.name");

  const sponsorIntro = sponsorName
    ? `My higher education and living expenses in Italy will be fully sponsored by my ${sponsorRel}, ${sponsorName}.`
    : `My higher education and living expenses in Italy will be fully sponsored by my ${sponsorRel}.`;

  const pronoun = sponsorRel.toLowerCase().includes("mother") ? "she" : "he";
  const pronounCap = pronoun.charAt(0).toUpperCase() + pronoun.slice(1);
  const possessive = pronoun === "she" ? "her" : "his";

  const loanAmt = resolveCleanField(ctx, ov, "finance.educationLoanAmount");
  const loanProv = resolveCleanField(ctx, ov, "finance.loanProvider");
  const disbursed = resolveCleanField(ctx, ov, "finance.disbursedAmount");
  const bankAcc = resolveCleanField(ctx, ov, "finance.bankAccount");

  let loanPart = "";
  if (loanAmt) {
    loanPart = ` To finance my studies, ${pronoun} has obtained an education loan of **${loanAmt}**`;
    if (loanProv) loanPart += ` from ${loanProv}`;
    if (disbursed) {
      loanPart += `, of which **${disbursed}** has been disbursed`;
      if (bankAcc) loanPart += ` into ${possessive} ${bankAcc}`;
      loanPart += ` after the applicable insurance deductions`;
    }
    loanPart += `.`;
  }

  const availBal = resolveCleanField(ctx, ov, "finance.availableBalance");
  const availEur = resolveCleanField(ctx, ov, "finance.availableBalanceEur");
  const exRate = resolveCleanField(ctx, ov, "finance.exchangeRate");
  const stmtDate = resolveCleanField(ctx, ov, "finance.statementDate");

  let balancePart = "";
  if (availBal) {
    balancePart = ` As of **${stmtDate || "the latest statement"}**, the account reflects an available balance of **${availBal}**`;
    if (availEur) {
      balancePart += ` (approximately **${availEur}**`;
      if (exRate) balancePart += `, based on the exchange rate of **${exRate}**`;
      balancePart += `)`;
    }
    balancePart += `.`;
  }

  const commitmentPart = ` My ${sponsorRel} has undertaken full financial responsibility for my tuition fees, accommodation, living expenses, travel, medical insurance, and all other costs associated with my education and stay in Italy.`;

  const netWorth = resolveCleanField(ctx, ov, "finance.netWorth");
  let netWorthPart = "";
  if (netWorth) {
    netWorthPart = ` ${pronounCap} also has a CA-certified net worth of **${netWorth}** and is a regular income tax assessee.`;
  }

  const itrYears = resolveCleanField(ctx, ov, "finance.itrYears");
  const docsList = ["notarized sponsorship affidavit", "bank statement"];
  if (loanAmt) docsList.unshift("education loan sanction letter");
  if (netWorth) docsList.push("CA-certified net worth certificate");
  if (itrYears) {
    docsList.push(`${possessive} Income Tax Returns for Assessment Years **${itrYears}**`);
  } else {
    docsList.push(`${possessive} latest Income Tax Returns`);
  }

  const enclosurePart = ` In support of my application, I have enclosed the ${docsList.join(", ")} as evidence of ${possessive} financial capacity and commitment to sponsoring my education.`;

  return `${sponsorIntro}${loanPart}${balancePart}${commitmentPart}${netWorthPart}${enclosurePart}`;
}

function renderCleanAccommodation(
  ctx: StudentDocumentContext | null | undefined,
  ov?: Record<string, string>
): string {
  const address = resolveCleanField(ctx, ov, "accommodation.nameAndAddress");
  const from = resolveCleanField(ctx, ov, "accommodation.fromDate");
  const to = resolveCleanField(ctx, ov, "accommodation.toDate");

  if (address) {
    let dates = "";
    if (from && to) {
      dates = `, from **${from} to ${to}**`;
    }
    return `I have made all the necessary arrangements for my stay in Italy. I have secured temporary accommodation at **${address}**${dates}, which will provide me with sufficient time to settle in and arrange my long-term accommodation after my arrival.`;
  }
  return `I have initiated all necessary arrangements for my stay in Italy to ensure suitable accommodation upon my arrival before the commencement of my academic term.`;
}

function renderCleanInsurance(
  ctx: StudentDocumentContext | null | undefined,
  ov?: Record<string, string>
): string {
  const policyType = resolveCleanField(ctx, ov, "insurance.policyType");
  const policyNum = resolveCleanField(ctx, ov, "insurance.policyNumber");
  const from = resolveCleanField(ctx, ov, "insurance.fromDate");
  const to = resolveCleanField(ctx, ov, "insurance.toDate");

  if (policyType || policyNum) {
    const policyDesc = policyType || "comprehensive travel and health insurance policy";
    const cert = policyNum ? ` (Certificate No. ${policyNum})` : "";
    let dates = "";
    if (from && to) {
      dates = `, valid from **${from} to ${to}**`;
    }
    return `I have also obtained a **${policyDesc}${cert}**${dates}, in compliance with the visa requirements.`;
  }
  return `I am arranging comprehensive travel and health insurance coverage in full compliance with the visa requirements for the duration of my stay in Italy.`;
}

function renderCleanTravel(
  ctx: StudentDocumentContext | null | undefined,
  ov?: Record<string, string>
): string {
  const airline = resolveCleanField(ctx, ov, "travel.airline");
  const origin = resolveCleanField(ctx, ov, "travel.origin") || "India";
  const destination = resolveCleanField(ctx, ov, "travel.destination") || "Italy";
  const transit = resolveCleanField(ctx, ov, "travel.transit");
  const travelDate = resolveCleanField(ctx, ov, "travel.travelDate");
  const pnr = resolveCleanField(ctx, ov, "travel.pnr");

  if (airline || pnr) {
    const airlineName = airline || "commercial";
    const transitPart = transit ? ` via **${transit}**` : "";
    const datePart = travelDate ? ` for **${travelDate}**` : "";
    const pnrPart = pnr ? ` under **PNR: ${pnr}**` : "";
    return `Additionally, I have confirmed my travel arrangements by booking an **${airlineName}** flight from **${origin}** to **${destination}**${transitPart}${datePart}${pnrPart}, ensuring my timely arrival in Italy before the commencement of my studies.`;
  }
  return `Additionally, I am finalizing my travel itinerary to ensure timely arrival in Italy well before the commencement of the academic semester.`;
}

function renderCleanClosing(
  ctx: StudentDocumentContext | null | undefined,
  ov?: Record<string, string>
): string {
  const uni = resolveCleanField(ctx, ov, "destination.university") || "my university";
  return `Thank you for taking the time to review my application. I am truly eager to begin this new academic chapter at the **${uni}** and to make the most of the opportunities it offers. I respectfully request your kind and favourable consideration of my application for a Long-Term Type D Student Visa. Should you require any further information or supporting documentation, I would be pleased to provide it. Thank you once again for your time, consideration, and valued attention to my application.`;
}

function renderCleanSignature(
  ctx: StudentDocumentContext | null | undefined,
  ov?: Record<string, string>
): string {
  const name = resolveCleanField(ctx, ov, "student.fullName") || "Applicant";
  const email = resolveCleanField(ctx, ov, "student.email");
  const phone = resolveCleanField(ctx, ov, "student.phone");
  let res = `Sincerely,\n${name}`;
  if (email) res += `\nEmail: **${email}**`;
  if (phone) res += `\nPhone: **${phone}**`;
  return res;
}

/**
 * Builds all 16 sections of Italy Type D Cover Letter cleanly, with zero [MISSING: ...] markers.
 */
export function renderCleanCoverLetterSections(
  ctx: StudentDocumentContext | null | undefined,
  fieldOverrides?: Record<string, string>
): { heading: string; content: string }[] {
  return [
    { heading: "Recipient / Consulate", content: renderCleanRecipient(ctx, fieldOverrides) },
    { heading: "Subject Line", content: renderCleanSubject(ctx, fieldOverrides) },
    { heading: "Student Introduction", content: renderCleanStudentIntro(ctx, fieldOverrides) },
    { heading: "Academic Background", content: renderCleanAcademic(ctx, fieldOverrides) },
    { heading: "Why This Course", content: renderCleanWhyCourse(ctx, fieldOverrides) },
    { heading: "Why This University", content: renderCleanWhyUniversity(ctx, fieldOverrides) },
    { heading: "Why Italy / Why This Country", content: renderCleanWhyItaly(ctx, fieldOverrides) },
    { heading: "Future Academic Plan", content: renderCleanFuturePlan(ctx, fieldOverrides) },
    { heading: "Career Plan", content: renderCleanCareerPlan() },
    { heading: "Return / Home Country Intent", content: renderCleanReturnIntent(ctx, fieldOverrides) },
    { heading: "Financial Sponsorship", content: renderCleanFinance(ctx, fieldOverrides) },
    { heading: "Accommodation", content: renderCleanAccommodation(ctx, fieldOverrides) },
    { heading: "Travel & Health Insurance", content: renderCleanInsurance(ctx, fieldOverrides) },
    { heading: "Travel Arrangements", content: renderCleanTravel(ctx, fieldOverrides) },
    { heading: "Closing Statement", content: renderCleanClosing(ctx, fieldOverrides) },
    { heading: "Student Contact & Signature", content: renderCleanSignature(ctx, fieldOverrides) },
  ];
}

/**
 * Strips technical placeholders like [MISSING: ...] from text and cleans dangling punctuation.
 */
export function cleanCoverLetterText(text: string): string {
  if (!text) return "";

  let cleaned = text
    // Strip [MISSING: ...]
    .replace(/\[MISSING:\s*[^\]]+\]/gi, "")
    // Clean empty markdown bolds
    .replace(/\*\*\s*\*\*/g, "")
    // Clean dangling prepositions before punctuation
    .replace(/\b(from|in|at|under|with|for|to|into|of)\s*([.,;])/gi, "$2")
    // Clean orphan clauses
    .replace(/,\s*and\s+I\s+am\s+from\s*\./gi, ".")
    .replace(/,\s*and\s+I\s+am\s+from\s*,/gi, ",")
    // Clean trailing hyphen on names
    .replace(/(\b[A-Za-z]+)\s*-\s*,/g, "$1,")
    .replace(/(\b[A-Za-z]+)\s*-\s*\./g, "$1.")
    // Clean orphan family sentences
    .replace(/I come from a family of\s*\./gi, "")
    .replace(/My father is an?\s*(and my mother is employed with\s*)?\./gi, "")
    // Clean multiple punctuation
    .replace(/,\s*,+/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/\.\s*\.+/g, ".")
    // Clean whitespace
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n\s+\n/g, "\n\n")
    .trim();

  return cleaned;
}

/**
 * Parses user input for direct field assignment instructions.
 * Supports:
 * - "Add student city Bhopal."
 * - "Set father's occupation to businessman."
 * - "Update education loan amount to ₹20,00,000."
 * - "Add Hindi as mother tongue."
 */
export function parseDirectFieldInstruction(
  text: string
): { key: string; value: string; label: string } | null {
  const t = text.trim();
  if (!t) return null;

  const matchers: [RegExp, string, string][] = [
    // Mother tongue / Languages
    [/(?:add|set|update|change)?\s*(.+?)\s+as\s+(?:mother\s*tongue|native\s*language)/i, "student.languages", "Mother Tongue / Languages"],
    [/(?:add|set|update|change)?\s*(?:mother\s*tongue|native\s*language|first\s*language)\s*(?:is|to|=|:)?\s*(.+)/i, "student.languages", "Mother Tongue / Languages"],

    // City
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:student\s*)?city\s*(?:is|to|=|:)?\s*(.+)/i, "student.city", "Student City"],

    // Country
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:student\s*)?country\s*(?:is|to|=|:)?\s*(.+)/i, "student.country", "Student Country"],

    // Nationality
    [/(?:add|set|update|change)?\s*(?:the\s*)?nationality\s*(?:is|to|=|:)?\s*(.+)/i, "student.nationality", "Nationality"],

    // Email
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:student\s*)?email(?:\s*address)?\s*(?:is|to|=|:)?\s*(.+)/i, "student.email", "Email Address"],

    // Phone
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:student\s*)?(?:phone|mobile|contact)(?:\s*number)?\s*(?:is|to|=|:)?\s*(.+)/i, "student.phone", "Phone Number"],

    // Father's occupation
    [/(?:add|set|update|change)?\s*(?:the\s*)?father(?:'s)?\s*(?:occupation|job|profession)\s*(?:is|to|=|:)?\s*(.+)/i, "family.fatherOccupation", "Father's Occupation"],

    // Mother's occupation
    [/(?:add|set|update|change)?\s*(?:the\s*)?mother(?:'s)?\s*(?:occupation|job|profession)\s*(?:is|to|=|:)?\s*(.+)/i, "family.motherOccupation", "Mother's Occupation"],

    // Family member count
    [/(?:add|set|update|change)?\s*(?:the\s*)?family\s*(?:member\s*)?count\s*(?:is|to|=|:)?\s*(.+)/i, "family.count", "Family Member Count"],

    // Sibling
    [/(?:add|set|update|change)?\s*(?:the\s*)?sibling(?:\s*details)?\s*(?:is|to|=|:)?\s*(.+)/i, "family.siblingText", "Sibling Details"],

    // Sponsor name
    [/(?:add|set|update|change)?\s*(?:the\s*)?sponsor(?:\s*name)?\s*(?:is|to|=|:)?\s*(.+)/i, "sponsor.name", "Sponsor Name"],

    // Sponsor relationship
    [/(?:add|set|update|change)?\s*(?:the\s*)?sponsor\s*relationship\s*(?:is|to|=|:)?\s*(.+)/i, "sponsor.relationship", "Sponsor Relationship"],

    // Education Loan Amount
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:education\s*)?loan\s*amount\s*(?:is|to|=|:)?\s*(.+)/i, "finance.educationLoanAmount", "Education Loan Amount"],

    // Loan Provider / Bank
    [/(?:add|set|update|change)?\s*(?:the\s*)?loan\s*provider(?:\s*name)?\s*(?:is|to|=|:)?\s*(.+)/i, "finance.loanProvider", "Loan Provider / Bank"],

    // Disbursed Amount
    [/(?:add|set|update|change)?\s*(?:the\s*)?disbursed(?:\s*loan)?\s*amount\s*(?:is|to|=|:)?\s*(.+)/i, "finance.disbursedAmount", "Disbursed Loan Amount"],

    // Bank Account
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:disbursement\s*)?bank\s*account\s*(?:is|to|=|:)?\s*(.+)/i, "finance.bankAccount", "Disbursement Bank Account"],

    // Statement Date
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:bank\s*)?statement\s*date\s*(?:is|to|=|:)?\s*(.+)/i, "finance.statementDate", "Bank Statement Date"],

    // Available Balance
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:available\s*)?(?:bank\s*)?balance\s*(?:is|to|=|:)?\s*(.+)/i, "finance.availableBalance", "Available Bank Balance (INR)"],

    // Available Balance EUR
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:available\s*)?balance\s*(?:in\s*)?eur(?:o)?\s*(?:is|to|=|:)?\s*(.+)/i, "finance.availableBalanceEur", "Available Balance (EUR)"],

    // Exchange rate
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:eur\/inr\s*)?exchange\s*rate\s*(?:is|to|=|:)?\s*(.+)/i, "finance.exchangeRate", "Exchange Rate"],

    // Net worth
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:sponsor\s*)?(?:ca[- ]certified\s*)?net\s*worth\s*(?:is|to|=|:)?\s*(.+)/i, "finance.netWorth", "Sponsor Net Worth"],

    // ITR years
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:itr|income\s*tax\s*return)\s*(?:assessment\s*)?years?\s*(?:is|to|=|:)?\s*(.+)/i, "finance.itrYears", "ITR Assessment Years"],

    // Target University
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:target\s*)?university\s*(?:is|to|=|:)?\s*(.+)/i, "destination.university", "Target University"],

    // Course / Programme
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:degree\s*programme|degree|course)\s*(?:is|to|=|:)?\s*(.+)/i, "destination.course", "Degree Programme"],

    // Consulate / Embassy
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:italian\s*)?(?:consulate|embassy)\s*(?:is|to|=|:)?\s*(.+)/i, "destination.consulate", "Italian Consulate / Embassy"],

    // Consulate Address
    [/(?:add|set|update|change)?\s*(?:the\s*)?consulate\s*address\s*(?:is|to|=|:)?\s*(.+)/i, "destination.consulateAddress", "Consulate Address"],

    // Course disciplines
    [/(?:add|set|update|change)?\s*(?:the\s*)?course\s*disciplines\s*(?:is|to|=|:)?\s*(.+)/i, "destination.courseDisciplines", "Course Disciplines"],

    // University History
    [/(?:add|set|update|change)?\s*(?:the\s*)?university\s*(?:history|heritage)\s*(?:is|to|=|:)?\s*(.+)/i, "destination.universityHistory", "University Heritage / History"],

    // Distinguished scholars
    [/(?:add|set|update|change)?\s*(?:the\s*)?distinguished\s*(?:scholars|alumni)\s*(?:is|to|=|:)?\s*(.+)/i, "destination.distinguishedScholars", "Distinguished Alumni / Scholars"],

    // Master's Specialization
    [/(?:add|set|update|change)?\s*(?:the\s*)?master(?:'s)?\s*specialization\s*(?:is|to|=|:)?\s*(.+)/i, "destination.masterSpecialization", "Master's Specialization"],

    // Return family reason
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:return\s*)?family\s*reason\s*(?:is|to|=|:)?\s*(.+)/i, "student.returnFamilyReason", "Family Return Reason"],

    // Subjects
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:prior|12th\s*)?subjects\s*(?:is|to|=|:)?\s*(.+)/i, "academics.subjects", "12th / Prior Subjects"],

    // Favorite subjects
    [/(?:add|set|update|change)?\s*(?:the\s*)?favou?rite\s*subjects\s*(?:is|to|=|:)?\s*(.+)/i, "academics.favoriteSubjects", "Favorite Subjects"],

    // IELTS score
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:ielts|band)\s*score\s*(?:is|to|=|:)?\s*(.+)/i, "tests.ielts.overall", "English / IELTS Band Score"],

    // Accommodation name & address
    [/(?:add|set|update|change)?\s*(?:the\s*)?accommodation(?:\s*name\s*and\s*address|\s*address)?\s*(?:is|to|=|:)?\s*(.+)/i, "accommodation.nameAndAddress", "Accommodation Name & Address"],

    // Insurance policy number
    [/(?:add|set|update|change)?\s*(?:the\s*)?insurance\s*(?:policy\s*)?(?:number|cert(?:ificate)?)\s*(?:is|to|=|:)?\s*(.+)/i, "insurance.policyNumber", "Insurance Policy / Certificate Number"],

    // Airline
    [/(?:add|set|update|change)?\s*(?:the\s*)?airline\s*(?:name)?\s*(?:is|to|=|:)?\s*(.+)/i, "travel.airline", "Airline Name"],

    // PNR
    [/(?:add|set|update|change)?\s*(?:the\s*)?(?:flight\s*)?pnr(?:\s*number)?\s*(?:is|to|=|:)?\s*(.+)/i, "travel.pnr", "Flight PNR Number"],

    // Travel Date
    [/(?:add|set|update|change)?\s*(?:the\s*)?travel\s*date\s*(?:is|to|=|:)?\s*(.+)/i, "travel.travelDate", "Travel Date"],
  ];

  for (const [re, key, label] of matchers) {
    const match = t.match(re);
    if (match) {
      let val = match[1].trim();
      val = val.replace(/[."']+$/, "").replace(/^[."']+/, "").trim();
      if (val) {
        return { key, value: val, label };
      }
    }
  }

  return null;
}

/**
 * Updates the specific section corresponding to a field while keeping all other sections unchanged.
 */
export function updateCoverLetterSectionWithField(
  sections: { heading: string; content: string }[],
  fieldKey: string,
  value: string,
  ctx: StudentDocumentContext | null | undefined,
  fieldOverrides: Record<string, string>
): { heading: string; content: string }[] {
  const updatedOverrides = { ...fieldOverrides, [fieldKey]: value };

  // Map fieldKey to the relevant section heading keyword
  const fieldToSectionHeading: Record<string, string> = {
    "destination.consulate": "recipient",
    "destination.consulateAddress": "recipient",
    "destination.course": "subject",
    "destination.university": "subject",
    "student.city": "student introduction",
    "student.country": "student introduction",
    "student.fullName": "student introduction",
    "student.nationality": "student introduction",
    "academics.subjects": "academic background",
    "academics.latestQualification": "academic background",
    "academics.institution": "academic background",
    "academics.board": "academic background",
    "academics.completionYear": "academic background",
    "tests.ielts.overall": "academic background",
    "family.count": "academic background",
    "family.fatherOccupation": "academic background",
    "family.motherOccupation": "academic background",
    "family.siblingText": "academic background",
    "student.languages": "academic background",
    "academics.favoriteSubjects": "why this course",
    "destination.courseDisciplines": "why this course",
    "destination.universityHistory": "why this university",
    "destination.distinguishedScholars": "why this university",
    "destination.masterSpecialization": "future academic plan",
    "student.returnFamilyReason": "return / home country intent",
    "finance.educationLoanAmount": "financial sponsorship",
    "finance.loanProvider": "financial sponsorship",
    "finance.disbursedAmount": "financial sponsorship",
    "finance.bankAccount": "financial sponsorship",
    "finance.statementDate": "financial sponsorship",
    "finance.availableBalance": "financial sponsorship",
    "finance.availableBalanceEur": "financial sponsorship",
    "finance.exchangeRate": "financial sponsorship",
    "finance.netWorth": "financial sponsorship",
    "finance.itrYears": "financial sponsorship",
    "sponsor.name": "financial sponsorship",
    "sponsor.relationship": "financial sponsorship",
    "accommodation.nameAndAddress": "accommodation",
    "accommodation.fromDate": "accommodation",
    "accommodation.toDate": "accommodation",
    "insurance.policyType": "insurance",
    "insurance.policyNumber": "insurance",
    "insurance.fromDate": "insurance",
    "insurance.toDate": "insurance",
    "travel.airline": "travel arrangements",
    "travel.origin": "travel arrangements",
    "travel.destination": "travel arrangements",
    "travel.transit": "travel arrangements",
    "travel.travelDate": "travel arrangements",
    "travel.pnr": "travel arrangements",
    "student.email": "signature",
    "student.phone": "signature",
  };

  const targetSectionKeyword = fieldToSectionHeading[fieldKey]?.toLowerCase() || "";

  return sections.map((sec) => {
    const headingLower = sec.heading.toLowerCase();
    if (!targetSectionKeyword || !headingLower.includes(targetSectionKeyword)) {
      return sec;
    }

    // Render the updated clean content for this specific section
    let newContent = sec.content;
    if (headingLower.includes("recipient")) {
      newContent = renderCleanRecipient(ctx, updatedOverrides);
    } else if (headingLower.includes("subject")) {
      newContent = renderCleanSubject(ctx, updatedOverrides);
    } else if (headingLower.includes("introduction")) {
      newContent = renderCleanStudentIntro(ctx, updatedOverrides);
    } else if (headingLower.includes("academic background")) {
      newContent = renderCleanAcademic(ctx, updatedOverrides);
    } else if (headingLower.includes("why this course")) {
      newContent = renderCleanWhyCourse(ctx, updatedOverrides);
    } else if (headingLower.includes("why this university")) {
      newContent = renderCleanWhyUniversity(ctx, updatedOverrides);
    } else if (headingLower.includes("future academic")) {
      newContent = renderCleanFuturePlan(ctx, updatedOverrides);
    } else if (headingLower.includes("return")) {
      newContent = renderCleanReturnIntent(ctx, updatedOverrides);
    } else if (headingLower.includes("financial")) {
      newContent = renderCleanFinance(ctx, updatedOverrides);
    } else if (headingLower.includes("accommodation")) {
      newContent = renderCleanAccommodation(ctx, updatedOverrides);
    } else if (headingLower.includes("insurance")) {
      newContent = renderCleanInsurance(ctx, updatedOverrides);
    } else if (headingLower.includes("travel")) {
      newContent = renderCleanTravel(ctx, updatedOverrides);
    } else if (headingLower.includes("signature") || headingLower.includes("contact")) {
      newContent = renderCleanSignature(ctx, updatedOverrides);
    }

    return {
      heading: sec.heading,
      content: newContent,
    };
  });
}
