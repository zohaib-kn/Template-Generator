/**
 * profileSuggestions/countrySuggestions.ts
 *
 * Secondary suggestion configuration keyed by DestinationCountry.
 *
 * IMPORTANT:
 * - Country suggestions are SECONDARY — they supplement course suggestions.
 * - They are NOT official country or university preferences.
 * - They appear after course-based suggestions and carry lower priority.
 * - Use neutral UI language: "Additional interest ideas based on destination".
 * - NEVER claim: "University X prefers these activities".
 */

import type { DestinationCountry } from "../types";
import type { CountrySuggestionConfig } from "./profileSuggestions.types";

export const countrySuggestions: Record<DestinationCountry, CountrySuggestionConfig> = {

  "United Kingdom": {
    interests: [
      { label: "Reading", priority: "low" },
      { label: "Debate", priority: "low" },
      { label: "Current Affairs", priority: "low" },
      { label: "Volunteering", priority: "low" },
      { label: "Football", priority: "low" },
      { label: "Theatre", priority: "low" },
      { label: "Creative Writing", priority: "low" },
      { label: "Photography", priority: "low" },
    ],
    activities: [
      { label: "Subject Societies", priority: "low" },
      { label: "Volunteering", priority: "low" },
      { label: "Debate", priority: "low" },
      { label: "Independent Academic Projects", priority: "low" },
      { label: "Student Clubs", priority: "low" },
    ],
  },

  "Canada": {
    interests: [
      { label: "Volunteering", priority: "low" },
      { label: "Community Activities", priority: "low" },
      { label: "Team Sports", priority: "low" },
      { label: "Hiking", priority: "low" },
      { label: "Environmental Activities", priority: "low" },
      { label: "Photography", priority: "low" },
      { label: "Reading", priority: "low" },
    ],
    activities: [
      { label: "Community Service", priority: "low" },
      { label: "Student Organisations", priority: "low" },
      { label: "Environmental Projects", priority: "low" },
      { label: "Team Activities", priority: "low" },
      { label: "Volunteering", priority: "low" },
    ],
  },

  "Australia": {
    interests: [
      { label: "Sports", priority: "low" },
      { label: "Swimming", priority: "low" },
      { label: "Fitness", priority: "low" },
      { label: "Hiking", priority: "low" },
      { label: "Outdoor Activities", priority: "low" },
      { label: "Volunteering", priority: "low" },
      { label: "Photography", priority: "low" },
    ],
    activities: [
      { label: "Community Activities", priority: "low" },
      { label: "Team Sports", priority: "low" },
      { label: "Volunteering", priority: "low" },
      { label: "Student Clubs", priority: "low" },
      { label: "Outdoor / Environmental Activities", priority: "low" },
    ],
  },

  "Italy": {
    interests: [
      { label: "Art", priority: "low" },
      { label: "History", priority: "low" },
      { label: "Architecture", priority: "low" },
      { label: "Football", priority: "low" },
      { label: "Photography", priority: "low" },
      { label: "Culture", priority: "low" },
      { label: "Cooking", priority: "low" },
      { label: "Music", priority: "low" },
    ],
    activities: [
      { label: "Cultural Activities", priority: "low" },
      { label: "Language Learning", priority: "low" },
      { label: "Academic Projects", priority: "low" },
      { label: "Student Associations", priority: "low" },
      { label: "Volunteering", priority: "low" },
    ],
  },

  "France": {
    interests: [
      { label: "Literature", priority: "low" },
      { label: "Art", priority: "low" },
      { label: "Cinema", priority: "low" },
      { label: "Photography", priority: "low" },
      { label: "Culture", priority: "low" },
      { label: "Music", priority: "low" },
      { label: "Cooking", priority: "low" },
    ],
    activities: [
      { label: "Cultural Activities", priority: "low" },
      { label: "Language Learning", priority: "low" },
      { label: "Academic Projects", priority: "low" },
      { label: "Student Associations", priority: "low" },
      { label: "Volunteering", priority: "low" },
    ],
  },

  "Poland": {
    interests: [
      { label: "Reading", priority: "low" },
      { label: "Technology", priority: "low" },
      { label: "Chess", priority: "low" },
      { label: "Football", priority: "low" },
      { label: "Music", priority: "low" },
      { label: "Photography", priority: "low" },
      { label: "Travel", priority: "low" },
    ],
    activities: [
      { label: "Technical Clubs", priority: "low" },
      { label: "Student Organisations", priority: "low" },
      { label: "Volunteering", priority: "low" },
      { label: "Academic Projects", priority: "low" },
      { label: "Language Learning", priority: "low" },
    ],
  },

  "Georgia": {
    interests: [
      { label: "Hiking", priority: "low" },
      { label: "Travel", priority: "low" },
      { label: "Photography", priority: "low" },
      { label: "Football", priority: "low" },
      { label: "Music", priority: "low" },
      { label: "Cultural Activities", priority: "low" },
      { label: "Cooking", priority: "low" },
    ],
    activities: [
      { label: "Community Activities", priority: "low" },
      { label: "Student Clubs", priority: "low" },
      { label: "Cultural Activities", priority: "low" },
      { label: "Language Learning", priority: "low" },
      { label: "Volunteering", priority: "low" },
    ],
  },

  "Kazakhstan": {
    interests: [
      { label: "Chess", priority: "low" },
      { label: "Sports", priority: "low" },
      { label: "Technology", priority: "low" },
      { label: "Hiking", priority: "low" },
      { label: "Reading", priority: "low" },
      { label: "Music", priority: "low" },
      { label: "Community Activities", priority: "low" },
    ],
    activities: [
      { label: "Academic Clubs", priority: "low" },
      { label: "Technical Activities", priority: "low" },
      { label: "Sports", priority: "low" },
      { label: "Community Activities", priority: "low" },
      { label: "Language Learning", priority: "low" },
    ],
  },

  "Other": {
    interests: [
      { label: "Reading", priority: "low" },
      { label: "Sports", priority: "low" },
      { label: "Community Activities", priority: "low" },
      { label: "Volunteering", priority: "low" },
    ],
    activities: [
      { label: "Student Clubs", priority: "low" },
      { label: "Volunteering", priority: "low" },
      { label: "Community Activities", priority: "low" },
    ],
  },
};
