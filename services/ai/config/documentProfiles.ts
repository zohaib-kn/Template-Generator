/**
 * services/ai/config/documentProfiles.ts
 *
 * Specific configuration, tone, constraints, and structural profiles for each document type.
 */

import { DocumentType, DOCUMENT_TYPES } from "./documentTypes";

export interface ParagraphPlanItem {
  id: string;
  title: string;
  purpose: string;
  requiredFacts: string[];
  optionalFacts?: string[];
  maxWords?: number;
}

export interface DocumentProfile {
  type: DocumentType;
  title: string;
  perspective: "first_person_applicant" | "third_person_recommender";
  tone: string;
  creativity: "LOW" | "MEDIUM" | "HIGH";
  temperature: number;
  expectedParagraphCount: number;
  prohibitedContent: string[];
  allowedLogistics: boolean;
  allowedFinances: boolean;
  defaultPlan: ParagraphPlanItem[];
}

export const DOCUMENT_PROFILES: Record<DocumentType, DocumentProfile> = {
  [DOCUMENT_TYPES.VISA_COVER_LETTER]: {
    type: DOCUMENT_TYPES.VISA_COVER_LETTER,
    title: "Student Visa Cover Letter",
    perspective: "first_person_applicant",
    tone: "formal, factual, personal, credible, direct",
    creativity: "LOW",
    temperature: 0.2,
    expectedParagraphCount: 9,
    allowedLogistics: true,
    allowedFinances: true,
    prohibitedContent: [
      "Overly dramatic storytelling or narrative memoirs",
      "Generic brochure marketing praising ancient history",
      "Exaggerated or ungrounded praise of institutions",
      "Fabricated financial figures or altered bank balances",
      "Invented accommodation addresses or flight numbers",
    ],
    defaultPlan: [
      {
        id: "recipient_and_subject",
        title: "Formal Recipient & Subject",
        purpose: "Address the visa officer / consulate and declare application purpose with official course and university name",
        requiredFacts: ["applicant.name", "university.officialName", "course.officialName"],
        maxWords: 50,
      },
      {
        id: "applicant_intro",
        title: "Applicant Introduction",
        purpose: "Introduce applicant identity, citizenship, passport number, previous education, and test scores",
        requiredFacts: ["applicant.name", "applicant.passportNumber", "education.qualification", "education.institution"],
        optionalFacts: ["languageTests", "education.percentage"],
        maxWords: 110,
      },
      {
        id: "course_motivation",
        title: "Course Motivation",
        purpose: "Explain previous academic background, what interested the student in the subject, relevant parts of the course, and skills they want to develop (80-110 words). Do NOT discuss university prestige, destination country, family ties, or finances.",
        requiredFacts: ["course.officialName"],
        optionalFacts: ["motivation.courseReasons", "education.subjects"],
        maxWords: 110,
      },
      {
        id: "university_choice",
        title: "Why This University",
        purpose: "Explain why this particular university based on verified university-specific reasons and how they help the student's academic goal (70-90 words). Do NOT repeat the course explanation.",
        requiredFacts: ["university.officialName", "university.city"],
        optionalFacts: ["motivation.universityReasons"],
        maxWords: 90,
      },
      {
        id: "country_choice",
        title: "Why This Country",
        purpose: "Explain why this country makes sense for this student's education with maximum 2-3 meaningful reasons (60-80 words). Do NOT write tourism or promotional praise (avoid safe, beautiful, vibrant, historic, culturally rich, prestigious).",
        requiredFacts: ["university.country"],
        optionalFacts: ["motivation.countryReasons"],
        maxWords: 80,
      },
      {
        id: "future_education_career",
        title: "Future Education & Career Plan",
        purpose: "Explain realistic starting roles, how the degree supports those plans, long-term direction, and return-to-home-country plan (90-120 words). Do NOT repeat course, university, or country reasons.",
        requiredFacts: ["career.returnCountry"],
        optionalFacts: ["career.shortTermPlan", "career.longTermPlan", "career.higherStudyPlan", "family.homeTies"],
        maxWords: 120,
      },
      {
        id: "finances",
        title: "Financial Sponsorship & Funds",
        purpose: "Detail financial sponsorship, sponsor identity/income, sanctioned education loans, bank balances, and total funds",
        requiredFacts: ["financials.sponsor.name"],
        optionalFacts: ["financials.educationLoan", "financials.bankFunds", "financials.sponsor.income"],
        maxWords: 130,
      },
      {
        id: "logistics",
        title: "Accommodation, Insurance & Travel Logistics",
        purpose: "Detail verified accommodation arrangements, insurance policy validity, and confirmed flight/PNR itinerary",
        requiredFacts: [],
        optionalFacts: ["accommodation", "insurance", "travel"],
        maxWords: 120,
      },
      {
        id: "formal_closing",
        title: "Formal Closing & Verification",
        purpose: "Polite request for favourable consideration, list of enclosed documents, availability for verification, and signature",
        requiredFacts: ["applicant.name", "applicant.passportNumber"],
        maxWords: 70,
      },
    ],
  },

  [DOCUMENT_TYPES.SOP]: {
    type: DOCUMENT_TYPES.SOP,
    title: "Statement of Purpose",
    perspective: "first_person_applicant",
    tone: "professional, reflective, personal, academically motivated",
    creativity: "MEDIUM",
    temperature: 0.45,
    expectedParagraphCount: 8,
    allowedLogistics: false,
    allowedFinances: false,
    prohibitedContent: [
      "Bank balances, financial accounts, or tuition deposit transaction amounts",
      "Visa insurance policy numbers and coverage limits",
      "Flight numbers, PNR codes, or airline ticket bookings",
      "Accommodation addresses, tenancy lease details, or dorm room booking numbers",
      "Visa consular submission references or visa officer appeals",
      "Childhood clichés (e.g., 'Ever since I was five years old')",
    ],
    defaultPlan: [
      {
        id: "opening_motivation",
        title: "Opening Academic Motivation",
        purpose: "Engaging, academically grounded introduction outlining intellectual passion for the chosen discipline",
        requiredFacts: ["course.officialName"],
        optionalFacts: ["motivation.academicInterests"],
        maxWords: 120,
      },
      {
        id: "academic_background",
        title: "Academic Background & Foundation",
        purpose: "Chronological discussion of educational foundation, key subjects mastered, and analytical tools learned",
        requiredFacts: ["education.qualification", "education.institution"],
        optionalFacts: ["education.subjects", "education.percentage"],
        maxWords: 130,
      },
      {
        id: "academic_development_projects",
        title: "Projects, Practical Exposure & Research",
        purpose: "Concrete academic projects, capstone assignments, internships, or industry exposure demonstrating applied competence",
        requiredFacts: [],
        optionalFacts: ["projects", "workExperience", "achievements"],
        maxWords: 140,
      },
      {
        id: "skills_and_competencies",
        title: "Skills Developed",
        purpose: "Discussion of technical, quantitative, or domain-specific competencies acquired and areas requiring advanced study",
        requiredFacts: [],
        optionalFacts: ["education.subjects"],
        maxWords: 110,
      },
      {
        id: "why_specialization",
        title: "Why This Specialization",
        purpose: "Clear intellectual bridge between prior experience and the specific focus of this degree",
        requiredFacts: ["course.officialName"],
        optionalFacts: ["motivation.courseReasons"],
        maxWords: 120,
      },
      {
        id: "why_programme_and_university",
        title: "Why This Programme & University",
        purpose: "Specific curriculum modules, laboratory facilities, faculty research, or academic structure that make this university distinct",
        requiredFacts: ["university.officialName", "course.officialName"],
        optionalFacts: ["motivation.universityReasons", "course.subjectsOrAreas"],
        maxWords: 130,
      },
      {
        id: "career_trajectory",
        title: "Career Trajectory & Direction",
        purpose: "Realistic, grounded short-term and long-term career goals in target industries or research",
        requiredFacts: [],
        optionalFacts: ["career.shortTermPlan", "career.longTermPlan"],
        maxWords: 120,
      },
      {
        id: "conclusion",
        title: "Conclusion",
        purpose: "Synthesize readiness for rigorous graduate/undergraduate study and value the applicant brings to the university cohort",
        requiredFacts: ["university.officialName"],
        maxWords: 90,
      },
    ],
  },

  [DOCUMENT_TYPES.LOR]: {
    type: DOCUMENT_TYPES.LOR,
    title: "Letter of Recommendation",
    perspective: "third_person_recommender",
    tone: "authoritative, evaluative, professional, supportive",
    creativity: "LOW",
    temperature: 0.3,
    expectedParagraphCount: 6,
    allowedLogistics: false,
    allowedFinances: false,
    prohibitedContent: [
      "Writing from the student's first-person perspective ('I am applying for')",
      "Invented class rankings (e.g. 'top 1%', 'top 5%') unless explicitly supplied in source data",
      "Invented awards, competitions, or leadership roles not provided in source data",
      "Visa details, accommodation, financial loan information, flight logistics",
      "Generic empty platitudes without supporting classroom or project context",
    ],
    defaultPlan: [
      {
        id: "recommender_intro_relationship",
        title: "Recommender Introduction & Acquaintance",
        purpose: "Introduce the recommender's official capacity, department, institution, and professional relationship with the applicant",
        requiredFacts: ["recommender.name", "recommender.title", "applicant.name"],
        optionalFacts: ["recommender.relationship", "recommender.durationKnown"],
        maxWords: 110,
      },
      {
        id: "academic_professional_ability",
        title: "Academic & Analytical Ability",
        purpose: "Evaluate the student's coursework performance, grasp of complex concepts, and dedication to academic rigor",
        requiredFacts: ["applicant.name"],
        optionalFacts: ["education.subjects", "recommender.coursesTaught"],
        maxWords: 130,
      },
      {
        id: "concrete_examples_projects",
        title: "Specific Projects, Observations & Evidence",
        purpose: "Detail verified projects, assignments, research work, or professional deliverables supervised by or known to the recommender",
        requiredFacts: [],
        optionalFacts: ["projects", "workExperience"],
        maxWords: 140,
      },
      {
        id: "personal_professional_qualities",
        title: "Work Ethic, Collaboration & Qualities",
        purpose: "Observe intellectual curiosity, perseverance, collaboration, and receptiveness to feedback based on direct interaction",
        requiredFacts: ["applicant.name"],
        maxWords: 110,
      },
      {
        id: "future_potential_recommendation",
        title: "Potential & Unreserved Recommendation",
        purpose: "Affirm student's readiness for target program and recommend without hesitation",
        requiredFacts: ["applicant.name"],
        optionalFacts: ["course.officialName", "university.officialName"],
        maxWords: 100,
      },
      {
        id: "closing_and_endorsement",
        title: "Formal Sign-off & Verification Contact",
        purpose: "Offer availability for further inquiries with recommender credentials and institutional affiliation",
        requiredFacts: ["recommender.name", "recommender.title"],
        optionalFacts: ["recommender.email", "recommender.institution"],
        maxWords: 60,
      },
    ],
  },
};

export function getDocumentProfile(type: DocumentType): DocumentProfile {
  const profile = DOCUMENT_PROFILES[type];
  if (!profile) {
    throw new Error(`Unsupported document type: ${type}`);
  }
  return profile;
}
