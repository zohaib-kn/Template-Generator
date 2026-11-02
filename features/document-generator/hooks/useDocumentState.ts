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
  AcademicInterest,
  AcademicProject,
  Achievement,
  LeadershipActivity,
  Certification,
  InternshipEntry,
} from "@/types";
import { generateId } from "@/lib/generateId";
import { DocumentContext } from "../state/DocumentContext";
import { createEmptyDocumentData } from "../utils/documentDefaults";
import { useCallback, useContext, type Dispatch } from "react";
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
    add: (entry?: Omit<E, "id"> | unknown) => {
      const data =
        entry && typeof entry === "object" && !("nativeEvent" in entry)
          ? (entry as Omit<E, "id">)
          : ({} as Omit<E, "id">);
      return dispatch({
        type: "ADD_LIST_ITEM",
        key: key as never,
        payload: { ...data, id: generateId() } as never,
      });
    },
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
  const ctx = useContext(DocumentContext);
  const data = ctx?.data ?? createEmptyDocumentData();
  const dispatch = ctx?.dispatch ?? ((() => {}) as Dispatch<DocumentAction>);

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
  const academicInterests = listFieldActions<"academicInterests", AcademicInterest>(
    dispatch,
    "academicInterests"
  );
  const academicProjects = listFieldActions<"academicProjects", AcademicProject>(
    dispatch,
    "academicProjects"
  );
  const achievements = listFieldActions<"achievements", Achievement>(
    dispatch,
    "achievements"
  );
  const leadershipActivities = listFieldActions<"leadershipActivities", LeadershipActivity>(
    dispatch,
    "leadershipActivities"
  );
  const certifications = listFieldActions<"certifications", Certification>(
    dispatch,
    "certifications"
  );
  const internships = listFieldActions<"internships", InternshipEntry>(
    dispatch,
    "internships"
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

    // --- Mother Tongue -------------------------------------------------------
    setMotherTongue: (text: string) =>
      dispatch({ type: "SET_MOTHER_TONGUE", payload: text }),

    // --- English Certificate ------------------------------------------------
    setEnglishCertificate: (patch: Partial<EnglishCertificate>) =>
      dispatch({ type: "SET_ENGLISH_CERTIFICATE", payload: patch }),

    // --- Education ----------------------------------------------------------
    addEducation: (entry?: Omit<EducationEntry, "id"> | unknown) => education.add(entry),
    updateEducation: (id: string, patch: Partial<EducationEntry>) =>
      education.update(id, patch),
    removeEducation: (id: string) => education.remove(id),

    // --- Internships / Work Experience --------------------------------------
    addInternship: (entry?: Omit<InternshipEntry, "id"> | unknown) => internships.add(entry),
    updateInternship: (id: string, patch: Partial<InternshipEntry>) =>
      internships.update(id, patch),
    removeInternship: (id: string) => internships.remove(id),

    // --- Recommendations ----------------------------------------------------
    addRecommendation: (entry?: Omit<RecommendationEntry, "id"> | unknown) => recommendations.add(entry),
    updateRecommendation: (id: string, patch: Partial<RecommendationEntry>) =>
      recommendations.update(id, patch),
    removeRecommendation: (id: string) => recommendations.remove(id),

    // --- Languages ----------------------------------------------------------
    addLanguage: (entry?: Omit<LanguageEntry, "id"> | unknown) => languages.add(entry),
    updateLanguage: (id: string, patch: Partial<LanguageEntry>) =>
      languages.update(id, patch),
    removeLanguage: (id: string) => languages.remove(id),

    // --- Skills -------------------------------------------------------------
    addSkill: (entry?: Omit<SkillEntry, "id"> | unknown) => skills.add(entry),
    /** Add a skill pre-populated with data (used by suggestion builder). */
    addSkillWithData: (data: Omit<SkillEntry, "id">) => skills.add(data),
    updateSkill: (id: string, patch: Partial<SkillEntry>) => skills.update(id, patch),
    removeSkill: (id: string) => skills.remove(id),

    // --- Hobbies ------------------------------------------------------------
    addHobby: (entry?: Omit<HobbyEntry, "id"> | unknown) => hobbies.add(entry),
    /** Add a hobby pre-populated with data (used by suggestion builder). */
    addHobbyWithData: (data: Omit<HobbyEntry, "id">) => hobbies.add(data),
    updateHobby: (id: string, patch: Partial<HobbyEntry>) => hobbies.update(id, patch),
    removeHobby: (id: string) => hobbies.remove(id),

    // --- Volunteering -------------------------------------------------------
    addVolunteering: (entry?: Omit<VolunteeringEntry, "id"> | unknown) => volunteering.add(entry),
    updateVolunteering: (id: string, patch: Partial<VolunteeringEntry>) =>
      volunteering.update(id, patch),
    removeVolunteering: (id: string) => volunteering.remove(id),

    // --- Academic Interests -------------------------------------------------
    addAcademicInterest: (entry?: Omit<AcademicInterest, "id"> | unknown) => academicInterests.add(entry),
    /** Add an academic interest pre-populated with data (used by suggestion builder). */
    addAcademicInterestWithData: (data: Omit<AcademicInterest, "id">) => academicInterests.add(data),
    updateAcademicInterest: (id: string, patch: Partial<AcademicInterest>) =>
      academicInterests.update(id, patch),
    removeAcademicInterest: (id: string) => academicInterests.remove(id),

    // --- Academic Projects --------------------------------------------------
    addAcademicProject: (entry?: Omit<AcademicProject, "id"> | unknown) => academicProjects.add(entry),
    updateAcademicProject: (id: string, patch: Partial<AcademicProject>) =>
      academicProjects.update(id, patch),
    removeAcademicProject: (id: string) => academicProjects.remove(id),

    // --- Achievements -------------------------------------------------------
    addAchievement: (entry?: Omit<Achievement, "id"> | unknown) => achievements.add(entry),
    updateAchievement: (id: string, patch: Partial<Achievement>) =>
      achievements.update(id, patch),
    removeAchievement: (id: string) => achievements.remove(id),

    // --- Leadership Activities ----------------------------------------------
    addLeadershipActivity: (entry?: Omit<LeadershipActivity, "id"> | unknown) => leadershipActivities.add(entry),
    /** Add a leadership activity pre-populated with data (used by suggestion builder). */
    addLeadershipActivityWithData: (data: Omit<LeadershipActivity, "id">) => leadershipActivities.add(data),
    updateLeadershipActivity: (id: string, patch: Partial<LeadershipActivity>) =>
      leadershipActivities.update(id, patch),
    removeLeadershipActivity: (id: string) => leadershipActivities.remove(id),

    // --- Certifications -----------------------------------------------------
    addCertification: (entry?: Omit<Certification, "id"> | unknown) => certifications.add(entry),
    updateCertification: (id: string, patch: Partial<Certification>) =>
      certifications.update(id, patch),
    removeCertification: (id: string) => certifications.remove(id),

    // --- Section Reordering --------------------------------------------------
    moveSectionUp: (sectionId: string) =>
      dispatch({ type: "MOVE_SECTION", payload: { sectionId, direction: "up" } }),
    moveSectionDown: (sectionId: string) =>
      dispatch({ type: "MOVE_SECTION", payload: { sectionId, direction: "down" } }),
    setSectionOrder: (order: string[]) =>
      dispatch({ type: "SET_SECTION_ORDER", payload: order }),
    resetSectionOrder: () =>
      dispatch({ type: "RESET_SECTION_ORDER" }),

    // --- Reset --------------------------------------------------------------
    reset: useCallback(() => dispatch({ type: "RESET" }), [dispatch]),

    // --- Test data (Phase 1 webhook integration only) ----------------------
    loadTestStudent: useCallback(
      () => dispatch({ type: "LOAD_TEST_STUDENT" }),
      [dispatch]
    ),

    // --- Load student from external source ----------------------------------
    // Stable useCallback reference — prevents consumers (e.g. WebhookToolbar)
    // from triggering re-renders / infinite loops when passed as a dependency.
    loadStudent: useCallback(
      (studentData: import("@/types").DocumentData) =>
        dispatch({ type: "LOAD_STUDENT", payload: studentData }),
      [dispatch]
    ),
  };
}
