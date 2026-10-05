/**
 * features/sop-generator/guidance/sopAcademicCatalog.ts
 *
 * Domain-specific academic foundation terminology, interdisciplinary bridge arguments,
 * and pre-formulated counsellor transition rationale templates for the SOP Generator.
 */

import type { AcademicDomain } from "@/services/academicAlignment/types";
import { getDomainCatalog } from "@/features/document-generator/guidance/academicCatalog";

export interface SopTalkingPoint {
  label: string;
  textToInsert: string;
  type: "academic" | "bridge" | "transferable" | "career";
}

/**
 * Pre-formulated counsellor justification rationale templates for intentional academic transitions.
 * Guarantees a minimum length >= 30 characters and provides embassy-grade phrasing.
 */
export function getTransitionRationaleTemplate(
  sourceDomain: AcademicDomain,
  targetDomain: AcademicDomain,
  sourceDegree = "undergraduate degree",
  targetCourse = "postgraduate program",
  evidenceHighlights?: string
): string {
  const sourceCatalog = getDomainCatalog(sourceDomain);
  const targetCatalog = getDomainCatalog(targetDomain);

  const transferableSkill = sourceCatalog.skills.transferable[0] || "analytical rigor";
  const sourceMethodology = sourceCatalog.skills.domain[0] || "foundational academic inquiry";

  if (evidenceHighlights && evidenceHighlights.trim().length > 0) {
    return `Candidate completed a foundational ${sourceDegree} (${sourceCatalog.displayName}), demonstrating strong capabilities in ${sourceMethodology} and ${transferableSkill}. To prepare for postgraduate specialization in ${targetCourse} (${targetCatalog.displayName}), the candidate completed verified bridging practical experience including ${evidenceHighlights}, directly demonstrating academic readiness and intentional cross-disciplinary progression.`;
  }

  return `Candidate holds a foundational ${sourceDegree} in ${sourceCatalog.displayName}, developing rigorous ${sourceMethodology} and ${transferableSkill}. The candidate has actively prepared for advanced study in ${targetCourse} (${targetCatalog.displayName}) through targeted practical projects, coursework, and industry internships, bridging qualitative evaluation with specialized modern methodologies.`;
}

/**
 * Returns structured talking points for sensitive SOP sections based on academic domain and transition context.
 */
export function getSectionTalkingPoints(
  sectionId: string,
  sourceDomain: AcademicDomain,
  targetDomain: AcademicDomain,
  isTransition: boolean,
  sourceDegree = "Bachelor's",
  targetCourse = "Master's"
): SopTalkingPoint[] {
  const sourceCatalog = getDomainCatalog(sourceDomain);
  const targetCatalog = getDomainCatalog(targetDomain);

  // 1. Academic Background & Preparedness
  if (sectionId === "academic-background" || sectionId.includes("academic")) {
    const points: SopTalkingPoint[] = [];

    // Undergraduate foundation terms
    sourceCatalog.skills.domain.slice(0, 3).forEach((skill) => {
      points.push({
        label: skill,
        textToInsert: `Throughout my ${sourceDegree}, I developed rigorous competencies in ${skill.toLowerCase()}, establishing a disciplined academic foundation.`,
        type: "academic",
      });
    });

    // Transferable analytical skills
    sourceCatalog.skills.transferable.slice(0, 2).forEach((skill) => {
      points.push({
        label: skill,
        textToInsert: `My undergraduate research cultivated advanced ${skill.toLowerCase()}, enabling me to synthesize complex information and conduct structured inquiry.`,
        type: "transferable",
      });
    });

    return points;
  }

  // 2. Academic Motivation & Course Choice (Why Course)
  if (
    sectionId === "why-course" ||
    sectionId.includes("course") ||
    sectionId.includes("motivation")
  ) {
    const points: SopTalkingPoint[] = [];

    if (isTransition) {
      points.push({
        label: "Interdisciplinary Motivation",
        textToInsert: `While my foundational education in ${sourceDegree} developed my ${sourceCatalog.skills.transferable[0].toLowerCase()}, my passion evolved toward applying these analytical frameworks to ${targetCourse}.`,
        type: "bridge",
      });
      points.push({
        label: "Practical Bridge Experience",
        textToInsert: `To bridge my background into ${targetCatalog.displayName}, I pursued focused practical internships and independent projects, validating my preparedness for advanced postgraduate coursework.`,
        type: "bridge",
      });
      points.push({
        label: "Complementary Perspective",
        textToInsert: `My background in ${sourceCatalog.displayName} provides a unique, multifaceted perspective that complements the quantitative and technical demands of ${targetCourse}.`,
        type: "transferable",
      });
    } else {
      points.push({
        label: "Academic Continuity",
        textToInsert: `Building upon my ${sourceDegree} in ${sourceCatalog.displayName}, pursuing ${targetCourse} represents a direct and natural continuation of my academic specialization.`,
        type: "academic",
      });
      points.push({
        label: "Advanced Research Depth",
        textToInsert: `This postgraduate curriculum offers the specialized theoretical depth and research exposure required to advance my expertise in ${sourceCatalog.skills.domain[0].toLowerCase()}.`,
        type: "academic",
      });
    }

    return points;
  }

  // 3. Career Goals & Return Intentions
  if (sectionId === "career-goals" || sectionId.includes("career")) {
    const points: SopTalkingPoint[] = [];
    const careerTargetCatalog = isTransition ? targetCatalog : sourceCatalog;

    careerTargetCatalog.roles.slice(0, 2).forEach((role) => {
      points.push({
        label: role.title,
        textToInsert: `Upon completing my postgraduate degree, I aim to return to my home country and take on responsibilities as a ${role.title}, contributing directly to institutional growth.`,
        type: "career",
      });
    });

    points.push({
      label: "Home Country Contribution",
      textToInsert: `The international exposure and specialized methodologies gained from ${targetCourse} will equip me to address regional challenges in my home country upon degree completion.`,
      type: "career",
    });

    return points;
  }

  return [];
}
