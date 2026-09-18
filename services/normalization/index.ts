/**
 * services/normalization/index.ts
 *
 * Public surface for student normalization and domain projection adapters.
 */

export { mapCrmToNormalizedStudent } from "./mapCrmToNormalizedStudent";
export type { MapCrmOptions } from "./mapCrmToNormalizedStudent";

export { mapNormalizedToResume } from "./mapNormalizedToResume";
export type { ResumeProjectionResult } from "./mapNormalizedToResume";

export { mapNormalizedToSop } from "./mapNormalizedToSop";
