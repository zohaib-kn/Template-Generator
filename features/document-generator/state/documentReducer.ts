import type {
  DocumentData,
  EducationEntry,
  EnglishCertificate,
  HobbyEntry,
  LanguageEntry,
  PersonalDetails,
  RecommendationEntry,
  SkillEntry,
  VolunteeringEntry,
} from "@/types";
import { createEmptyDocumentData } from "../utils/documentDefaults";

// ---------------------------------------------------------------------------
// Action types
// ---------------------------------------------------------------------------

export type DocumentAction =
  // Singleton fields
  | { type: "SET_PERSONAL"; payload: Partial<PersonalDetails> }
  | { type: "SET_ABOUT_ME"; payload: string }
  | { type: "SET_DECLARATION"; payload: string }
  | { type: "SET_ENGLISH_CERTIFICATE"; payload: Partial<EnglishCertificate> }
  // Education
  | { type: "ADD_EDUCATION"; payload: EducationEntry }
  | { type: "UPDATE_EDUCATION"; payload: { id: string; patch: Partial<EducationEntry> } }
  | { type: "REMOVE_EDUCATION"; payload: string }
  // Recommendations
  | { type: "ADD_RECOMMENDATION"; payload: RecommendationEntry }
  | { type: "UPDATE_RECOMMENDATION"; payload: { id: string; patch: Partial<RecommendationEntry> } }
  | { type: "REMOVE_RECOMMENDATION"; payload: string }
  // Languages
  | { type: "ADD_LANGUAGE"; payload: LanguageEntry }
  | { type: "UPDATE_LANGUAGE"; payload: { id: string; patch: Partial<LanguageEntry> } }
  | { type: "REMOVE_LANGUAGE"; payload: string }
  // Skills
  | { type: "ADD_SKILL"; payload: SkillEntry }
  | { type: "UPDATE_SKILL"; payload: { id: string; patch: Partial<SkillEntry> } }
  | { type: "REMOVE_SKILL"; payload: string }
  // Hobbies
  | { type: "ADD_HOBBY"; payload: HobbyEntry }
  | { type: "UPDATE_HOBBY"; payload: { id: string; patch: Partial<HobbyEntry> } }
  | { type: "REMOVE_HOBBY"; payload: string }
  // Volunteering
  | { type: "ADD_VOLUNTEERING"; payload: VolunteeringEntry }
  | { type: "UPDATE_VOLUNTEERING"; payload: { id: string; patch: Partial<VolunteeringEntry> } }
  | { type: "REMOVE_VOLUNTEERING"; payload: string }
  // Reset
  | { type: "RESET" };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function documentReducer(
  state: DocumentData,
  action: DocumentAction
): DocumentData {
  switch (action.type) {
    // --- Singleton fields ---------------------------------------------------
    case "SET_PERSONAL":
      return { ...state, personal: { ...state.personal, ...action.payload } };

    case "SET_ABOUT_ME":
      return { ...state, aboutMe: action.payload };

    case "SET_DECLARATION":
      return { ...state, declaration: action.payload };

    case "SET_ENGLISH_CERTIFICATE":
      return {
        ...state,
        englishCertificate: { ...state.englishCertificate, ...action.payload },
      };

    // --- Education ----------------------------------------------------------
    case "ADD_EDUCATION":
      return {
        ...state,
        education: [...(state.education ?? []), action.payload],
      };

    case "UPDATE_EDUCATION":
      return {
        ...state,
        education: (state.education ?? []).map((e) =>
          e.id === action.payload.id ? { ...e, ...action.payload.patch } : e
        ),
      };

    case "REMOVE_EDUCATION":
      return {
        ...state,
        education: (state.education ?? []).filter((e) => e.id !== action.payload),
      };

    // --- Recommendations ----------------------------------------------------
    case "ADD_RECOMMENDATION":
      return {
        ...state,
        recommendations: [...(state.recommendations ?? []), action.payload],
      };

    case "UPDATE_RECOMMENDATION":
      return {
        ...state,
        recommendations: (state.recommendations ?? []).map((r) =>
          r.id === action.payload.id ? { ...r, ...action.payload.patch } : r
        ),
      };

    case "REMOVE_RECOMMENDATION":
      return {
        ...state,
        recommendations: (state.recommendations ?? []).filter(
          (r) => r.id !== action.payload
        ),
      };

    // --- Languages ----------------------------------------------------------
    case "ADD_LANGUAGE":
      return {
        ...state,
        languages: [...(state.languages ?? []), action.payload],
      };

    case "UPDATE_LANGUAGE":
      return {
        ...state,
        languages: (state.languages ?? []).map((l) =>
          l.id === action.payload.id ? { ...l, ...action.payload.patch } : l
        ),
      };

    case "REMOVE_LANGUAGE":
      return {
        ...state,
        languages: (state.languages ?? []).filter((l) => l.id !== action.payload),
      };

    // --- Skills -------------------------------------------------------------
    case "ADD_SKILL":
      return { ...state, skills: [...(state.skills ?? []), action.payload] };

    case "UPDATE_SKILL":
      return {
        ...state,
        skills: (state.skills ?? []).map((s) =>
          s.id === action.payload.id ? { ...s, ...action.payload.patch } : s
        ),
      };

    case "REMOVE_SKILL":
      return {
        ...state,
        skills: (state.skills ?? []).filter((s) => s.id !== action.payload),
      };

    // --- Hobbies ------------------------------------------------------------
    case "ADD_HOBBY":
      return { ...state, hobbies: [...(state.hobbies ?? []), action.payload] };

    case "UPDATE_HOBBY":
      return {
        ...state,
        hobbies: (state.hobbies ?? []).map((h) =>
          h.id === action.payload.id ? { ...h, ...action.payload.patch } : h
        ),
      };

    case "REMOVE_HOBBY":
      return {
        ...state,
        hobbies: (state.hobbies ?? []).filter((h) => h.id !== action.payload),
      };

    // --- Volunteering -------------------------------------------------------
    case "ADD_VOLUNTEERING":
      return {
        ...state,
        volunteering: [...(state.volunteering ?? []), action.payload],
      };

    case "UPDATE_VOLUNTEERING":
      return {
        ...state,
        volunteering: (state.volunteering ?? []).map((v) =>
          v.id === action.payload.id ? { ...v, ...action.payload.patch } : v
        ),
      };

    case "REMOVE_VOLUNTEERING":
      return {
        ...state,
        volunteering: (state.volunteering ?? []).filter(
          (v) => v.id !== action.payload
        ),
      };

    // --- Reset --------------------------------------------------------------
    case "RESET":
      return createEmptyDocumentData();

    default:
      return state;
  }
}
