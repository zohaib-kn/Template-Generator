/**
 * services/ai/documents/documentRouter.ts
 *
 * Directs incoming generation requests to the corresponding document profile,
 * prompt builder, planning blueprint, and validation rules.
 *
 * Supported types:
 * - VISA_COVER_LETTER
 * - SOP
 * - LOR
 *
 * Explicitly rejects unsupported types without making unnecessary Gemini calls.
 */

import { DocumentType, isValidDocumentType, SUPPORTED_DOCUMENT_TYPES } from "../config/documentTypes";
import { DocumentProfile, getDocumentProfile } from "../config/documentProfiles";
import { CanonicalDocumentData } from "./canonicalDocument";
import { normalizeDocumentData, NormalizationInput } from "./normalizeDocumentData";
import { buildDocumentPlan, DocumentPlan } from "./documentPlanner";

export interface RoutedDocument {
  documentType: DocumentType;
  profile: DocumentProfile;
  canonicalData: CanonicalDocumentData;
  plan: DocumentPlan;
}

export function routeDocumentRequest(input: NormalizationInput): RoutedDocument {
  const typeCandidate = input.documentType || input.type;

  if (!isValidDocumentType(typeCandidate)) {
    throw new Error(
      `Unsupported document type: "${String(typeCandidate)}". Supported types are: ${SUPPORTED_DOCUMENT_TYPES.join(
        ", "
      )}.`
    );
  }

  const documentType: DocumentType = typeCandidate;
  const profile = getDocumentProfile(documentType);
  const canonicalData = normalizeDocumentData(input);
  const plan = buildDocumentPlan(canonicalData, profile);

  return {
    documentType,
    profile,
    canonicalData,
    plan,
  };
}
