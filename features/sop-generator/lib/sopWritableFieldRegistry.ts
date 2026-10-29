/**
 * features/sop-generator/lib/sopWritableFieldRegistry.ts
 *
 * SOP Copilot Phase 3.1 — Trust Boundary & Writable Field Registry.
 *
 * Core Principle:
 * THE BROWSER MUST NOT DECIDE WHAT MAY BE WRITTEN.
 * GEMINI MUST NOT DECIDE DATABASE FIELD PATHS.
 *
 * This registry acts as the authoritative server-side allowlist for any
 * student / application / visa fields that may eventually be guided
 * and updated through the Copilot in Phase 4.
 *
 * All non-registered or sensitive CRM identity fields are strictly locked.
 */

export type CopilotFieldOwner =
  | "FINANCE"
  | "ACCOMMODATION"
  | "SPONSOR"
  | "INSURANCE"
  | "TRAVEL"
  | "CRM_STUDENT"
  | "ACADEMICS"
  | "DESTINATION"
  | "ALIGNMENT"
  | "APPROVAL"
  | "UNKNOWN_OWNER";

export type CopilotPersistenceOwner =
  | "CRM_STUDENT"
  | "APPLICATION"
  | "SOP_DOCUMENT_CONTEXT"
  | "VISA_APPLICATION_CONTEXT"
  | "FINANCE_CONTEXT"
  | "SPONSOR_CONTEXT"
  | "ACCOMMODATION_CONTEXT"
  | "INSURANCE_CONTEXT"
  | "TRAVEL_CONTEXT"
  | "UNKNOWN_OWNER";

export type CopilotFieldSensitivity =
  | "LOW_SENSITIVITY"
  | "PERSONAL"
  | "FINANCIAL"
  | "TRAVEL"
  | "INSURANCE";

export type CopilotFieldValueType =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "boolean"
  | "enum";

export interface CopilotFieldValidationResult {
  valid: boolean;
  error?: string;
  normalizedValue?: unknown;
}

export interface CopilotWritableFieldDefinition {
  key: string;
  label: string;
  owner: CopilotFieldOwner;
  persistenceOwner: CopilotPersistenceOwner;
  sensitivity: CopilotFieldSensitivity;
  valueType: CopilotFieldValueType;
  inputType: "text" | "number" | "currency" | "date" | "enum";
  writableByCopilot: boolean;
  requiresConfirmation: boolean;
  promptQuestion: string;
  reason: string;
  allowedEnumValues?: string[];
  formatDisplay?: (val: unknown) => string;
  validateAndNormalize: (input: unknown) => CopilotFieldValidationResult;
}

export interface CopilotLockedFieldDefinition {
  key: string;
  label: string;
  owner: CopilotFieldOwner;
  reason: string;
}

// ── Value Normalizers & Validators ───────────────────────────────────────────

export function normalizeText(input: unknown): CopilotFieldValidationResult {
  if (typeof input !== "string" && typeof input !== "number") {
    return { valid: false, error: "Value must be a valid text string." };
  }
  const trimmed = String(input).trim();
  if (!trimmed) {
    return { valid: false, error: "Text value cannot be empty." };
  }
  return { valid: true, normalizedValue: trimmed };
}

export function normalizeCurrency(input: unknown): CopilotFieldValidationResult {
  if (input === null || input === undefined) {
    return { valid: false, error: "Amount cannot be empty." };
  }

  let raw = String(input).trim();
  // Strip currency symbols (₹, $, €, £) and commas
  raw = raw.replace(/[₹$€£,]/g, "").trim();

  // Handle Indian lakh / crore notations e.g. "18.5 lakh", "1.2 crore"
  const lakhMatch = raw.match(/^([0-9.]+)\s*(?:lakh|lac|lakhs)$/i);
  if (lakhMatch) {
    const num = parseFloat(lakhMatch[1]);
    if (!isNaN(num) && num > 0) {
      const computed = Math.round(num * 100_000);
      return { valid: true, normalizedValue: computed.toLocaleString("en-IN") };
    }
  }

  const croreMatch = raw.match(/^([0-9.]+)\s*(?:crore|cr)$/i);
  if (croreMatch) {
    const num = parseFloat(croreMatch[1]);
    if (!isNaN(num) && num > 0) {
      const computed = Math.round(num * 10_000_000);
      return { valid: true, normalizedValue: computed.toLocaleString("en-IN") };
    }
  }

  const num = parseFloat(raw);
  if (isNaN(num) || num < 0) {
    return { valid: false, error: "Invalid currency amount. Please enter a valid non-negative number." };
  }

  return { valid: true, normalizedValue: num.toLocaleString("en-IN") };
}

export function normalizeDate(input: unknown): CopilotFieldValidationResult {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "Date string is required." };
  }

  const trimmed = input.trim();
  // Check ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return { valid: true, normalizedValue: trimmed };
    }
  }

  // Check DD/MM/YYYY
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, "0");
    const month = ddmmyyyy[2].padStart(2, "0");
    const year = ddmmyyyy[3];
    return { valid: true, normalizedValue: `${year}-${month}-${day}` };
  }

  // Parse natural date strings e.g. "12 September 2026"
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return { valid: true, normalizedValue: `${year}-${month}-${day}` };
  }

  return { valid: false, error: "Invalid date format. Expected DD/MM/YYYY or YYYY-MM-DD." };
}

export function normalizeEnum(allowedValues: string[], input: unknown): CopilotFieldValidationResult {
  if (!input || typeof input !== "string") {
    return { valid: false, error: "Value is required." };
  }
  const trimmed = input.trim();
  const matched = allowedValues.find((v) => v.toLowerCase() === trimmed.toLowerCase());
  if (matched) {
    return { valid: true, normalizedValue: matched };
  }
  return {
    valid: false,
    error: `Invalid value "${trimmed}". Allowed options: ${allowedValues.join(", ")}.`,
  };
}

// ── 1. Authoritative Writable Field Registry ─────────────────────────────────

export const COPILOT_WRITABLE_FIELD_REGISTRY: Record<string, CopilotWritableFieldDefinition> = {
  // ── Finance ──
  "finance.bankName": {
    key: "finance.bankName",
    label: "Bank Name",
    owner: "FINANCE",
    persistenceOwner: "SOP_DOCUMENT_CONTEXT",
    sensitivity: "FINANCIAL",
    valueType: "text",
    inputType: "text",
    writableByCopilot: true,
    requiresConfirmation: true,
    promptQuestion: "What is the bank name holding the student's financial funds or statement?",
    reason: "Missing bank statement metadata required by embassy cover letter templates.",
    formatDisplay: (val) => String(val || ""),
    validateAndNormalize: normalizeText,
  },
  "finance.totalFundsAvailable": {
    key: "finance.totalFundsAvailable",
    label: "Total Available Funds",
    owner: "FINANCE",
    persistenceOwner: "SOP_DOCUMENT_CONTEXT",
    sensitivity: "FINANCIAL",
    valueType: "currency",
    inputType: "currency",
    writableByCopilot: true,
    requiresConfirmation: true,
    promptQuestion: "What is the total available funds amount (savings, fixed deposits, or loan)?",
    reason: "Required financial evidence declaration for visa clearance.",
    formatDisplay: (val) => (val ? `₹${val}` : ""),
    validateAndNormalize: normalizeCurrency,
  },
  "finance.availableBalance": {
    key: "finance.availableBalance",
    label: "Available Savings Balance",
    owner: "FINANCE",
    persistenceOwner: "SOP_DOCUMENT_CONTEXT",
    sensitivity: "FINANCIAL",
    valueType: "currency",
    inputType: "currency",
    writableByCopilot: true,
    requiresConfirmation: true,
    promptQuestion: "What is the liquid bank balance available in the account?",
    reason: "Optional liquid asset declaration.",
    formatDisplay: (val) => (val ? `₹${val}` : ""),
    validateAndNormalize: normalizeCurrency,
  },
  "finance.accountHolderName": {
    key: "finance.accountHolderName",
    label: "Account Holder Name",
    owner: "FINANCE",
    persistenceOwner: "SOP_DOCUMENT_CONTEXT",
    sensitivity: "FINANCIAL",
    valueType: "text",
    inputType: "text",
    writableByCopilot: true,
    requiresConfirmation: true,
    promptQuestion: "Whose name is on the bank statement or funding account?",
    reason: "Verifies financial declaration matches sponsor or student identity.",
    formatDisplay: (val) => String(val || ""),
    validateAndNormalize: normalizeText,
  },
  "finance.educationLoanAmount": {
    key: "finance.educationLoanAmount",
    label: "Education Loan Amount",
    owner: "FINANCE",
    persistenceOwner: "SOP_DOCUMENT_CONTEXT",
    sensitivity: "FINANCIAL",
    valueType: "currency",
    inputType: "currency",
    writableByCopilot: true,
    requiresConfirmation: true,
    promptQuestion: "If applicable, what is the sanctioned education loan amount?",
    reason: "Loan documentation backing tuition and living costs.",
    formatDisplay: (val) => (val ? `₹${val}` : ""),
    validateAndNormalize: normalizeCurrency,
  },

  // ── Sponsor ──
  "sponsor.name": {
    key: "sponsor.name",
    label: "Sponsor Name",
    owner: "SPONSOR",
    persistenceOwner: "SOP_DOCUMENT_CONTEXT",
    sensitivity: "PERSONAL",
    valueType: "text",
    inputType: "text",
    writableByCopilot: true,
    requiresConfirmation: true,
    promptQuestion: "What is the full name of the student's primary financial sponsor?",
    reason: "Embassy affidavit of support requirements.",
    formatDisplay: (val) => String(val || ""),
    validateAndNormalize: normalizeText,
  },
  "sponsor.relationship": {
    key: "sponsor.relationship",
    label: "Sponsor Relationship",
    owner: "SPONSOR",
    persistenceOwner: "SOP_DOCUMENT_CONTEXT",
    sensitivity: "PERSONAL",
    valueType: "enum",
    inputType: "enum",
    allowedEnumValues: ["Father", "Mother", "Parents", "Self", "Guardian", "Spouse", "Other"],
    writableByCopilot: true,
    requiresConfirmation: true,
    promptQuestion: "What is the sponsor's relationship to the student?",
    reason: "Embassy relationship declaration.",
    formatDisplay: (val) => String(val || ""),
    validateAndNormalize: (input) =>
      normalizeEnum(["Father", "Mother", "Parents", "Self", "Guardian", "Spouse", "Other"], input),
  },

  // ── Accommodation ──
  "accommodation.name": {
    key: "accommodation.name",
    label: "Accommodation Name / Residence",
    owner: "ACCOMMODATION",
    persistenceOwner: "SOP_DOCUMENT_CONTEXT",
    sensitivity: "LOW_SENSITIVITY",
    valueType: "text",
    inputType: "text",
    writableByCopilot: true,
    requiresConfirmation: true,
    promptQuestion: "What is the name of the hotel, student residence, or apartment for the stay?",
    reason: "Required proof of accommodation declaration for student visas.",
    formatDisplay: (val) => String(val || ""),
    validateAndNormalize: normalizeText,
  },
  "accommodation.fromDate": {
    key: "accommodation.fromDate",
    label: "Accommodation Check-in Date",
    owner: "ACCOMMODATION",
    persistenceOwner: "SOP_DOCUMENT_CONTEXT",
    sensitivity: "LOW_SENSITIVITY",
    valueType: "date",
    inputType: "date",
    writableByCopilot: true,
    requiresConfirmation: true,
    promptQuestion: "What is the confirmed check-in / start date for accommodation?",
    reason: "Embassy stay period verification.",
    formatDisplay: (val) => String(val || ""),
    validateAndNormalize: normalizeDate,
  },
  "accommodation.toDate": {
    key: "accommodation.toDate",
    label: "Accommodation Check-out Date",
    owner: "ACCOMMODATION",
    persistenceOwner: "SOP_DOCUMENT_CONTEXT",
    sensitivity: "LOW_SENSITIVITY",
    valueType: "date",
    inputType: "date",
    writableByCopilot: true,
    requiresConfirmation: true,
    promptQuestion: "What is the check-out / end date for the accommodation reservation?",
    reason: "Embassy stay period verification.",
    formatDisplay: (val) => String(val || ""),
    validateAndNormalize: normalizeDate,
  },
  "accommodation.address": {
    key: "accommodation.address",
    label: "Accommodation Address",
    owner: "ACCOMMODATION",
    persistenceOwner: "SOP_DOCUMENT_CONTEXT",
    sensitivity: "PERSONAL",
    valueType: "text",
    inputType: "text",
    writableByCopilot: true,
    requiresConfirmation: true,
    promptQuestion: "What is the complete street address of the accommodation?",
    reason: "Consular address verification.",
    formatDisplay: (val) => String(val || ""),
    validateAndNormalize: normalizeText,
  },

  // ── Insurance ──
  "insurance.provider": {
    key: "insurance.provider",
    label: "Insurance Provider",
    owner: "INSURANCE",
    persistenceOwner: "SOP_DOCUMENT_CONTEXT",
    sensitivity: "INSURANCE",
    valueType: "text",
    inputType: "text",
    writableByCopilot: true,
    requiresConfirmation: true,
    promptQuestion: "What is the name of the international health & travel insurance provider?",
    reason: "Embassy mandatory insurance declaration.",
    formatDisplay: (val) => String(val || ""),
    validateAndNormalize: normalizeText,
  },
  "insurance.policyNumber": {
    key: "insurance.policyNumber",
    label: "Insurance Policy Number",
    owner: "INSURANCE",
    persistenceOwner: "SOP_DOCUMENT_CONTEXT",
    sensitivity: "INSURANCE",
    valueType: "text",
    inputType: "text",
    writableByCopilot: true,
    requiresConfirmation: true,
    promptQuestion: "What is the insurance policy or certificate reference number?",
    reason: "Embassy verification of policy authenticity.",
    formatDisplay: (val) => String(val || ""),
    validateAndNormalize: normalizeText,
  },

  // ── Travel ──
  "travel.airline": {
    key: "travel.airline",
    label: "Airline Name",
    owner: "TRAVEL",
    persistenceOwner: "SOP_DOCUMENT_CONTEXT",
    sensitivity: "TRAVEL",
    valueType: "text",
    inputType: "text",
    writableByCopilot: true,
    requiresConfirmation: true,
    promptQuestion: "Which airline is booked for travel to the destination country?",
    reason: "Flight itinerary declaration for visa cover letter.",
    formatDisplay: (val) => String(val || ""),
    validateAndNormalize: normalizeText,
  },
  "travel.travelDate": {
    key: "travel.travelDate",
    label: "Travel Date",
    owner: "TRAVEL",
    persistenceOwner: "SOP_DOCUMENT_CONTEXT",
    sensitivity: "TRAVEL",
    valueType: "date",
    inputType: "date",
    writableByCopilot: true,
    requiresConfirmation: true,
    promptQuestion: "What is the planned date of departure / flight?",
    reason: "Embassy itinerary verification.",
    formatDisplay: (val) => String(val || ""),
    validateAndNormalize: normalizeDate,
  },
  "travel.pnr": {
    key: "travel.pnr",
    label: "Flight PNR / Booking Reference",
    owner: "TRAVEL",
    persistenceOwner: "SOP_DOCUMENT_CONTEXT",
    sensitivity: "TRAVEL",
    valueType: "text",
    inputType: "text",
    writableByCopilot: true,
    requiresConfirmation: true,
    promptQuestion: "What is the airline booking reference or PNR number?",
    reason: "Verifies flight reservation exists.",
    formatDisplay: (val) => String(val || ""),
    validateAndNormalize: normalizeText,
  },
};

// ── 2. Authoritative Locked Fields (Non-Writable by Copilot) ──────────────────

export const COPILOT_LOCKED_FIELDS_REGISTRY: Record<string, CopilotLockedFieldDefinition> = {
  // Verified Student CRM Identity
  "student.fullName": {
    key: "student.fullName",
    label: "Student Legal Name",
    owner: "CRM_STUDENT",
    reason: "Verified CRM identity; must be modified through official student registration.",
  },
  "student.dateOfBirth": {
    key: "student.dateOfBirth",
    label: "Date of Birth",
    owner: "CRM_STUDENT",
    reason: "Verified identity document; cannot be altered via chat.",
  },
  "student.passportNumber": {
    key: "student.passportNumber",
    label: "Passport Number",
    owner: "CRM_STUDENT",
    reason: "Verified government travel identity document; cannot be altered via chat.",
  },
  "student.nationality": {
    key: "student.nationality",
    label: "Nationality",
    owner: "CRM_STUDENT",
    reason: "Verified sovereign nationality record.",
  },

  // Verified Academic Background
  "academics.latestQualification": {
    key: "academics.latestQualification",
    label: "Academic Qualification",
    owner: "ACADEMICS",
    reason: "Verified academic transcript record; altering degree requires document re-verification.",
  },
  "academics.institution": {
    key: "academics.institution",
    label: "Previous Institution",
    owner: "ACADEMICS",
    reason: "Verified degree-granting institution record.",
  },
  "academics.percentage": {
    key: "academics.percentage",
    label: "Marks / GPA / Aggregate Score",
    owner: "ACADEMICS",
    reason: "Verified transcript aggregate; cannot be altered through chat.",
  },

  // Standardized Language Tests (IELTS / TOEFL)
  "tests.ielts.overall": {
    key: "tests.ielts.overall",
    label: "IELTS Overall Band Score",
    owner: "CRM_STUDENT",
    reason: "Verified official test report score from CRM; strictly read-only.",
  },
  "tests.ielts.listening": {
    key: "tests.ielts.listening",
    label: "IELTS Listening Subscore",
    owner: "CRM_STUDENT",
    reason: "Verified test subscore.",
  },
  "tests.ielts.reading": {
    key: "tests.ielts.reading",
    label: "IELTS Reading Subscore",
    owner: "CRM_STUDENT",
    reason: "Verified test subscore.",
  },
  "tests.ielts.writing": {
    key: "tests.ielts.writing",
    label: "IELTS Writing Subscore",
    owner: "CRM_STUDENT",
    reason: "Verified test subscore.",
  },
  "tests.ielts.speaking": {
    key: "tests.ielts.speaking",
    label: "IELTS Speaking Subscore",
    owner: "CRM_STUDENT",
    reason: "Verified test subscore.",
  },

  // Authoritative Application Destination
  "destination.country": {
    key: "destination.country",
    label: "Destination Country",
    owner: "DESTINATION",
    reason: "Locked to the selected application / program; switch program in sidebar instead.",
  },
  "destination.university": {
    key: "destination.university",
    label: "Target University",
    owner: "DESTINATION",
    reason: "Locked to the authoritative application record.",
  },
  "destination.course": {
    key: "destination.course",
    label: "Target Course Title",
    owner: "DESTINATION",
    reason: "Locked to the authoritative application record.",
  },

  // Document System Governance
  "alignment.status": {
    key: "alignment.status",
    label: "Academic Alignment Status",
    owner: "ALIGNMENT",
    reason: "Engineered safety decision; requires counsellor confirmation through dedicated alignment banner.",
  },
  "review.docApproved": {
    key: "review.docApproved",
    label: "Document Approval State",
    owner: "APPROVAL",
    reason: "Formal legal sign-off; must be executed using the workspace header button.",
  },
};

// ── 3. Deterministic Validation Issue ID -> Writable Field Key Mapping ────────

export const VALIDATION_ISSUE_TO_FIELD_MAP: Record<string, string> = {
  // Granular 1:1 validation issue mappings
  "finance-bank-missing": "finance.bankName",
  "finance-total-missing": "finance.totalFundsAvailable",
  "sponsor-name-missing": "sponsor.name",
  "accommodation-name-missing": "accommodation.name",
  "accommodation-from-date-missing": "accommodation.fromDate",
  "accommodation-to-date-missing": "accommodation.toDate",
  "insurance-provider-missing": "insurance.provider",
  "insurance-policy-missing": "insurance.policyNumber",
  "travel-airline-missing": "travel.airline",
  "travel-date-missing": "travel.travelDate",
  "travel-pnr-missing": "travel.pnr",

  // Backward-compatibility aliases for legacy compound issue IDs
  "accommodation-dates-missing": "accommodation.fromDate",
  "travel-incomplete": "travel.pnr",
};

/**
 * Checks whether a requested field key is writable through the Copilot.
 * Strictly checks server registry; completely ignores any client-supplied claims.
 * Fields with UNKNOWN_OWNER are strictly non-writable.
 */
export function isFieldWritableByCopilot(fieldKey: string): boolean {
  if (!fieldKey || typeof fieldKey !== "string") return false;
  const def = COPILOT_WRITABLE_FIELD_REGISTRY[fieldKey.trim()];
  if (!def) return false;
  if (def.owner === "UNKNOWN_OWNER" || def.persistenceOwner === "UNKNOWN_OWNER") {
    return false;
  }
  return Boolean(def.writableByCopilot);
}

/**
 * Returns the locked status reason if a field is explicitly forbidden from chat writes.
 */
export function getLockedFieldReason(fieldKey: string): string | null {
  if (!fieldKey || typeof fieldKey !== "string") return null;
  const locked = COPILOT_LOCKED_FIELDS_REGISTRY[fieldKey.trim()];
  return locked ? locked.reason : null;
}

// ── 4. Future Phase 4 Write Proposal Contract ─────────────────────────────────

export interface PendingCopilotFieldUpdate {
  issueId: string;
  fieldKey: string;
  displayLabel: string;
  owner: CopilotFieldOwner;
  persistenceOwner: CopilotPersistenceOwner;
  sensitivity: CopilotFieldSensitivity;
  valueType: CopilotFieldValueType;
  previousValue?: unknown;
  proposedValue: unknown;
  normalizedValue: unknown;
  requiresConfirmation: true;
  staleCheckSnapshot: {
    // Current-value comparison is baseline concurrency check; persisted savedAt timestamp when available
    currentValue: unknown;
    persistedSavedAt?: string;
    versionTimestamp?: string;
  };
  status: "PROPOSED" | "REJECTED" | "CONFIRMED";
}

/**
 * Creates an immutable PendingCopilotFieldUpdate proposal.
 * NOTE: DOES NOT WRITE ANY DATA TO CONTEXT OR DATABASE.
 * Returns null if the field is not writable or validation fails.
 */
export function createFieldUpdateProposal(params: {
  issueId: string;
  fieldKey: string;
  rawValue: unknown;
  currentValue?: unknown;
  persistedSavedAt?: string;
}): { success: true; proposal: PendingCopilotFieldUpdate } | { success: false; error: string } {
  const { issueId, fieldKey, rawValue, currentValue, persistedSavedAt } = params;

  // 1. Verify against server registry
  const def = COPILOT_WRITABLE_FIELD_REGISTRY[fieldKey];
  if (!def || !isFieldWritableByCopilot(fieldKey)) {
    if (COPILOT_LOCKED_FIELDS_REGISTRY[fieldKey]) {
      return {
        success: false,
        error: `Field "${fieldKey}" is locked and cannot be updated through Copilot: ${COPILOT_LOCKED_FIELDS_REGISTRY[fieldKey].reason}`,
      };
    }
    if (def?.persistenceOwner === "UNKNOWN_OWNER" || def?.owner === "UNKNOWN_OWNER") {
      return {
        success: false,
        error: `Field "${fieldKey}" has UNKNOWN_OWNER and is strictly blocked from writes until persistence ownership is resolved.`,
      };
    }
    return {
      success: false,
      error: `Field "${fieldKey}" is not recognized in the server writable field registry.`,
    };
  }

  // 2. Validate and normalize the proposed value
  const valResult = def.validateAndNormalize(rawValue);
  if (!valResult.valid) {
    return {
      success: false,
      error: valResult.error || `Invalid value for ${def.label}.`,
    };
  }

  // 3. Return proposal object (Strictly read-only; no persistence)
  const proposal: PendingCopilotFieldUpdate = {
    issueId,
    fieldKey,
    displayLabel: def.label,
    owner: def.owner,
    persistenceOwner: def.persistenceOwner,
    sensitivity: def.sensitivity,
    valueType: def.valueType,
    previousValue: currentValue,
    proposedValue: rawValue,
    normalizedValue: valResult.normalizedValue,
    requiresConfirmation: true,
    staleCheckSnapshot: {
      currentValue,
      persistedSavedAt,
      versionTimestamp: new Date().toISOString(),
    },
    status: "PROPOSED",
  };

  return { success: true, proposal };
}

/**
 * Verifies whether a pending proposal has become stale by comparing
 * the baseline snapshot current-value against the authoritative active context value.
 */
export function checkProposalConcurrency(
  proposal: PendingCopilotFieldUpdate,
  activeCurrentValue: unknown,
  activePersistedSavedAt?: string
): { isStale: boolean; reason?: string } {
  if (proposal.staleCheckSnapshot.currentValue !== activeCurrentValue) {
    return {
      isStale: true,
      reason: `Conflict: field "${proposal.fieldKey}" was modified since the proposal was created (expected "${String(proposal.staleCheckSnapshot.currentValue)}", found "${String(activeCurrentValue)}").`,
    };
  }

  if (
    proposal.staleCheckSnapshot.persistedSavedAt &&
    activePersistedSavedAt &&
    proposal.staleCheckSnapshot.persistedSavedAt !== activePersistedSavedAt
  ) {
    return {
      isStale: true,
      reason: `Conflict: draft document was saved/updated after this proposal was created.`,
    };
  }

  return { isStale: false };
}
