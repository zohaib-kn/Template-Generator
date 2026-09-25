/**
 * services/import/normalizers/sopConflictDetector.ts
 *
 * Compares detected SOP facts against verified CRM student records.
 * Flags discrepancies across personal details, academics, test scores,
 * and target programs for counsellor review.
 */

import type { SopCrmConflictItem, ExtractedSopFacts } from "@/features/sop-generator/types/import";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";

export function detectSopCrmConflicts(
  extractedFacts: ExtractedSopFacts,
  crmProfile?: NormalizedStudentProfile | null
): SopCrmConflictItem[] {
  if (!crmProfile) return [];

  const conflicts: SopCrmConflictItem[] = [];
  const pCrm = crmProfile.personal || {};
  const aCrm = crmProfile.academics?.latest;
  const tCrm = crmProfile.tests?.english || {};
  const appCrm = crmProfile.applications?.activeProgram || crmProfile.applications?.all?.[0];

  // 1. Full Name check
  if (extractedFacts.fullName && pCrm.fullName) {
    const cleanU = extractedFacts.fullName.trim().toLowerCase();
    const cleanC = pCrm.fullName.trim().toLowerCase();
    if (cleanU !== cleanC && !cleanU.includes(cleanC) && !cleanC.includes(cleanU)) {
      conflicts.push({
        field: "fullName",
        label: "Full Name",
        crmValue: pCrm.fullName,
        uploadedValue: extractedFacts.fullName,
        resolution: "USE_CRM",
      });
    }
  }

  // 2. Nationality check
  if (extractedFacts.nationality && pCrm.nationality) {
    if (extractedFacts.nationality.trim().toLowerCase() !== pCrm.nationality.trim().toLowerCase()) {
      conflicts.push({
        field: "nationality",
        label: "Nationality",
        crmValue: pCrm.nationality,
        uploadedValue: extractedFacts.nationality,
        resolution: "USE_CRM",
      });
    }
  }

  // 3. Passport Number check
  if (extractedFacts.passportNumber && pCrm.passportNumber) {
    if (extractedFacts.passportNumber.trim().toLowerCase() !== pCrm.passportNumber.trim().toLowerCase()) {
      conflicts.push({
        field: "passportNumber",
        label: "Passport Number",
        crmValue: pCrm.passportNumber,
        uploadedValue: extractedFacts.passportNumber,
        resolution: "USE_CRM",
      });
    }
  }

  // 4. IELTS Overall Band Score check
  if (extractedFacts.ieltsScore && tCrm.overallScore) {
    const uScore = extractedFacts.ieltsScore.replace(/[^\d.]/g, "");
    const cScore = tCrm.overallScore.replace(/[^\d.]/g, "");
    if (uScore && cScore && uScore !== cScore) {
      conflicts.push({
        field: "ieltsScore",
        label: "IELTS Overall Band Score",
        crmValue: tCrm.overallScore,
        uploadedValue: extractedFacts.ieltsScore,
        resolution: "USE_CRM",
      });
    }
  }

  // 5. Institution / University of Prior Degree check
  if (extractedFacts.institution && aCrm?.institution) {
    const cleanU = extractedFacts.institution.trim().toLowerCase();
    const cleanC = aCrm.institution.trim().toLowerCase();
    if (cleanU !== cleanC && !cleanU.includes(cleanC) && !cleanC.includes(cleanU)) {
      conflicts.push({
        field: "institution",
        label: "Past Academic Institution",
        crmValue: aCrm.institution,
        uploadedValue: extractedFacts.institution,
        resolution: "USE_CRM",
      });
    }
  }

  // 6. Percentage / Aggregate Score check
  if (extractedFacts.percentage && aCrm?.score) {
    const cleanU = extractedFacts.percentage.replace(/[^\d.]/g, "");
    const cleanC = aCrm.score.replace(/[^\d.]/g, "");
    if (cleanU && cleanC && cleanU !== cleanC) {
      conflicts.push({
        field: "percentage",
        label: "Academic Percentage / Marks",
        crmValue: aCrm.score,
        uploadedValue: extractedFacts.percentage,
        resolution: "USE_CRM",
      });
    }
  }

  // 7. Target University check
  if (extractedFacts.targetUniversity && appCrm?.university) {
    const cleanU = extractedFacts.targetUniversity.trim().toLowerCase();
    const cleanC = appCrm.university.trim().toLowerCase();
    if (cleanU !== cleanC && !cleanU.includes(cleanC) && !cleanC.includes(cleanU)) {
      conflicts.push({
        field: "targetUniversity",
        label: "Target University",
        crmValue: appCrm.university,
        uploadedValue: extractedFacts.targetUniversity,
        resolution: "USE_CRM",
      });
    }
  }

  // 8. Target Course check
  if (extractedFacts.targetCourse && appCrm?.course) {
    const cleanU = extractedFacts.targetCourse.trim().toLowerCase();
    const cleanC = appCrm.course.trim().toLowerCase();
    if (cleanU !== cleanC && !cleanU.includes(cleanC) && !cleanC.includes(cleanU)) {
      conflicts.push({
        field: "targetCourse",
        label: "Intended Course",
        crmValue: appCrm.course,
        uploadedValue: extractedFacts.targetCourse,
        resolution: "USE_CRM",
      });
    }
  }

  return conflicts;
}
