import type { DocumentData, EnglishCertificate, PersonalDetails } from "@/types";
import { DEFAULT_MOVABLE_SECTION_ORDER } from "@/types";
import { createEmptyDocumentData } from "../utils/documentDefaults";
import { testStudentData } from "../utils/testStudentData";

// ---------------------------------------------------------------------------
// Generic list-section machinery
//
// Every repeatable section (education, recommendations, languages, skills,
// hobbies, volunteering) is an array of entries keyed by a stable `id`.
// Adding a new list section only means: add the array field to
// `DocumentData`, add its key here, and add one `listFieldActions(...)` call
// in useDocumentState — no new reducer cases or action types required.
// ---------------------------------------------------------------------------

type ListKey =
  | "education"
  | "internships"
  | "recommendations"
  | "languages"
  | "skills"
  | "hobbies"
  | "volunteering"
  | "academicInterests"
  | "academicProjects"
  | "achievements"
  | "leadershipActivities"
  | "certifications";

type ListEntry<K extends ListKey> = NonNullable<DocumentData[K]>[number];

type ListAction = {
  [K in ListKey]:
    | { type: "ADD_LIST_ITEM"; key: K; payload: ListEntry<K> }
    | {
        type: "UPDATE_LIST_ITEM";
        key: K;
        payload: { id: string; patch: Partial<ListEntry<K>> };
      }
    | { type: "REMOVE_LIST_ITEM"; key: K; payload: string };
}[ListKey];

// ---------------------------------------------------------------------------
// Action types
// ---------------------------------------------------------------------------

export type DocumentAction =
  // Singleton fields
  | { type: "SET_PERSONAL"; payload: Partial<PersonalDetails> }
  | { type: "SET_ABOUT_ME"; payload: string }
  | { type: "SET_DECLARATION"; payload: string }
  | { type: "SET_MOTHER_TONGUE"; payload: string }
  | { type: "SET_ENGLISH_CERTIFICATE"; payload: Partial<EnglishCertificate> }
  // Section Reordering
  | { type: "MOVE_SECTION"; payload: { sectionId: string; direction: "up" | "down" } }
  | { type: "SET_SECTION_ORDER"; payload: string[] }
  | { type: "RESET_SECTION_ORDER" }
  // Repeatable list sections (education, recommendations, languages, skills,
  // hobbies, volunteering, …)
  | ListAction
  // Reset
  | { type: "RESET" }
  // Load static test student into state (hardcoded fixture)
  | { type: "LOAD_TEST_STUDENT" }
  // Load any student data from external source (mock API, real API, etc.)
  | { type: "LOAD_STUDENT"; payload: import("@/types").DocumentData };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function documentReducer(
  state: DocumentData,
  action: DocumentAction
): DocumentData {
  switch (action.type) {
    // --- Singleton fields -----------------------------------------------------
    case "SET_PERSONAL":
      return { ...state, personal: { ...state.personal, ...action.payload } };

    case "SET_ABOUT_ME":
      return { ...state, aboutMe: action.payload };

    case "SET_DECLARATION":
      return { ...state, declaration: action.payload };

    case "SET_MOTHER_TONGUE":
      return { ...state, motherTongue: action.payload };

    case "SET_ENGLISH_CERTIFICATE":
      return {
        ...state,
        englishCertificate: { ...state.englishCertificate, ...action.payload },
      };

    // --- Section Reordering ----------------------------------------------------
    case "MOVE_SECTION": {
      const { sectionId, direction } = action.payload;
      const currentOrder = [...(state.sectionOrder ?? DEFAULT_MOVABLE_SECTION_ORDER)];
      const idx = currentOrder.indexOf(sectionId);
      if (idx === -1) return state;

      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= currentOrder.length) return state;

      const temp = currentOrder[idx];
      currentOrder[idx] = currentOrder[targetIdx];
      currentOrder[targetIdx] = temp;

      return { ...state, sectionOrder: currentOrder };
    }

    case "SET_SECTION_ORDER":
      return { ...state, sectionOrder: action.payload };

    case "RESET_SECTION_ORDER":
      return { ...state, sectionOrder: undefined };

    // --- Repeatable list sections ----------------------------------------------
    case "ADD_LIST_ITEM": {
      const list = (state[action.key] as ListEntry<typeof action.key>[] | undefined) ?? [];
      return { ...state, [action.key]: [...list, action.payload] };
    }

    case "UPDATE_LIST_ITEM": {
      const list = (state[action.key] as ListEntry<typeof action.key>[] | undefined) ?? [];
      return {
        ...state,
        [action.key]: list.map((entry) =>
          entry.id === action.payload.id
            ? { ...entry, ...action.payload.patch }
            : entry
        ),
      };
    }

    case "REMOVE_LIST_ITEM": {
      const list = (state[action.key] as ListEntry<typeof action.key>[] | undefined) ?? [];
      return {
        ...state,
        [action.key]: list.filter((entry) => entry.id !== action.payload),
      };
    }

    // --- Load test student (hardcoded fixture) --------------------------------
    case "LOAD_TEST_STUDENT":
      return { ...testStudentData };

    // --- Load student from external source ------------------------------------
    // Used by "Load Student From Webhook" — accepts any DocumentData payload.
    // This means when a real API URL replaces the mock, no reducer change needed.
    case "LOAD_STUDENT":
      return { ...action.payload };

    // --- Reset ------------------------------------------------------------------
    case "RESET":
      return createEmptyDocumentData();

    default:
      return state;
  }
}
