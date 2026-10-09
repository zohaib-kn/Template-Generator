/**
 * features/document-generator/context/AcademicProfileContext.tsx
 *
 * Reactive context and hook providing academic branch awareness,
 * degree-driven catalogs, and real-time field alignment evaluations.
 */

"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { AcademicDomain } from "@/services/academicAlignment/types";
import {
  classifySourceDomain,
  classifyTargetDomain,
} from "@/services/academicAlignment/domainClassifier";
import type {
  NormalizedQualification,
  NormalizedAppliedProgram,
} from "@/types/normalizedStudent";
import {
  DOMAIN_ACADEMIC_CATALOG,
  getDomainCatalog,
  findMatchingSuggestions,
  type DomainAcademicCatalog,
} from "../guidance/academicCatalog";
import { useDocumentState } from "../hooks/useDocumentState";
import type { ApplicationTarget } from "../guidance/types";

export type FieldAlignmentStatus = "MATCH" | "BRIDGE" | "DIVERGENT" | "NEUTRAL";

export interface FieldEvaluationResult {
  status: FieldAlignmentStatus;
  detectedDomain: AcademicDomain;
  message: string;
}

export interface AcademicProfileContextValue {
  sourceDomain: AcademicDomain;
  targetDomain: AcademicDomain;
  sourceCatalog: DomainAcademicCatalog;
  targetCatalog: DomainAcademicCatalog;
  primaryDegree: string;
  targetCourse: string;
  isTransition: boolean;
  evaluateField: (
    text: string,
    fieldType?: "role" | "project" | "skill" | "certification" | "interest"
  ) => FieldEvaluationResult;
  getSuggestedItems: (
    fieldType: "roles" | "projects" | "skills" | "certifications" | "interests",
    currentInput?: string
  ) => {
    degreeRecommendations: string[];
    bridgeRecommendations: string[];
    otherMatching: string[];
  };
}

const AcademicProfileContext = createContext<AcademicProfileContextValue | null>(null);

interface AcademicProfileProviderProps {
  children: React.ReactNode;
  applicationTarget?: ApplicationTarget;
}

// Simple discipline regex dictionary for instant client-side field evaluation
const DOMAIN_KEYWORD_PATTERNS: Array<{ domain: AcademicDomain; pattern: RegExp }> = [
  {
    domain: "COMPUTING",
    pattern: /\b(data\s+an[ay]lytics?|data\s+sci(?:ence)?|software|develop(?:er|ment)?|machine\s+learning|\bai\b|\bml\b|cloud|python|sql|full\s*stack|frontend|backend|cyber\s*security|testing|qa\s+eng|react|next\.?js)\b/i,
  },
  {
    domain: "BUSINESS",
    pattern: /\b(business\s+dev(?:elopment)?|marketing|sales|crm|market\s+research|product\s+manage(?:r|ment)|operations|logistics|supply\s+chain|brand)\b/i,
  },
  {
    domain: "ECONOMICS_FINANCE",
    pattern: /\b(finance|financial|equity\s+research|valuation|dcf|econom(?:ics|etric)|banking|investment|accounting|portfolio)\b/i,
  },
  {
    domain: "SOCIAL_HUMANITIES",
    pattern: /\b(history|historiograph|archival|archive|museum|curat(?:or|orial)|qualitative|humanities|sociolog|philosoph|literature|cultural\s+heritage|policy\s+research|publishing|editorial)\b/i,
  },
  {
    domain: "ENGINEERING",
    pattern: /\b(mechanical|civil|electrical|electronics|cad|solidworks|autocad|finite\s+element|fea|ansys|embedded|circuit|manufacturing)\b/i,
  },
  {
    domain: "LAW",
    pattern: /\b(law|legal|paralegal|compliance|jurisprudence|contract|statutory|litigation|ipr|patent|trademark|moot)\b/i,
  },
  {
    domain: "ARTS_DESIGN_MEDIA",
    pattern: /\b(ui\/ux|design|graphic|figma|typography|multimedia|visual|animation|creative\s+direction|filmmaking)\b/i,
  },
  {
    domain: "HEALTH_MEDICINE",
    pattern: /\b(clinical|medical|health|nursing|pharmacy|pharmacovigilance|epidemiolog|biomedical|hospital|patient)\b/i,
  },
  {
    domain: "SCIENCE",
    pattern: /\b(biology|biochem|chemistry|physics|laboratory|spectrometry|statistics|environmental\s+science|ecological)\b/i,
  },
];

export function AcademicProfileProvider({
  children,
  applicationTarget,
}: AcademicProfileProviderProps) {
  const { data } = useDocumentState();

  // 1. Resolve normalized qualifications with subjects and levelOfStudy awareness
  const qualifications: NormalizedQualification[] = useMemo(() => {
    return (data.education ?? []).map((edu, idx) => {
      const extractedSubjects =
        edu.description?.match(/Subjects:\s*([^|]+)/i)?.[1]?.trim() || undefined;

      const is12th = /\b(12th|higher\s*secondary|senior\s*secondary)\b/i.test(edu.qualification || "");
      const is10th = /\b(10th|secondary)\b/i.test(edu.qualification || "");
      const levelOfStudy = is12th ? "12th" : is10th ? "10th" : undefined;

      return {
        id: edu.id || `edu-${idx}`,
        qualification: edu.qualification || "Degree",
        fieldOfStudy: edu.fieldOfStudy || edu.qualification || "General",
        institution: edu.institution,
        levelOfStudy,
        subjects: extractedSubjects,
        completionYear: edu.endDate ? edu.endDate.slice(0, 4) : undefined,
      };
    });
  }, [data.education]);

  // 2. Classify Source Domain
  const sourceField = useMemo(
    () => classifySourceDomain(qualifications),
    [qualifications]
  );
  const sourceDomain = sourceField.domain;

  // 3. Resolve target program & Classify Target Domain
  const targetProgram: NormalizedAppliedProgram | null = useMemo(() => {
    if (!applicationTarget?.intendedCourse && !applicationTarget?.universityName) {
      return null;
    }
    return {
      id: "resume-target-program",
      university: applicationTarget.universityName || "Target University",
      course: applicationTarget.intendedCourse || "Target Course",
      country: applicationTarget.destinationCountry || "Target Country",
      degreeLevel: applicationTarget.degreeLevel || "Master's",
      courseCategory: applicationTarget.courseCategory || "Other",
    };
  }, [applicationTarget]);

  const targetField = useMemo(
    () => classifyTargetDomain(targetProgram),
    [targetProgram]
  );
  const targetDomain = targetField.domain;

  const primaryDegree = useMemo(() => {
    const degrees = data.education ?? [];
    if (degrees.length === 0) return "Degree";

    // 1. Check for tertiary/college degree (B.Tech, B.Sc, BA, Master's, etc.)
    const tertiary = degrees.find(
      (e) =>
        e.qualification &&
        !/\b(10th|12th|secondary|high\s*school)\b/i.test(e.qualification)
    );
    if (tertiary?.qualification) return tertiary.qualification;

    // 2. Highest school qualification (12th grade prioritized over 10th grade)
    const twelveth = degrees.find((e) =>
      /\b(12th|higher\s*secondary|senior\s*secondary)\b/i.test(e.qualification || "")
    );
    if (twelveth?.qualification) return twelveth.qualification;

    // 3. Fallback to latest education entry or first entry
    return degrees[degrees.length - 1]?.qualification || degrees[0]?.qualification || "High School Education";
  }, [data.education]);

  const targetCourse = applicationTarget?.intendedCourse || "";
  const isTransition =
    sourceDomain !== "UNKNOWN" &&
    targetDomain !== "UNKNOWN" &&
    sourceDomain !== targetDomain;

  const sourceCatalog = useMemo(
    () => getDomainCatalog(sourceDomain),
    [sourceDomain]
  );
  const targetCatalog = useMemo(
    () => getDomainCatalog(targetDomain),
    [targetDomain]
  );

  // 4. Real-time Field Evaluation function
  const evaluateField = useMemo(() => {
    return (
      text: string,
      fieldType?: "role" | "project" | "skill" | "certification" | "interest"
    ): FieldEvaluationResult => {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length < 2) {
        return {
          status: "NEUTRAL",
          detectedDomain: "UNKNOWN",
          message: "",
        };
      }

      // Check keyword patterns to detect domain
      let detected: AcademicDomain = "UNKNOWN";
      for (const item of DOMAIN_KEYWORD_PATTERNS) {
        if (item.pattern.test(trimmed)) {
          detected = item.domain;
          break;
        }
      }

      // Check transferable skills
      if (detected === "UNKNOWN") {
        const isTransferable = sourceCatalog.skills.transferable.some((s) =>
          trimmed.toLowerCase().includes(s.toLowerCase())
        );
        if (isTransferable) {
          return {
            status: "MATCH",
            detectedDomain: sourceDomain,
            message: `Transferable skill aligned with ${sourceCatalog.displayName}.`,
          };
        }
        return {
          status: "NEUTRAL",
          detectedDomain: "UNKNOWN",
          message: "",
        };
      }

      // Aligned with source degree
      if (detected === sourceDomain) {
        return {
          status: "MATCH",
          detectedDomain: detected,
          message: `Aligned with student's background in ${sourceCatalog.displayName}.`,
        };
      }

      // Matches target program (Direct alignment for undergraduate applicants, or transition bridge)
      if (detected === targetDomain) {
        if (isTransition) {
          return {
            status: "BRIDGE",
            detectedDomain: detected,
            message: `Career Bridge: Provides transition evidence for target program (${targetCourse || targetCatalog.displayName}).`,
          };
        }
        return {
          status: "MATCH",
          detectedDomain: detected,
          message: `Aligned with intended program in ${targetCatalog.displayName}.`,
        };
      }

      // Divergent from both
      const detectedCatalog = getDomainCatalog(detected);
      return {
        status: "DIVERGENT",
        detectedDomain: detected,
        message: `Field belongs to ${detectedCatalog.displayName}, while student studied ${primaryDegree}. Highlight transferable analytical or research skills.`,
      };
    };
  }, [
    sourceDomain,
    targetDomain,
    sourceCatalog,
    targetCatalog,
    isTransition,
    primaryDegree,
    targetCourse,
  ]);

  // 5. Suggestions builder
  const getSuggestedItems = useMemo(() => {
    return (
      fieldType: "roles" | "projects" | "skills" | "certifications" | "interests",
      currentInput = ""
    ) => {
      const getList = (cat: DomainAcademicCatalog): string[] => {
        switch (fieldType) {
          case "roles":
            return cat.roles.map((r) => r.title);
          case "projects":
            return cat.projects.map((p) => p.title);
          case "skills":
            return [...cat.skills.domain, ...cat.skills.transferable];
          case "certifications":
            return cat.certifications.map((c) => c.title);
          case "interests":
            return cat.academicInterests;
          default:
            return [];
        }
      };

      const sourceList = getList(sourceCatalog);
      const targetList = isTransition ? getList(targetCatalog) : [];

      const degreeRecommendations = findMatchingSuggestions(
        currentInput,
        sourceList,
        5
      );
      const bridgeRecommendations = isTransition
        ? findMatchingSuggestions(currentInput, targetList, 4)
        : [];

      return {
        degreeRecommendations,
        bridgeRecommendations,
        otherMatching: [],
      };
    };
  }, [sourceCatalog, targetCatalog, isTransition]);

  const value = useMemo<AcademicProfileContextValue>(
    () => ({
      sourceDomain,
      targetDomain,
      sourceCatalog,
      targetCatalog,
      primaryDegree,
      targetCourse,
      isTransition,
      evaluateField,
      getSuggestedItems,
    }),
    [
      sourceDomain,
      targetDomain,
      sourceCatalog,
      targetCatalog,
      primaryDegree,
      targetCourse,
      isTransition,
      evaluateField,
      getSuggestedItems,
    ]
  );

  return (
    <AcademicProfileContext.Provider value={value}>
      {children}
    </AcademicProfileContext.Provider>
  );
}

export function useStudentAcademicProfile(): AcademicProfileContextValue {
  const context = useContext(AcademicProfileContext);
  if (!context) {
    // Fallback: provide neutral default when used outside provider
    const fallbackCatalog = DOMAIN_ACADEMIC_CATALOG.UNKNOWN;
    return {
      sourceDomain: "UNKNOWN",
      targetDomain: "UNKNOWN",
      sourceCatalog: fallbackCatalog,
      targetCatalog: fallbackCatalog,
      primaryDegree: "Degree",
      targetCourse: "",
      isTransition: false,
      evaluateField: () => ({
        status: "NEUTRAL",
        detectedDomain: "UNKNOWN",
        message: "",
      }),
      getSuggestedItems: () => ({
        degreeRecommendations: [],
        bridgeRecommendations: [],
        otherMatching: [],
      }),
    };
  }
  return context;
}
