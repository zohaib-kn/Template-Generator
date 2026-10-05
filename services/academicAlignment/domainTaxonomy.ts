/**
 * services/academicAlignment/domainTaxonomy.ts
 *
 * Domain and Sub-Domain Taxonomy, pair-relationship matrices, and subject keyword maps
 * for the Academic Mismatch Detection Engine.
 *
 * NOTE: Academic domain classification relies strictly on fieldOfStudy, qualification titles,
 * subjects, and degree levels. `boardOrUniversity` is metadata only and is NEVER used as a classifier.
 */

import type { AcademicDomain, AcademicSubDomain } from "./types";

// ---------------------------------------------------------------------------
// High-Level Domain Relationship Rules
// ---------------------------------------------------------------------------

/**
 * Related domain transitions (cognate/interdisciplinary paths that are sensible
 * but require bridging awareness).
 */
const RELATED_DOMAIN_PAIRS = new Set<string>([
  // Computing <-> Engineering
  "COMPUTING->ENGINEERING",
  "ENGINEERING->COMPUTING",

  // Economics/Finance <-> Business
  "ECONOMICS_FINANCE->BUSINESS",
  "BUSINESS->ECONOMICS_FINANCE",

  // Science -> Computing / Engineering / Health
  "SCIENCE->COMPUTING",
  "SCIENCE->ENGINEERING",
  "SCIENCE->HEALTH_MEDICINE",

  // Computing <-> Arts/Design (e.g. HCI, UI/UX, Creative Media)
  "COMPUTING->ARTS_DESIGN_MEDIA",
  "ARTS_DESIGN_MEDIA->COMPUTING",

  // Social Humanities -> Business (e.g. Psychology -> HR / Marketing)
  "SOCIAL_HUMANITIES->BUSINESS",

  // Business -> Hospitality
  "BUSINESS->HOSPITALITY_TOURISM",
  "HOSPITALITY_TOURISM->BUSINESS",
]);

/**
 * Returns the high-level relationship between two academic domains.
 */
export function getDomainRelationship(
  source: AcademicDomain,
  target: AcademicDomain
): "ALIGNED" | "RELATED_TRANSITION" | "ACADEMIC_MISMATCH" | "UNKNOWN" {
  if (source === "UNKNOWN" || target === "UNKNOWN") {
    return "UNKNOWN";
  }

  if (source === target) {
    return "ALIGNED";
  }

  const pairKey = `${source}->${target}`;
  if (RELATED_DOMAIN_PAIRS.has(pairKey)) {
    return "RELATED_TRANSITION";
  }

  return "ACADEMIC_MISMATCH";
}

// ---------------------------------------------------------------------------
// Sub-Domain Relationship Overrides
// ---------------------------------------------------------------------------

/**
 * Explicit sub-domain pairs where intra-domain difference is significant enough
 * to be a RELATED_TRANSITION (e.g. Mechanical -> Civil) or cross-domain pair is ALIGNED (e.g. Commerce -> Finance).
 */
const SUBDOMAIN_OVERRIDES: Record<string, "ALIGNED" | "RELATED_TRANSITION" | "ACADEMIC_MISMATCH"> = {
  // Engineering intra-domain transitions (MUST not be treated as identically aligned without nuance)
  "MECHANICAL_ENGINEERING->CIVIL_ENGINEERING": "RELATED_TRANSITION",
  "CIVIL_ENGINEERING->MECHANICAL_ENGINEERING": "RELATED_TRANSITION",
  "MECHANICAL_ENGINEERING->AEROSPACE_ENGINEERING": "RELATED_TRANSITION",
  "AEROSPACE_ENGINEERING->MECHANICAL_ENGINEERING": "RELATED_TRANSITION",
  "MECHANICAL_ENGINEERING->ROBOTICS_ENGINEERING": "ALIGNED",
  "CIVIL_ENGINEERING->ENVIRONMENTAL_SCIENCE": "RELATED_TRANSITION",
  "CIVIL_ENGINEERING->CHEMICAL_ENGINEERING": "RELATED_TRANSITION",
  "CHEMICAL_ENGINEERING->CIVIL_ENGINEERING": "RELATED_TRANSITION",
  "ELECTRICAL_ENGINEERING->ELECTRONICS_ENGINEERING": "ALIGNED",
  "ELECTRONICS_ENGINEERING->ELECTRICAL_ENGINEERING": "ALIGNED",
  "ELECTRICAL_ENGINEERING->COMPUTER_SCIENCE": "RELATED_TRANSITION",
  "ELECTRONICS_ENGINEERING->COMPUTER_SCIENCE": "RELATED_TRANSITION",

  // Computing cross-discipline compatibility (broadly aligned)
  "COMPUTER_SCIENCE->SOFTWARE_ENGINEERING": "ALIGNED",
  "SOFTWARE_ENGINEERING->COMPUTER_SCIENCE": "ALIGNED",
  "COMPUTER_SCIENCE->DATA_SCIENCE": "ALIGNED",
  "DATA_SCIENCE->COMPUTER_SCIENCE": "ALIGNED",
  "COMPUTER_SCIENCE->ARTIFICIAL_INTELLIGENCE": "ALIGNED",
  "ARTIFICIAL_INTELLIGENCE->COMPUTER_SCIENCE": "ALIGNED",
  "INFORMATION_TECHNOLOGY->COMPUTER_SCIENCE": "ALIGNED",
  "COMPUTER_SCIENCE->INFORMATION_TECHNOLOGY": "ALIGNED",
  "COMPUTER_SCIENCE->CYBERSECURITY": "ALIGNED",
  "CYBERSECURITY->COMPUTER_SCIENCE": "ALIGNED",
  "INFORMATION_SYSTEMS->DATA_SCIENCE": "ALIGNED",

  // Business & Commerce & Finance compatibility
  "COMMERCE->FINANCE": "ALIGNED",
  "FINANCE->COMMERCE": "ALIGNED",
  "COMMERCE->BUSINESS_ADMINISTRATION": "ALIGNED",
  "BUSINESS_ADMINISTRATION->COMMERCE": "ALIGNED",
  "COMMERCE->ACCOUNTING": "ALIGNED",
  "ACCOUNTING->COMMERCE": "ALIGNED",
  "ACCOUNTING->FINANCE": "ALIGNED",
  "FINANCE->ACCOUNTING": "ALIGNED",
  "ECONOMICS->FINANCE": "ALIGNED",
  "FINANCE->ECONOMICS": "ALIGNED",
  "BUSINESS_ADMINISTRATION->MARKETING": "ALIGNED",
  "BUSINESS_ADMINISTRATION->HUMAN_RESOURCES": "ALIGNED",
  "BUSINESS_ADMINISTRATION->INTERNATIONAL_BUSINESS": "ALIGNED",
  "BUSINESS_ADMINISTRATION->SUPPLY_CHAIN_LOGISTICS": "ALIGNED",

  // STEM crossover
  "MATHEMATICS_STATISTICS->DATA_SCIENCE": "ALIGNED",
  "MATHEMATICS_STATISTICS->FINANCIAL_ANALYTICS": "ALIGNED",
  "PHYSICS->DATA_SCIENCE": "RELATED_TRANSITION",
  "BIOTECHNOLOGY->BIOMEDICAL_ENGINEERING": "RELATED_TRANSITION",
};

/**
 * Checks for a specific sub-domain relationship override.
 */
export function getSubDomainRelationship(
  sourceSubDomain?: AcademicSubDomain,
  targetSubDomain?: AcademicSubDomain
): "ALIGNED" | "RELATED_TRANSITION" | "ACADEMIC_MISMATCH" | undefined {
  if (!sourceSubDomain || !targetSubDomain) return undefined;
  if (sourceSubDomain === "UNKNOWN_SUBDOMAIN" || targetSubDomain === "UNKNOWN_SUBDOMAIN") {
    return undefined;
  }
  if (sourceSubDomain === targetSubDomain) {
    return "ALIGNED";
  }

  const key = `${sourceSubDomain}->${targetSubDomain}`;
  return SUBDOMAIN_OVERRIDES[key];
}

// ---------------------------------------------------------------------------
// Domain Subject & Keyword Map (for evidence relevance scoring)
// ---------------------------------------------------------------------------

export const DOMAIN_SUBJECT_MAP: Record<AcademicDomain, string[]> = {
  ENGINEERING: [
    "thermodynamics", "mechanics", "fluid", "cad", "solidworks", "ansys", "matlab",
    "structural", "concrete", "geotechnical", "surveying", "circuit", "vlsi",
    "embedded", "robotics", "plc", "scada", "manufacturing", "heat transfer",
    "kinematics", "autocad", "catia", "fea", "signal processing", "control systems"
  ],
  COMPUTING: [
    "python", "javascript", "typescript", "java", "c++", "data structures", "algorithms",
    "database", "sql", "nosql", "mongodb", "react", "node", "machine learning", "ai",
    "deep learning", "neural", "cloud", "aws", "azure", "docker", "kubernetes",
    "cybersecurity", "networking", "git", "linux", "web development", "devops"
  ],
  BUSINESS: [
    "management", "marketing", "business strategy", "human resources", "operations",
    "supply chain", "logistics", "crm", "sales", "leadership", "organizational behavior",
    "entrepreneurship", "business analytics", "negotiation", "erp", "project management"
  ],
  ECONOMICS_FINANCE: [
    "accounting", "finance", "financial modeling", "economics", "microeconomics",
    "macroeconomics", "valuation", "portfolio", "banking", "taxation", "auditing",
    "excel", "financial analysis", "capital markets", "risk management", "investment"
  ],
  SCIENCE: [
    "physics", "chemistry", "mathematics", "calculus", "linear algebra", "statistics",
    "biology", "molecular", "genetics", "biotechnology", "organic chemistry",
    "laboratory", "quantum", "ecology", "scientific research", "data analysis"
  ],
  HEALTH_MEDICINE: [
    "anatomy", "physiology", "pathology", "pharmacology", "clinical", "patient care",
    "public health", "epidemiology", "biostatistics", "nursing", "physiotherapy",
    "healthcare management", "diagnosis", "medical ethics", "surgery", "rehabilitation"
  ],
  LAW: [
    "constitutional law", "corporate law", "criminal law", "contract law", "jurisprudence",
    "legal research", "litigation", "intellectual property", "arbitration", "tort law",
    "international law", "compliance", "legal drafting", "advocacy"
  ],
  SOCIAL_HUMANITIES: [
    "psychology", "sociology", "political science", "international relations",
    "anthropology", "history", "philosophy", "literature", "linguistics",
    "research methodology", "qualitative research", "social policy", "counseling"
  ],
  ARTS_DESIGN_MEDIA: [
    "graphic design", "ui/ux", "figma", "photoshop", "illustrator", "animation",
    "3d modeling", "blender", "video editing", "journalism", "mass communication",
    "media", "typography", "branding", "interior design", "architecture", "visual arts"
  ],
  HOSPITALITY_TOURISM: [
    "hospitality", "hotel management", "front office", "food and beverage", "culinary",
    "tourism", "travel management", "event management", "catering", "resort management"
  ],
  UNKNOWN: [],
};
