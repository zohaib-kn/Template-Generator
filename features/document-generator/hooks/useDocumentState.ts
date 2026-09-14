"use client";

import type {
  EducationEntry,
  EnglishCertificate,
  HobbyEntry,
  LanguageEntry,
  PersonalDetails,
  RecommendationEntry,
  SkillEntry,
  VolunteeringEntry,
} from "@/types";
import { generateId } from "@/lib/generateId";
import { useDocumentContext } from "../state/DocumentContext";

/**
 * Primary hook for consuming and updating DocumentData.
 *
 * Returns the current document data plus a set of typed helper functions
 * that dispatch the correct actions. Forms should use these helpers rather
 * than calling dispatch directly.
 */
export function useDocumentState() {
  const { data, dispatch } = useDocumentContext();

  return {
    data,

    // --- Personal -----------------------------------------------------------
    setPersonal: (patch: Partial<PersonalDetails>) =>
      dispatch({ type: "SET_PERSONAL", payload: patch }),

    // --- About Me -----------------------------------------------------------
    setAboutMe: (text: string) =>
      dispatch({ type: "SET_ABOUT_ME", payload: text }),

    // --- Declaration --------------------------------------------------------
    setDeclaration: (text: string) =>
      dispatch({ type: "SET_DECLARATION", payload: text }),

    // --- English Certificate ------------------------------------------------
    setEnglishCertificate: (patch: Partial<EnglishCertificate>) =>
      dispatch({ type: "SET_ENGLISH_CERTIFICATE", payload: patch }),

    // --- Education ----------------------------------------------------------
    addEducation: () =>
      dispatch({
        type: "ADD_EDUCATION",
        payload: { id: generateId() },
      }),
    updateEducation: (id: string, patch: Partial<EducationEntry>) =>
      dispatch({ type: "UPDATE_EDUCATION", payload: { id, patch } }),
    removeEducation: (id: string) =>
      dispatch({ type: "REMOVE_EDUCATION", payload: id }),

    // --- Recommendations ----------------------------------------------------
    addRecommendation: () =>
      dispatch({
        type: "ADD_RECOMMENDATION",
        payload: { id: generateId() },
      }),
    updateRecommendation: (id: string, patch: Partial<RecommendationEntry>) =>
      dispatch({ type: "UPDATE_RECOMMENDATION", payload: { id, patch } }),
    removeRecommendation: (id: string) =>
      dispatch({ type: "REMOVE_RECOMMENDATION", payload: id }),

    // --- Languages ----------------------------------------------------------
    addLanguage: () =>
      dispatch({
        type: "ADD_LANGUAGE",
        payload: { id: generateId() },
      }),
    updateLanguage: (id: string, patch: Partial<LanguageEntry>) =>
      dispatch({ type: "UPDATE_LANGUAGE", payload: { id, patch } }),
    removeLanguage: (id: string) =>
      dispatch({ type: "REMOVE_LANGUAGE", payload: id }),

    // --- Skills -------------------------------------------------------------
    addSkill: () =>
      dispatch({
        type: "ADD_SKILL",
        payload: { id: generateId() },
      }),
    updateSkill: (id: string, patch: Partial<SkillEntry>) =>
      dispatch({ type: "UPDATE_SKILL", payload: { id, patch } }),
    removeSkill: (id: string) =>
      dispatch({ type: "REMOVE_SKILL", payload: id }),

    // --- Hobbies ------------------------------------------------------------
    addHobby: () =>
      dispatch({
        type: "ADD_HOBBY",
        payload: { id: generateId() },
      }),
    updateHobby: (id: string, patch: Partial<HobbyEntry>) =>
      dispatch({ type: "UPDATE_HOBBY", payload: { id, patch } }),
    removeHobby: (id: string) =>
      dispatch({ type: "REMOVE_HOBBY", payload: id }),

    // --- Volunteering -------------------------------------------------------
    addVolunteering: () =>
      dispatch({
        type: "ADD_VOLUNTEERING",
        payload: { id: generateId() },
      }),
    updateVolunteering: (id: string, patch: Partial<VolunteeringEntry>) =>
      dispatch({ type: "UPDATE_VOLUNTEERING", payload: { id, patch } }),
    removeVolunteering: (id: string) =>
      dispatch({ type: "REMOVE_VOLUNTEERING", payload: id }),

    // --- Reset --------------------------------------------------------------
    reset: () => dispatch({ type: "RESET" }),
  };
}
