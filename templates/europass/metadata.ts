import type { TemplateDefinition } from "@/types";

/**
 * TemplateDefinition for the Europass v1 template.
 *
 * This object is the authoritative source of metadata for this template.
 * The renderer uses `id` + `version` to resolve the correct component.
 */
export const europassMetadata: TemplateDefinition = {
  id: "europass",
  version: "1",
  displayName: "Europass",
  description:
    "Classic two-column A4 CV layout. Navy sidebar with profile photo and contact details, main area with all document sections.",
  thumbnailUrl: undefined, // will be added as a static asset in a later phase
  supportedSections: [
    "personal",
    "aboutMe",
    "education",
    "recommendations",
    "languages",
    "englishCertificate",
    "skills",
    "hobbies",
    "volunteering",
    "declaration",
  ],
};
