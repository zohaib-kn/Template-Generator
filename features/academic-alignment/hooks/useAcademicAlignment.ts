"use client";

/**
 * features/academic-alignment/hooks/useAcademicAlignment.ts
 *
 * Core React hook providing real-time academic mismatch detection,
 * resolution synchronization with MongoDB, and stale-resolution warnings.
 *
 * Shared seamlessly across Resume Builder and SOP Generator.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type {
  NormalizedQualification,
  NormalizedWorkExperience,
  NormalizedAppliedProgram,
} from "@/types/normalizedStudent";
import {
  computeAcademicAlignment,
  type AcademicAlignmentResult,
  type TransitionContext,
} from "@/services/academicAlignment";
import type { AcademicAlignmentResolutionRecord } from "@/models/AcademicAlignmentResolution";

export interface UseAcademicAlignmentOptions {
  studentId?: string | null;
  programId?: string | null;
  targetProgram?: NormalizedAppliedProgram | null;
  qualifications?: NormalizedQualification[];
  workExperience?: NormalizedWorkExperience[];
  certifications?: Array<{ id: string; name: string; issuer?: string }>;
  academicProjects?: Array<{ id: string; title: string; description?: string }>;
  skills?: Array<{ id: string; name: string }>;
  internships?: Array<{ id: string; role: string; organization?: string; description?: string }>;
}

export interface UseAcademicAlignmentReturn {
  result: AcademicAlignmentResult;
  resolution: AcademicAlignmentResolutionRecord | null;
  /** Whether the stored resolution was created for a different course/qualification */
  isStale: boolean;
  staleReason?: string;
  loading: boolean;
  error: string | null;
  alignmentVersion: number;
  confirmIntentionalTransition: (context: TransitionContext) => Promise<boolean>;
  updateTransitionContext: (context: TransitionContext) => Promise<boolean>;
  resetResolution: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useAcademicAlignment(
  options: UseAcademicAlignmentOptions
): UseAcademicAlignmentReturn {
  const {
    studentId,
    programId,
    targetProgram,
    qualifications = [],
    workExperience = [],
    certifications = [],
    academicProjects = [],
    skills = [],
    internships = [],
  } = options;

  const [resolution, setResolution] = useState<AcademicAlignmentResolutionRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [alignmentVersion, setAlignmentVersion] = useState<number>(1);

  const abortControllerRef = useRef<AbortController | null>(null);

  // -------------------------------------------------------------------------
  // Fetch Persisted Resolution from MongoDB
  // -------------------------------------------------------------------------
  const fetchResolution = useCallback(async () => {
    if (!studentId || !programId) {
      setResolution(null);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/academic-alignment?studentId=${encodeURIComponent(studentId)}&programId=${encodeURIComponent(programId)}`,
        { signal: controller.signal }
      );

      if (!res.ok) {
        throw new Error(`Failed to load resolution (${res.status})`);
      }

      const data = await res.json();
      if (data.success) {
        setResolution(data.resolution || null);
      } else {
        setError(data.error || "Failed to load academic alignment resolution");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Ignore aborted requests
      }
      const message = err instanceof Error ? err.message : "Error fetching resolution";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [studentId, programId]);

  useEffect(() => {
    fetchResolution();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchResolution]);

  // -------------------------------------------------------------------------
  // Snapshot Strings (for comparison & persistence)
  // -------------------------------------------------------------------------
  const currentSourceSnapshot = useMemo(() => {
    const primary = qualifications.find(
      (q) => q.levelOfStudy?.match(/undergraduate|postgraduate|bachelor|master/i) || q.fieldOfStudy
    ) || qualifications[0];
    return primary?.fieldOfStudy || primary?.qualification || "Unknown Qualification";
  }, [qualifications]);

  const currentTargetSnapshot = useMemo(() => {
    return targetProgram?.course || "Unknown Target Course";
  }, [targetProgram?.course]);

  // -------------------------------------------------------------------------
  // Stale Resolution Detection
  // -------------------------------------------------------------------------
  const { isStale, staleReason } = useMemo(() => {
    if (!resolution) return { isStale: false };

    const cleanCourse = currentTargetSnapshot.trim().toLowerCase();
    const storedCourse = resolution.targetCourseSnapshot.trim().toLowerCase();

    if (cleanCourse !== "unknown target course" && storedCourse !== cleanCourse) {
      return {
        isStale: true,
        staleReason: `Resolution was confirmed for "${resolution.targetCourseSnapshot}", but target course is now "${currentTargetSnapshot}".`,
      };
    }

    return { isStale: false };
  }, [resolution, currentTargetSnapshot]);

  // -------------------------------------------------------------------------
  // Alignment Engine Computation (Pure)
  // -------------------------------------------------------------------------
  const result = useMemo<AcademicAlignmentResult>(() => {
    const effectiveTargetProgram: NormalizedAppliedProgram = targetProgram || {
      id: programId || "unknown-program",
      country: "Unknown",
      university: "Unknown University",
      course: currentTargetSnapshot,
      degreeLevel: "Master's",
      courseCategory: "Other",
    };

    // If resolution is marked INTENTIONAL_CONFIRMED and not stale, pass transition context
    const activeTransitionContext =
      resolution?.resolution === "INTENTIONAL_CONFIRMED" && !isStale
        ? resolution.transitionContext
        : null;

    return computeAcademicAlignment({
      qualifications,
      workExperience,
      targetProgram: effectiveTargetProgram,
      transitionContext: activeTransitionContext,
      certifications,
      academicProjects,
      skills,
      internships,
    });
  }, [
    qualifications,
    workExperience,
    targetProgram,
    programId,
    currentTargetSnapshot,
    resolution,
    isStale,
    certifications,
    academicProjects,
    skills,
    internships,
  ]);

  // -------------------------------------------------------------------------
  // Actions: Confirm Transition
  // -------------------------------------------------------------------------
  const confirmIntentionalTransition = useCallback(
    async (context: TransitionContext): Promise<boolean> => {
      if (!studentId || !programId) {
        setError("studentId and programId required to confirm intentional transition");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const payload = {
          studentId,
          programId,
          sourceQualificationSnapshot: currentSourceSnapshot,
          targetCourseSnapshot: currentTargetSnapshot,
          resolution: "INTENTIONAL_CONFIRMED",
          transitionContext: context,
        };

        const res = await fetch("/api/academic-alignment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success && data.resolution) {
          setResolution(data.resolution);
          setAlignmentVersion((v) => v + 1);
          return true;
        } else {
          setError(data.error || "Failed to persist transition confirmation");
          return false;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error confirming transition";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [studentId, programId, currentSourceSnapshot, currentTargetSnapshot]
  );

  // -------------------------------------------------------------------------
  // Actions: Update Transition Context
  // -------------------------------------------------------------------------
  const updateTransitionContext = useCallback(
    async (context: TransitionContext): Promise<boolean> => {
      return confirmIntentionalTransition(context);
    },
    [confirmIntentionalTransition]
  );

  // -------------------------------------------------------------------------
  // Actions: Reset Resolution
  // -------------------------------------------------------------------------
  const resetResolution = useCallback(async (): Promise<boolean> => {
    if (!studentId || !programId) {
      setResolution(null);
      return true;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/academic-alignment?studentId=${encodeURIComponent(studentId)}&programId=${encodeURIComponent(programId)}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (data.success) {
        setResolution(null);
        setAlignmentVersion((v) => v + 1);
        return true;
      } else {
        setError(data.error || "Failed to reset alignment resolution");
        return false;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error resetting resolution";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [studentId, programId]);

  return {
    result,
    resolution,
    isStale,
    staleReason,
    loading,
    error,
    alignmentVersion,
    confirmIntentionalTransition,
    updateTransitionContext,
    resetResolution,
    refresh: fetchResolution,
  };
}
