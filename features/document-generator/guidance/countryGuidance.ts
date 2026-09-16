/**
 * guidance/countryGuidance.ts
 *
 * Broad destination-country guidance configuration.
 *
 * IMPORTANT:
 * - These are general CV preparation notes only.
 * - They are NOT official admission requirements from any university or country.
 * - Country notes are merged into GuidanceResult.suggestions.
 * - priorityOverrides raise/lower a section's priority for a specific country
 *   relative to the course-category baseline.
 */

import type { CountryConfig, DestinationCountry } from "./types";

export const countryGuidance: Record<DestinationCountry, CountryConfig> = {

  "United Kingdom": {
    suggestions: [
      "UK universities generally value academic suitability for the intended subject.",
      "Subject-related interests, reading, and academic projects demonstrate genuine commitment.",
      "Personal statement context: your academic direction and genuine motivation matter.",
      "Independent learning and research relevant to your course are well regarded.",
    ],
    priorityOverrides: {
      academicInterests: "highly-relevant",
      academicProjects: "highly-relevant",
    },
  },

  "Canada": {
    suggestions: [
      "Canadian universities generally value a well-rounded profile.",
      "Academic achievement alongside leadership and extracurricular involvement is valued.",
      "Volunteering and community engagement are commonly recognised.",
      "Course-relevant preparation and genuine interests strengthen applications.",
    ],
    priorityOverrides: {
      leadershipActivities: "highly-relevant",
      volunteering: "recommended",
    },
  },

  "Australia": {
    suggestions: [
      "Australian universities primarily focus on academic qualifications and preparation.",
      "Course-relevant skills, projects, and qualifications are the primary focus.",
      "Extracurricular information provides useful supporting context.",
      "Clear academic direction relevant to the chosen programme is valued.",
    ],
    priorityOverrides: {},
  },

  "Italy": {
    suggestions: [
      "Academic background and course preparation are the primary focus.",
      "Qualification and language information (Italian or English) should be clearly presented.",
      "Relevant academic interests and projects support the application.",
      "Verify language requirements for your specific programme — Italian or English-medium programmes have different needs.",
    ],
    priorityOverrides: {
      languages: "highly-relevant",
    },
  },

  "France": {
    suggestions: [
      "Academic record and academic direction are central.",
      "Genuine motivation and relevance to the chosen programme matter.",
      "Relevant projects and interests demonstrate subject readiness.",
      "French language preparation may be important depending on the programme — verify with your target institution.",
    ],
    priorityOverrides: {
      languages: "highly-relevant",
    },
  },

  "Poland": {
    suggestions: [
      "Academic qualifications and course preparation are the primary focus.",
      "Language qualification (Polish or English, depending on programme) should be clearly presented.",
      "Relevant academic projects and skills support the application.",
      "Verify language of instruction and specific entry requirements with your target institution.",
    ],
    priorityOverrides: {
      languages: "highly-relevant",
    },
  },

  "Georgia": {
    suggestions: [
      "Academic qualifications and course preparation are the primary focus.",
      "Language qualifications (English or Georgian depending on programme) are important.",
      "Relevant academic background and genuine interests support the application.",
      "Verify specific entry requirements with your target institution.",
    ],
    priorityOverrides: {
      languages: "highly-relevant",
    },
  },

  "Kazakhstan": {
    suggestions: [
      "Academic qualifications and course preparation are the primary focus.",
      "Language qualification (Russian, Kazakh, or English depending on programme) should be clearly stated.",
      "Relevant academic preparation and genuine interests support the application.",
      "Verify specific entry requirements and language requirements with your target institution.",
    ],
    priorityOverrides: {
      languages: "highly-relevant",
    },
  },

  "Other": {
    suggestions: [
      "Academic qualifications and preparation remain the central focus for most destinations.",
      "Check the specific requirements of your target country and institution carefully.",
      "Language qualifications may be an important requirement depending on the country.",
    ],
    priorityOverrides: {},
  },
};
