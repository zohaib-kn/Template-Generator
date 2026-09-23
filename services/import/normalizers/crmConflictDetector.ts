/**
 * services/import/normalizers/crmConflictDetector.ts
 *
 * Compares detected resume facts against verified CRM student records.
 * Identifies discrepancies and prepares conflict items for counsellor decision.
 */

import type { DocumentData } from "@/types";
import type { CrmConflictItem } from "@/features/document-generator/types/import";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";

export function detectCrmConflicts(
  uploadedData: DocumentData,
  crmProfile?: NormalizedStudentProfile | null
): CrmConflictItem[] {
  if (!crmProfile) return [];

  const conflicts: CrmConflictItem[] = [];
  const pUploaded = uploadedData.personal || {};
  const pCrm = crmProfile.personal || {};

  // 1. Email check
  if (pUploaded.email && pCrm.email) {
    const uEmail = pUploaded.email.trim().toLowerCase();
    const cEmail = pCrm.email.trim().toLowerCase();
    if (uEmail !== cEmail) {
      conflicts.push({
        field: "email",
        label: "Email Address",
        crmValue: pCrm.email,
        uploadedValue: pUploaded.email,
        resolution: "USE_CRM",
      });
    }
  }

  // 2. Phone check
  if (pUploaded.phone && pCrm.phone) {
    const cleanU = pUploaded.phone.replace(/\D/g, "");
    const cleanC = pCrm.phone.replace(/\D/g, "");
    if (cleanU && cleanC && !cleanU.endsWith(cleanC) && !cleanC.endsWith(cleanU)) {
      conflicts.push({
        field: "phone",
        label: "Phone Number",
        crmValue: pCrm.phone,
        uploadedValue: pUploaded.phone,
        resolution: "USE_CRM",
      });
    }
  }

  // 3. Full Name check
  if (pUploaded.fullName && pCrm.fullName) {
    const cleanU = pUploaded.fullName.trim().toLowerCase();
    const cleanC = pCrm.fullName.trim().toLowerCase();
    if (cleanU !== cleanC) {
      conflicts.push({
        field: "fullName",
        label: "Full Name",
        crmValue: pCrm.fullName,
        uploadedValue: pUploaded.fullName,
        resolution: "USE_CRM",
      });
    }
  }

  // 4. Nationality check
  if (pUploaded.nationality && pCrm.nationality) {
    if (pUploaded.nationality.trim().toLowerCase() !== pCrm.nationality.trim().toLowerCase()) {
      conflicts.push({
        field: "nationality",
        label: "Nationality",
        crmValue: pCrm.nationality,
        uploadedValue: pUploaded.nationality,
        resolution: "USE_CRM",
      });
    }
  }

  // 5. Passport Number check
  if (pUploaded.passportNumber && pCrm.passportNumber) {
    if (pUploaded.passportNumber.trim().toLowerCase() !== pCrm.passportNumber.trim().toLowerCase()) {
      conflicts.push({
        field: "passportNumber",
        label: "Passport Number",
        crmValue: pCrm.passportNumber,
        uploadedValue: pUploaded.passportNumber,
        resolution: "USE_CRM",
      });
    }
  }

  // 6. English Test / IELTS Score check
  const uEng = uploadedData.englishCertificate?.score;
  const cEng = crmProfile.tests?.english?.overallScore;
  if (uEng && cEng) {
    if (uEng.trim() !== cEng.trim()) {
      conflicts.push({
        field: "englishScore",
        label: "English / IELTS Overall Score",
        crmValue: cEng,
        uploadedValue: uEng,
        resolution: "USE_CRM",
      });
    }
  }

  return conflicts;
}
