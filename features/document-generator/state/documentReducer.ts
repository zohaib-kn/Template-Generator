import type { DocumentData, EnglishCertificate, PersonalDetails } from "@/types";
import { createEmptyDocumentData } from "../utils/documentDefaults";

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
  | "recommendations"
  | "languages"
  | "skills"
  | "hobbies"
  | "volunteering";

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
  | { type: "SET_ENGLISH_CERTIFICATE"; payload: Partial<EnglishCertificate> }
  // Repeatable list sections (education, recommendations, languages, skills,
  // hobbies, volunteering, …)
  | ListAction
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
    // --- Singleton fields -----------------------------------------------------
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

    // --- Reset ------------------------------------------------------------------
    case "RESET":
      return createEmptyDocumentData();

    default:
      return state;
  }
}
