/**
 * Mock verified destination data for SOP Generator Phase 1.
 *
 * In production this would come from a verified database of universities
 * and their home countries. Here we use a small static map to demonstrate
 * the university-country cross-check validation logic.
 *
 * Structure: universityKey → { country, city, verified }
 *
 * The key is a simplified lowercase slug of the university name.
 */

export interface VerifiedDestination {
  canonicalName: string;
  country: string;
  city: string;
  verified: boolean;
}

/**
 * Lowercase slug → verified destination entry.
 *
 * Used by `validateDocumentContext()` to detect university-country mismatches.
 */
export const verifiedDestinations: Record<string, VerifiedDestination> = {
  "university of padua": {
    canonicalName: "University of Padua (Università degli Studi di Padova)",
    country: "Italy",
    city: "Padova",
    verified: true,
  },
  "università degli studi di padova": {
    canonicalName: "University of Padua (Università degli Studi di Padova)",
    country: "Italy",
    city: "Padova",
    verified: true,
  },
  "politecnico di milano": {
    canonicalName: "Politecnico di Milano",
    country: "Italy",
    city: "Milan",
    verified: true,
  },
  "university of bologna": {
    canonicalName: "University of Bologna (Università di Bologna)",
    country: "Italy",
    city: "Bologna",
    verified: true,
  },
  "sapienza university of rome": {
    canonicalName: "Sapienza University of Rome",
    country: "Italy",
    city: "Rome",
    verified: true,
  },
  "university of manchester": {
    canonicalName: "The University of Manchester",
    country: "United Kingdom",
    city: "Manchester",
    verified: true,
  },
  "imperial college london": {
    canonicalName: "Imperial College London",
    country: "United Kingdom",
    city: "London",
    verified: true,
  },
  "tu munich": {
    canonicalName: "Technical University of Munich",
    country: "Germany",
    city: "Munich",
    verified: true,
  },
  "technical university of munich": {
    canonicalName: "Technical University of Munich",
    country: "Germany",
    city: "Munich",
    verified: true,
  },
};

/**
 * Look up a university by name (case-insensitive, partial match allowed).
 * Returns the first matching entry, or null if not found.
 */
export function lookupUniversity(
  universityName: string
): VerifiedDestination | null {
  const normalized = universityName.toLowerCase().trim();

  // Exact key match first
  if (verifiedDestinations[normalized]) {
    return verifiedDestinations[normalized];
  }

  // Partial match fallback
  const partialKey = Object.keys(verifiedDestinations).find(
    (key) => normalized.includes(key) || key.includes(normalized)
  );

  return partialKey ? verifiedDestinations[partialKey] : null;
}
