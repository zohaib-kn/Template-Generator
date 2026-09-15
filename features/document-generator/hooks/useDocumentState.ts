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
import type { Dispatch } from "react";
import type { DocumentAction } from "../state/documentReducer";

/**
 * Builds the add/update/remove trio for one repeatable list section, so a
 * new section only needs one call here instead of three hand-written
 * dispatchers (mirrors the generic ADD/UPDATE/REMOVE_LIST_ITEM reducer cases).
 */
function listFieldActions<K extends string, E extends { id: string }>(
  dispatch: Dispatch<DocumentAction>,
  key: K
) {
  return {
    add: (entry: Omit<E, "id"> = {} as Omit<E, "id">) =>
      dispatch({
        type: "ADD_LIST_ITEM",
        key: key as never,
        payload: { ...entry, id: generateId() } as never,
      }),
    update: (id: string, patch: Partial<E>) =>
      dispatch({
        type: "UPDATE_LIST_ITEM",
        key: key as never,
        payload: { id, patch } as never,
      }),
    remove: (id: string) =>
      dispatch({ type: "REMOVE_LIST_ITEM", key: key as never, payload: id }),
  };
}

/**
 * Primary hook for consuming and updating DocumentData.
 *
 * Returns the current document data plus a set of typed helper functions
 * that dispatch the correct actions. Forms should use these helpers rather
 * than calling dispatch directly.
 */
export function useDocumentState() {
  const { data, dispatch } = useDocumentContext();

  const education = listFieldActions<"education", EducationEntry>(dispatch, "education");
  const recommendations = listFieldActions<"recommendations", RecommendationEntry>(
    dispatch,
    "recommendations"
  );
  const languages = listFieldActions<"languages", LanguageEntry>(dispatch, "languages");
  const skills = listFieldActions<"skills", SkillEntry>(dispatch, "skills");
  const hobbies = listFieldActions<"hobbies", HobbyEntry>(dispatch, "hobbies");
  const volunteering = listFieldActions<"volunteering", VolunteeringEntry>(
    dispatch,
    "volunteering"
  );

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
    addEducation: () => education.add(),
    updateEducation: (id: string, patch: Partial<EducationEntry>) =>
      education.update(id, patch),
    removeEducation: (id: string) => education.remove(id),

    // --- Recommendations ----------------------------------------------------
    addRecommendation: () => recommendations.add(),
    updateRecommendation: (id: string, patch: Partial<RecommendationEntry>) =>
      recommendations.update(id, patch),
    removeRecommendation: (id: string) => recommendations.remove(id),

    // --- Languages ----------------------------------------------------------
    addLanguage: () => languages.add(),
    updateLanguage: (id: string, patch: Partial<LanguageEntry>) =>
      languages.update(id, patch),
    removeLanguage: (id: string) => languages.remove(id),

    // --- Skills -------------------------------------------------------------
    addSkill: () => skills.add(),
    updateSkill: (id: string, patch: Partial<SkillEntry>) => skills.update(id, patch),
    removeSkill: (id: string) => skills.remove(id),

    // --- Hobbies ------------------------------------------------------------
    addHobby: () => hobbies.add(),
    updateHobby: (id: string, patch: Partial<HobbyEntry>) => hobbies.update(id, patch),
    removeHobby: (id: string) => hobbies.remove(id),

    // --- Volunteering -------------------------------------------------------
    addVolunteering: () => volunteering.add(),
    updateVolunteering: (id: string, patch: Partial<VolunteeringEntry>) =>
      volunteering.update(id, patch),
    removeVolunteering: (id: string) => volunteering.remove(id),

    // --- Reset --------------------------------------------------------------
    reset: () => dispatch({ type: "RESET" }),
  };
}
