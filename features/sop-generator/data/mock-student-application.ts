/**
 * Mock student application data for SOP Generator Phase 1.
 *
 * Student: Aafia Ameen, Bhopal, India
 * Applying for: Italy Type D Student Visa
 * Course: Bachelor's in Information Engineering, University of Padua
 *
 * IMPORTANT: This file contains MOCK data only — used for Phase 1 development.
 * In production this data will come from a real backend / webhook.
 * Do NOT use real private student details here.
 *
 * All factual fields (names, scores, amounts) are clearly labelled mock values.
 * AI narrative sections must NEVER override these factual fields.
 */

export const mockStudentApplication = {
  // ── Student personal details ─────────────────────────────────────────────
  student: {
    fullName: "Aafia Ameen",
    dateOfBirth: "15 March 2006",
    placeOfBirth: "Bhopal, Madhya Pradesh, India",
    city: "Bhopal",
    country: "India",
    nationality: "Indian",
    passportNumber: "Z9876543",
    phone: "+91 94255 67890",
    email: "aafia.ameen@example.com",
    address: "18 Koh-e-Fiza Colony, Bhopal, Madhya Pradesh – 462001, India",
    gender: "Female",
    languages: "Hindi (Native), Urdu (Native), English (B2 – Upper Intermediate)",
  },

  // ── Academic background ──────────────────────────────────────────────────
  academics: {
    latestQualification: "Class XII (Higher Secondary Certificate)",
    institution: "Carmel Convent Higher Secondary School, Bhopal",
    board: "Central Board of Secondary Education (CBSE)",
    completionYear: "2026",
    subjects: "Physics, Chemistry, Mathematics",
    percentage: "88.6%",
    previousDegree: "",
  },

  // ── English language test ────────────────────────────────────────────────
  tests: {
    ielts: {
      overall: "7.5",
      listening: "8.0",
      reading: "7.5",
      writing: "7.0",
      speaking: "7.5",
      dateTaken: "14 September 2025",
    },
  },

  // ── Destination / application details ───────────────────────────────────
  destination: {
    country: "Italy",
    city: "Padova",
    university: "University of Padua (Università degli Studi di Padova)",
    course: "Bachelor's Degree in Information Engineering",
    degreeLevel: "Bachelor's (Laurea Triennale)",
    duration: "3 years",
    intakeMonth: "September",
    intakeYear: "2026",
    consulate: "Consulate General of Italy",
    consulateCity: "Mumbai",
    consulateAddress: "75 Peddar Road, Mumbai – 400 026, India",
  },

  // ── Career goals ─────────────────────────────────────────────────────────
  career: {
    shortTermGoal:
      "To complete the Bachelor's Degree in Information Engineering at the University of Padua, building strong foundations in computer science, electronics, and systems design.",
    longTermGoal:
      "To return to India and contribute to the growing technology sector — specifically in embedded systems, software engineering, or IoT product development — leveraging the international education and practical exposure gained in Italy.",
    returnIntention:
      "My family is based in Bhopal, India, and I have strong ties to my home country. After completing my studies in Italy, I intend to return and apply my knowledge in India's expanding technology industry. I have no intention of remaining in Italy beyond my study period.",
  },

  // ── Sponsor ──────────────────────────────────────────────────────────────
  sponsor: {
    name: "Mohammed Ameen",
    relationship: "Father",
    occupation: "Civil Engineer, Government of Madhya Pradesh",
    annualIncome: "INR 14,00,000",
    incomeSource: "Salary — State Government Employment",
  },

  // ── Financial information ────────────────────────────────────────────────
  finance: {
    educationLoanAmount: "INR 20,00,000",
    loanProvider: "State Bank of India",
    bankName: "State Bank of India",
    accountHolderName: "Mohammed Ameen",
    availableBalance: "INR 8,50,000",
    totalFundsAvailable: "INR 28,50,000",
    currency: "INR",
  },

  // ── Accommodation ────────────────────────────────────────────────────────
  accommodation: {
    name: "ESU Casa dello Studente — Residenza Torricelli",
    type: "University Student Residence",
    address: "Via Venezia 12, 35131 Padova, Italy",
    city: "Padova",
    country: "Italy",
    fromDate: "1 September 2026",
    toDate: "30 June 2027",
    bookingReference: "ESU-PADUV-2026-4471",
  },

  // ── Travel insurance ─────────────────────────────────────────────────────
  insurance: {
    provider: "Bajaj Allianz General Insurance Co. Ltd.",
    policyNumber: "OG-2026-1801-0000-12345",
    type: "Student Travel and Health Insurance",
    fromDate: "1 September 2026",
    toDate: "31 August 2027",
    coverageAmount: "EUR 50,000",
  },

  // ── Travel arrangements ──────────────────────────────────────────────────
  travel: {
    airline: "Air India",
    flightNumber: "AI 0131",
    origin: "Indira Gandhi International Airport, New Delhi (DEL)",
    destination: "Marco Polo Airport, Venice, Italy (VCE)",
    travelDate: "2 September 2026",
    pnr: "AIINDBHO2026881",
    returnDate: "",
  },
};
