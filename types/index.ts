/**
 * Public API surface for all shared domain types.
 *
 * Import from "@/types" instead of individual type files to keep
 * import paths short and allow internal reorganisation without
 * updating every consumer.
 *
 * Example:
 *   import type { DocumentData, TemplateDefinition } from "@/types";
 */

export type {
  DocumentId,
  DocumentStatus,
  PersonalDetails,
  EducationEntry,
  InternshipEntry,
  RecommendationEntry,
  LanguageEntry,
  SkillEntry,
  HobbyEntry,
  VolunteeringEntry,
  EnglishCertificate,
  DocumentData,
  Document,
  // University-admissions sections
  AcademicInterest,
  AcademicProject,
  Achievement,
  LeadershipActivity,
  Certification,
} from "./document";


export type {
  TemplateId,
  TemplateVersion,
  TemplateDefinition,
} from "./template";
