/**
 * LOR (Letter of Recommendation) Generator — Domain Types
 */

export interface LorMetadata {
  referenceNumber: string;
  issueDate: string;
  documentTitle: string;
}

export interface LorInstitution {
  name: string;
  affiliation: string;
  logoUrl?: string;
  crestUrl?: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

export interface LorRecommender {
  prefix: string; // e.g., "Dr.", "Prof.", "Mr.", "Ms."
  fullName: string;
  designation: string; // e.g., "Professor", "Associate Professor"
  role: string; // e.g., "Head Of Department", "Project Guide", "Mentor"
  department: string; // e.g., "Computer Science & Engineering"
  institutionName?: string;
  email: string;
  phone?: string;
  signatureUrl?: string;
  stampUrl?: string;
  showStamp: boolean;
  showSignature: boolean;
}

export interface LorStudent {
  prefix: string; // e.g., "Mr.", "Ms."
  fullName: string;
  department: string; // e.g., "Department of Computer Science"
  institutionName: string;
  academicStanding: string; // e.g., "a final-year student"
  courseTaught: string; // e.g., "Information Security System"
  keySubjects: string; // e.g., "cryptography, network security models, and threat mitigation techniques"
  projectTitle: string; // e.g., "Personalized News Aggregator with Sentiment Analysis"
  technologiesUsed: string; // e.g., "Python, Django, and Natural Language Processing libraries"
  projectSummary: string; // e.g., "a web-based news aggregation platform that uses machine learning techniques to analyze sentiment..."
  targetProgram: string; // e.g., "higher education / Master of Science"
  targetUniversity: string; // e.g., "your esteemed institution"
}

export interface LorNarrative {
  introParagraph: string;
  academicsParagraph: string;
  projectParagraph: string;
  qualitiesParagraph: string;
  conclusionParagraph: string;
}

export interface LorDocument {
  id: string;
  metadata: LorMetadata;
  institution: LorInstitution;
  recommender: LorRecommender;
  student: LorStudent;
  narrative: LorNarrative;
}

export type LorPresetId = "academic_hod" | "project_guide" | "employer_internship";

export interface LorPreset {
  id: LorPresetId;
  label: string;
  description: string;
  badge: string;
  data: Omit<LorDocument, "id">;
}
