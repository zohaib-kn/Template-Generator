/**
 * services/webhook/generators/resumeGenerator.ts
 *
 * SCAFFOLDED RESUME GENERATOR — NOT PRODUCTION-READY
 *
 * Status: Phase 2 Backend Scaffold
 * Connects the unified webhook to the Resume normalization layer (mapNormalizedToResume).
 * Full Resume Builder integration and section compilation will be completed in a subsequent phase.
 */

import type {
  DocumentGenerator,
  DocumentGenerationOptions,
  GeneratedDocumentResult,
} from "./interface";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";
import { mapNormalizedToResume } from "@/services/normalization/mapNormalizedToResume";

const DEFAULT_RESUME_TEMPLATE_ID = "standard-academic-cv";

export class ResumeDocumentGenerator implements DocumentGenerator {
  readonly type = "RESUME" as const;

  async generate(
    profile: NormalizedStudentProfile,
    options?: DocumentGenerationOptions
  ): Promise<GeneratedDocumentResult> {
    const templateId = options?.templateId || DEFAULT_RESUME_TEMPLATE_ID;

    // Projects profile into DocumentData + ApplicationTarget
    const { student: resumeStudent, target } = mapNormalizedToResume(profile);

    const educationList = resumeStudent.education ?? [];
    const experienceList = resumeStudent.internships ?? [];

    const fullName = resumeStudent.personal?.fullName ?? profile.personal.fullName ?? "Student";
    const email = resumeStudent.personal?.email ?? profile.personal.email ?? "N/A";
    const phone = resumeStudent.personal?.phone ?? profile.personal.phone ?? "N/A";

    const sectionContents: Record<string, string> = {
      header: `${fullName}\nEmail: ${email} | Phone: ${phone}`,
      education:
        educationList.length > 0
          ? educationList
              .map(
                (e) =>
                  `• ${e.qualification} at ${e.institution} (${e.startDate ?? ""} - ${e.endDate ?? ""})`
              )
              .join("\n")
          : "No education entries recorded.",
      experience:
        experienceList.length > 0
          ? experienceList
              .map(
                (i) =>
                  `• ${i.role} at ${i.company} (${i.startDate ?? ""} - ${i.endDate ?? ""})`
              )
              .join("\n")
          : "No prior work experience recorded.",
      target: `Target Destination: ${target.destinationCountry ?? "Other"} | Level: ${target.degreeLevel ?? "Master's"}`,
    };

    const sectionStatuses = {
      header: "NEEDS_REVIEW" as const,
      education: "NEEDS_REVIEW" as const,
      experience: "NEEDS_REVIEW" as const,
      target: "NEEDS_REVIEW" as const,
    };

    return {
      templateId,
      status: "NEEDS_REVIEW",
      sectionContents,
      sectionStatuses,
      validationIssues: [],
      warnings: [
        "SCAFFOLD: Resume generator is partially implemented. Review and edit before export.",
      ],
    };
  }
}
