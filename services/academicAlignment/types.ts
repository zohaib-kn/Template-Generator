/**
 * services/academicAlignment/types.ts
 *
 * Core shared types for the Academic Mismatch Detection & Branch-Aware Content Engine.
 * Shared across SOP Generator, Resume Builder, and downstream document generators.
 */

import type {
  NormalizedQualification,
  NormalizedWorkExperience,
  NormalizedAppliedProgram,
} from "@/types/normalizedStudent";

// ---------------------------------------------------------------------------
// High-Level Academic Domains (Two-level taxonomy: Domain -> SubDomain)
// ---------------------------------------------------------------------------

export type AcademicDomain =
  | "ENGINEERING"
  | "COMPUTING"
  | "BUSINESS"
  | "ECONOMICS_FINANCE"
  | "SCIENCE"
  | "HEALTH_MEDICINE"
  | "LAW"
  | "SOCIAL_HUMANITIES"
  | "ARTS_DESIGN_MEDIA"
  | "HOSPITALITY_TOURISM"
  | "UNKNOWN";

// ---------------------------------------------------------------------------
// Academic Sub-Domains (Specialized discipline branches)
// ---------------------------------------------------------------------------

export type AcademicSubDomain =
  // Engineering sub-domains
  | "MECHANICAL_ENGINEERING"
  | "CIVIL_ENGINEERING"
  | "ELECTRICAL_ENGINEERING"
  | "ELECTRONICS_ENGINEERING"
  | "CHEMICAL_ENGINEERING"
  | "BIOMEDICAL_ENGINEERING"
  | "AEROSPACE_ENGINEERING"
  | "INDUSTRIAL_ENGINEERING"
  | "ROBOTICS_ENGINEERING"
  | "GENERAL_ENGINEERING"

  // Computing sub-domains
  | "COMPUTER_SCIENCE"
  | "SOFTWARE_ENGINEERING"
  | "DATA_SCIENCE"
  | "ARTIFICIAL_INTELLIGENCE"
  | "CYBERSECURITY"
  | "INFORMATION_TECHNOLOGY"
  | "INFORMATION_SYSTEMS"
  | "GENERAL_COMPUTING"

  // Business sub-domains
  | "BUSINESS_ADMINISTRATION"
  | "MARKETING"
  | "HUMAN_RESOURCES"
  | "INTERNATIONAL_BUSINESS"
  | "SUPPLY_CHAIN_LOGISTICS"
  | "COMMERCE"
  | "MANAGEMENT_GENERAL"

  // Economics & Finance sub-domains
  | "ECONOMICS"
  | "FINANCE"
  | "ACCOUNTING"
  | "BANKING"
  | "FINANCIAL_ANALYTICS"

  // Science sub-domains
  | "PHYSICS"
  | "CHEMISTRY"
  | "MATHEMATICS_STATISTICS"
  | "BIOLOGICAL_SCIENCES"
  | "BIOTECHNOLOGY"
  | "ENVIRONMENTAL_SCIENCE"
  | "GENERAL_SCIENCE"

  // Health & Medicine sub-domains
  | "GENERAL_MEDICINE"
  | "NURSING"
  | "PHARMACY"
  | "PUBLIC_HEALTH"
  | "PHYSIOTHERAPY"
  | "BIOMEDICAL_SCIENCE"

  // Law sub-domains
  | "GENERAL_LAW"
  | "CORPORATE_LAW"
  | "INTERNATIONAL_LAW"
  | "LEGAL_STUDIES"

  // Social Sciences & Humanities sub-domains
  | "PSYCHOLOGY"
  | "SOCIOLOGY"
  | "POLITICAL_SCIENCE"
  | "INTERNATIONAL_RELATIONS"
  | "LITERATURE_LINGUISTICS"
  | "HISTORY"
  | "PHILOSOPHY"
  | "GENERAL_HUMANITIES"

  // Arts, Design & Media sub-domains
  | "GRAPHIC_DESIGN"
  | "INTERIOR_DESIGN"
  | "ANIMATION_MULTIMEDIA"
  | "FINE_ARTS"
  | "ARCHITECTURE"
  | "MEDIA_COMMUNICATION"
  | "FASHION_DESIGN"

  // Hospitality & Tourism sub-domains
  | "HOSPITALITY_MANAGEMENT"
  | "TOURISM_EVENT_MANAGEMENT"
  | "CULINARY_ARTS"

  // Unclassified / Unknown
  | "UNKNOWN_SUBDOMAIN";

export type DomainConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface AcademicField {
  domain: AcademicDomain;
  subDomain?: AcademicSubDomain;
  confidence: DomainConfidence;
  /** Explains which piece of input data drove this classification */
  classifiedFrom: string;
  /** Raw string text that was evaluated */
  rawSource?: string;
}

// ---------------------------------------------------------------------------
// Academic Alignment Status & Resolution Model
// ---------------------------------------------------------------------------

/**
 * Status Model:
 * - ALIGNED: Source and target match closely.
 * - RELATED_TRANSITION: Adjacent/cognate fields (e.g. Mechanical -> Civil, or CS -> Data Science).
 * - ACADEMIC_MISMATCH: Distinct fields (e.g. Commerce -> Mechanical Engg). Blocks generation if unresolved.
 * - CONFIRMED_TRANSITION: Mismatch explicitly justified by counsellor with sufficient bridging evidence.
 * - UNKNOWN: Indeterminate source or target. MUST block sensitive AI generation.
 */
export type AcademicAlignmentStatus =
  | "ALIGNED"
  | "RELATED_TRANSITION"
  | "ACADEMIC_MISMATCH"
  | "CONFIRMED_TRANSITION"
  | "UNKNOWN";

export type MismatchResolution =
  | "UNRESOLVED"
  | "TARGET_CORRECTED"
  | "INTENTIONAL_CONFIRMED";

// ---------------------------------------------------------------------------
// Evidence & Transition Bridge Types
// ---------------------------------------------------------------------------

export type EvidenceItemType =
  | "CERTIFICATION"
  | "PROJECT"
  | "SKILL"
  | "INTERNSHIP"
  | "SUBJECT"
  | "WORK_EXPERIENCE";

export interface EvidenceItem {
  id: string;
  title: string;
  type: EvidenceItemType;
  /** Weighted score against the target domain: 0 (irrelevant), 1 (weak), 2 (moderate), 3 (strong) */
  relevanceScore: number;
  domainRelevanceExplanation?: string;
}

export interface TransitionContext {
  /** Counsellor / student justification text explaining the transition rationale */
  reason: string;
  selectedCertifications?: string[];
  selectedProjects?: string[];
  selectedSkills?: string[];
  selectedInternships?: string[];
  relevantSubjects?: string[];
  counsellorNote?: string;
}

export interface SafeEvidencePacket {
  justification: string;
  bridgeItems: EvidenceItem[];
  totalRelevanceScore: number;
  verifiedDomains: AcademicDomain[];
}

// ---------------------------------------------------------------------------
// Engine Result & Input Payloads
// ---------------------------------------------------------------------------

export interface AcademicAlignmentResult {
  status: AcademicAlignmentStatus;
  resolution: MismatchResolution;
  sourceField: AcademicField;
  targetField: AcademicField;
  /** Whether supporting bridging evidence satisfies domain thresholds (>= 3 points + valid reason) */
  evidenceSufficient: boolean;
  /** Whether AI generation for academically sensitive sections is permitted */
  generationAllowed: boolean;
  /** User-facing explanation if generation is blocked */
  blockingReason?: string;
  /** Safe evidence packet to inject into prompts when intentional transition is confirmed */
  safeEvidencePacket?: SafeEvidencePacket;
  confidence: DomainConfidence;
  explanation: string;
  isStale?: boolean;
  staleReason?: string;
}

export interface AlignmentComputeInput {
  qualifications: NormalizedQualification[];
  workExperience?: NormalizedWorkExperience[];
  targetProgram?: NormalizedAppliedProgram | null;
  transitionContext?: TransitionContext | null;
  certifications?: Array<{ id: string; name: string; issuer?: string }>;
  academicProjects?: Array<{ id: string; title: string; description?: string }>;
  skills?: Array<{ id: string; name: string }>;
  internships?: Array<{ id: string; role: string; organization?: string; description?: string }>;
}
