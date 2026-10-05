/**
 * services/academicAlignment/domainClassifier.ts
 *
 * Deterministic domain & sub-domain classifier for academic qualifications and target programs.
 *
 * Implements the 6-step classification priority:
 * 1. fieldOfStudy (explicit field on qualification)
 * 2. qualification / degree title text
 * 3. verified subjects (if present)
 * 4. other academic metadata
 * 5. Gemini semantic fallback (Phase 8)
 * 6. UNKNOWN (blocks sensitive generation)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - `boardOrUniversity` is metadata only and is NEVER used as a domain classifier.
 * - UNKNOWN domain must never default to ALIGNED.
 */

import type {
  NormalizedQualification,
  NormalizedAppliedProgram,
} from "@/types/normalizedStudent";
import type {
  AcademicDomain,
  AcademicSubDomain,
  AcademicField,
  DomainConfidence,
} from "./types";

interface ClassificationMatch {
  domain: AcademicDomain;
  subDomain: AcademicSubDomain;
  confidence: DomainConfidence;
}

// ---------------------------------------------------------------------------
// Pattern Matchers (evaluated in order of specificity)
// ---------------------------------------------------------------------------

function matchDiscipline(text: string): ClassificationMatch | null {
  const t = text.toLowerCase();

  // 1. COMPUTING (Specific sub-domains first)
  if (/\b(artificial\s+intelligence|machine\s+learning|deep\s+learning|\bai\b|\bml\b|neural\s+network)\b/i.test(t)) {
    return { domain: "COMPUTING", subDomain: "ARTIFICIAL_INTELLIGENCE", confidence: "HIGH" };
  }
  if (/\b(data\s+science|data\s+analytics|big\s+data|business\s+analytics)\b/i.test(t)) {
    return { domain: "COMPUTING", subDomain: "DATA_SCIENCE", confidence: "HIGH" };
  }
  if (/\b(cyber\s*security|information\s+security|network\s+security|ethical\s+hacking)\b/i.test(t)) {
    return { domain: "COMPUTING", subDomain: "CYBERSECURITY", confidence: "HIGH" };
  }
  if (/\b(software\s+eng(?:ineering)?|software\s+development|web\s+development|full\s*stack)\b/i.test(t)) {
    return { domain: "COMPUTING", subDomain: "SOFTWARE_ENGINEERING", confidence: "HIGH" };
  }
  if (/\b(information\s+systems?|\bmis\b)\b/i.test(t)) {
    return { domain: "COMPUTING", subDomain: "INFORMATION_SYSTEMS", confidence: "HIGH" };
  }
  if (/\b(information\s+technology|\bit\b)\b/i.test(t)) {
    return { domain: "COMPUTING", subDomain: "INFORMATION_TECHNOLOGY", confidence: "HIGH" };
  }
  if (/\b(computer\s+science|computing|computer\s+application|\bbca\b|\bmca\b|\bcs\b)\b/i.test(t)) {
    return { domain: "COMPUTING", subDomain: "COMPUTER_SCIENCE", confidence: "HIGH" };
  }

  // 2. ENGINEERING (Specific sub-disciplines)
  if (/\b(mechanical|mechatronics|automobile|automotive)\b/i.test(t)) {
    return { domain: "ENGINEERING", subDomain: "MECHANICAL_ENGINEERING", confidence: "HIGH" };
  }
  if (/\b(civil|structural\s+eng|construction\s+(?:eng|management)|transportation\s+eng|geotechnical)\b/i.test(t)) {
    return { domain: "ENGINEERING", subDomain: "CIVIL_ENGINEERING", confidence: "HIGH" };
  }
  if (/\b(aerospace|aeronautical|avionics)\b/i.test(t)) {
    return { domain: "ENGINEERING", subDomain: "AEROSPACE_ENGINEERING", confidence: "HIGH" };
  }
  if (/\b(robotics|automation\s+eng)\b/i.test(t)) {
    return { domain: "ENGINEERING", subDomain: "ROBOTICS_ENGINEERING", confidence: "HIGH" };
  }
  if (/\b(biomedical\s+eng|bioengineering)\b/i.test(t)) {
    return { domain: "ENGINEERING", subDomain: "BIOMEDICAL_ENGINEERING", confidence: "HIGH" };
  }
  if (/\b(chemical\s+eng|petroleum|polymer\s+eng)\b/i.test(t)) {
    return { domain: "ENGINEERING", subDomain: "CHEMICAL_ENGINEERING", confidence: "HIGH" };
  }
  if (/\b(industrial\s+eng|manufacturing\s+eng|production\s+eng)\b/i.test(t)) {
    return { domain: "ENGINEERING", subDomain: "INDUSTRIAL_ENGINEERING", confidence: "HIGH" };
  }
  if (/\b(electrical\s+eng|power\s+systems?|\beee\b)\b/i.test(t)) {
    return { domain: "ENGINEERING", subDomain: "ELECTRICAL_ENGINEERING", confidence: "HIGH" };
  }
  if (/\b(electronics|telecom(?:munication)?|\bece\b|vlsi|embedded\s+systems?)\b/i.test(t)) {
    return { domain: "ENGINEERING", subDomain: "ELECTRONICS_ENGINEERING", confidence: "HIGH" };
  }
  if (/\b(b\.?tech|m\.?tech|b\.?e\b|m\.?e\b|engineering)\b/i.test(t)) {
    return { domain: "ENGINEERING", subDomain: "GENERAL_ENGINEERING", confidence: "MEDIUM" };
  }

  // 3. ECONOMICS & FINANCE
  if (/\b(accounting|accountancy|chartered\s+accountant|\bca\b|\bcpa\b|\bacca\b|auditing)\b/i.test(t)) {
    return { domain: "ECONOMICS_FINANCE", subDomain: "ACCOUNTING", confidence: "HIGH" };
  }
  if (/\b(banking|commercial\s+banking)\b/i.test(t)) {
    return { domain: "ECONOMICS_FINANCE", subDomain: "BANKING", confidence: "HIGH" };
  }
  if (/\b(financial\s+analytics|quantitative\s+finance|fintech)\b/i.test(t)) {
    return { domain: "ECONOMICS_FINANCE", subDomain: "FINANCIAL_ANALYTICS", confidence: "HIGH" };
  }
  if (/\b(finance|financial\s+management|corporate\s+finance|investment\s+banking|\bcfa\b)\b/i.test(t)) {
    return { domain: "ECONOMICS_FINANCE", subDomain: "FINANCE", confidence: "HIGH" };
  }
  if (/\b(economics|econometrics|macroeconomics|microeconomics)\b/i.test(t)) {
    return { domain: "ECONOMICS_FINANCE", subDomain: "ECONOMICS", confidence: "HIGH" };
  }

  // 4. BUSINESS & COMMERCE
  if (/\b(commerce|\bb\.?com\b|\bm\.?com\b)\b/i.test(t)) {
    return { domain: "BUSINESS", subDomain: "COMMERCE", confidence: "HIGH" };
  }
  if (/\b(marketing|digital\s+marketing|brand\s+management)\b/i.test(t)) {
    return { domain: "BUSINESS", subDomain: "MARKETING", confidence: "HIGH" };
  }
  if (/\b(human\s+resources?|\bhr\b|talent\s+management)\b/i.test(t)) {
    return { domain: "BUSINESS", subDomain: "HUMAN_RESOURCES", confidence: "HIGH" };
  }
  if (/\b(international\s+business|global\s+business)\b/i.test(t)) {
    return { domain: "BUSINESS", subDomain: "INTERNATIONAL_BUSINESS", confidence: "HIGH" };
  }
  if (/\b(supply\s+chain|logistics|procurement|operations\s+management)\b/i.test(t)) {
    return { domain: "BUSINESS", subDomain: "SUPPLY_CHAIN_LOGISTICS", confidence: "HIGH" };
  }
  if (/\b(mba|bba|business\s+administration)\b/i.test(t)) {
    return { domain: "BUSINESS", subDomain: "BUSINESS_ADMINISTRATION", confidence: "HIGH" };
  }
  if (/\b(business|management|business\s+management|business\s+studies)\b/i.test(t)) {
    return { domain: "BUSINESS", subDomain: "MANAGEMENT_GENERAL", confidence: "MEDIUM" };
  }

  // 5. HEALTH & MEDICINE
  if (/\b(mbbs|medicine|medical|surgery|physician)\b/i.test(t)) {
    return { domain: "HEALTH_MEDICINE", subDomain: "GENERAL_MEDICINE", confidence: "HIGH" };
  }
  if (/\b(nursing|registered\s+nurse)\b/i.test(t)) {
    return { domain: "HEALTH_MEDICINE", subDomain: "NURSING", confidence: "HIGH" };
  }
  if (/\b(pharmacy|pharmaceutical|\bb\.?pharm\b|\bm\.?pharm\b)\b/i.test(t)) {
    return { domain: "HEALTH_MEDICINE", subDomain: "PHARMACY", confidence: "HIGH" };
  }
  if (/\b(public\s+health|\bmph\b|epidemiology)\b/i.test(t)) {
    return { domain: "HEALTH_MEDICINE", subDomain: "PUBLIC_HEALTH", confidence: "HIGH" };
  }
  if (/\b(physiotherapy|physical\s+therapy|\bbpt\b)\b/i.test(t)) {
    return { domain: "HEALTH_MEDICINE", subDomain: "PHYSIOTHERAPY", confidence: "HIGH" };
  }
  if (/\b(biomedical\s+science)\b/i.test(t)) {
    return { domain: "HEALTH_MEDICINE", subDomain: "BIOMEDICAL_SCIENCE", confidence: "HIGH" };
  }

  // 6. SCIENCE
  if (/\b(physics|astrophysics|geophysics)\b/i.test(t)) {
    return { domain: "SCIENCE", subDomain: "PHYSICS", confidence: "HIGH" };
  }
  if (/\b(chemistry|biochemistry|organic\s+chemistry)\b/i.test(t)) {
    return { domain: "SCIENCE", subDomain: "CHEMISTRY", confidence: "HIGH" };
  }
  if (/\b(mathematics|maths|statistics|actuarial)\b/i.test(t)) {
    return { domain: "SCIENCE", subDomain: "MATHEMATICS_STATISTICS", confidence: "HIGH" };
  }
  if (/\b(biology|zoology|botany|microbiology|molecular\s+biology|life\s+sciences?)\b/i.test(t)) {
    return { domain: "SCIENCE", subDomain: "BIOLOGICAL_SCIENCES", confidence: "HIGH" };
  }
  if (/\b(biotechnology|biotech)\b/i.test(t)) {
    return { domain: "SCIENCE", subDomain: "BIOTECHNOLOGY", confidence: "HIGH" };
  }
  if (/\b(environmental\s+science|ecology|sustainability)\b/i.test(t)) {
    return { domain: "SCIENCE", subDomain: "ENVIRONMENTAL_SCIENCE", confidence: "HIGH" };
  }
  if (/\b(b\.?sc\b|m\.?sc\b|natural\s+sciences?|science)\b/i.test(t)) {
    return { domain: "SCIENCE", subDomain: "GENERAL_SCIENCE", confidence: "MEDIUM" };
  }

  // 7. LAW
  if (/\b(corporate\s+law|business\s+law)\b/i.test(t)) {
    return { domain: "LAW", subDomain: "CORPORATE_LAW", confidence: "HIGH" };
  }
  if (/\b(international\s+law|human\s+rights\s+law)\b/i.test(t)) {
    return { domain: "LAW", subDomain: "INTERNATIONAL_LAW", confidence: "HIGH" };
  }
  if (/\b(llb|llm|law|legal\s+studies|juris\s+doctor|\bjd\b)\b/i.test(t)) {
    return { domain: "LAW", subDomain: "GENERAL_LAW", confidence: "HIGH" };
  }

  // 8. SOCIAL SCIENCES & HUMANITIES
  if (/\b(psychology|behavioral\s+science|cognitive\s+science)\b/i.test(t)) {
    return { domain: "SOCIAL_HUMANITIES", subDomain: "PSYCHOLOGY", confidence: "HIGH" };
  }
  if (/\b(sociology|social\s+work|anthropology)\b/i.test(t)) {
    return { domain: "SOCIAL_HUMANITIES", subDomain: "SOCIOLOGY", confidence: "HIGH" };
  }
  if (/\b(political\s+science|politics|public\s+policy|governance)\b/i.test(t)) {
    return { domain: "SOCIAL_HUMANITIES", subDomain: "POLITICAL_SCIENCE", confidence: "HIGH" };
  }
  if (/\b(international\s+relations|diplomacy|global\s+affairs)\b/i.test(t)) {
    return { domain: "SOCIAL_HUMANITIES", subDomain: "INTERNATIONAL_RELATIONS", confidence: "HIGH" };
  }
  if (/\b(literature|linguistics|english\s+literature)\b/i.test(t)) {
    return { domain: "SOCIAL_HUMANITIES", subDomain: "LITERATURE_LINGUISTICS", confidence: "HIGH" };
  }
  if (/\b(history|archaeology)\b/i.test(t)) {
    return { domain: "SOCIAL_HUMANITIES", subDomain: "HISTORY", confidence: "HIGH" };
  }
  if (/\b(philosophy|ethics)\b/i.test(t)) {
    return { domain: "SOCIAL_HUMANITIES", subDomain: "PHILOSOPHY", confidence: "HIGH" };
  }
  if (/\b(humanities|liberal\s+arts|\bba\b)\b/i.test(t)) {
    return { domain: "SOCIAL_HUMANITIES", subDomain: "GENERAL_HUMANITIES", confidence: "MEDIUM" };
  }

  // 9. ARTS, DESIGN & MEDIA
  if (/\b(graphic\s+design|ui\/ux|ux\s+design|user\s+experience|interaction\s+design)\b/i.test(t)) {
    return { domain: "ARTS_DESIGN_MEDIA", subDomain: "GRAPHIC_DESIGN", confidence: "HIGH" };
  }
  if (/\b(interior\s+design|interior\s+architecture)\b/i.test(t)) {
    return { domain: "ARTS_DESIGN_MEDIA", subDomain: "INTERIOR_DESIGN", confidence: "HIGH" };
  }
  if (/\b(animation|vfx|visual\s+effects|game\s+design|multimedia)\b/i.test(t)) {
    return { domain: "ARTS_DESIGN_MEDIA", subDomain: "ANIMATION_MULTIMEDIA", confidence: "HIGH" };
  }
  if (/\b(architecture|\bb\.?arch\b|\bm\.?arch\b)\b/i.test(t)) {
    return { domain: "ARTS_DESIGN_MEDIA", subDomain: "ARCHITECTURE", confidence: "HIGH" };
  }
  if (/\b(journalism|mass\s+communication|media\s+studies|public\s+relations)\b/i.test(t)) {
    return { domain: "ARTS_DESIGN_MEDIA", subDomain: "MEDIA_COMMUNICATION", confidence: "HIGH" };
  }
  if (/\b(fashion\s+design|apparel)\b/i.test(t)) {
    return { domain: "ARTS_DESIGN_MEDIA", subDomain: "FASHION_DESIGN", confidence: "HIGH" };
  }
  if (/\b(fine\s+arts|visual\s+arts|\bbfa\b)\b/i.test(t)) {
    return { domain: "ARTS_DESIGN_MEDIA", subDomain: "FINE_ARTS", confidence: "HIGH" };
  }

  // 10. HOSPITALITY & TOURISM
  if (/\b(culinary|bakery|cooking)\b/i.test(t)) {
    return { domain: "HOSPITALITY_TOURISM", subDomain: "CULINARY_ARTS", confidence: "HIGH" };
  }
  if (/\b(tourism|travel\s+management|airline|aviation\s+hospitality)\b/i.test(t)) {
    return { domain: "HOSPITALITY_TOURISM", subDomain: "TOURISM_EVENT_MANAGEMENT", confidence: "HIGH" };
  }
  if (/\b(hotel\s+management|hospitality|\bhm\b|resort)\b/i.test(t)) {
    return { domain: "HOSPITALITY_TOURISM", subDomain: "HOSPITALITY_MANAGEMENT", confidence: "HIGH" };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Source Domain Classifier
// ---------------------------------------------------------------------------

/**
 * Classifies a student's source academic background from normalized qualifications.
 *
 * Checks highest/tertiary qualifications first.
 * Never inspects `boardOrUniversity`.
 */
export function classifySourceDomain(
  qualifications?: NormalizedQualification[]
): AcademicField {
  if (!qualifications || qualifications.length === 0) {
    return {
      domain: "UNKNOWN",
      subDomain: "UNKNOWN_SUBDOMAIN",
      confidence: "LOW",
      classifiedFrom: "none",
    };
  }

  // Filter & sort qualifications to prioritize Tertiary / Higher Education over secondary/10th
  const sorted = [...qualifications].sort((a, b) => {
    const isHigherA = /undergraduate|postgraduate|bachelor|master|degree|graduat/i.test(
      `${a.levelOfStudy || ""} ${a.qualification || ""}`
    );
    const isHigherB = /undergraduate|postgraduate|bachelor|master|degree|graduat/i.test(
      `${b.levelOfStudy || ""} ${b.qualification || ""}`
    );
    if (isHigherA && !isHigherB) return -1;
    if (!isHigherA && isHigherB) return 1;

    // Secondary: completionYear descending
    const yearA = parseInt(a.completionYear || "0", 10);
    const yearB = parseInt(b.completionYear || "0", 10);
    return yearB - yearA;
  });

  // Evaluate candidate qualifications in order
  for (const qual of sorted) {
    // Priority 1: explicit fieldOfStudy
    if (qual.fieldOfStudy && qual.fieldOfStudy.trim().length > 0) {
      const match = matchDiscipline(qual.fieldOfStudy.trim());
      if (match) {
        return {
          domain: match.domain,
          subDomain: match.subDomain,
          confidence: match.confidence,
          classifiedFrom: `qualification.fieldOfStudy: "${qual.fieldOfStudy}"`,
          rawSource: qual.fieldOfStudy,
        };
      }
    }

    // Priority 2: qualification title
    if (qual.qualification && qual.qualification.trim().length > 0) {
      const match = matchDiscipline(qual.qualification.trim());
      if (match) {
        return {
          domain: match.domain,
          subDomain: match.subDomain,
          confidence: match.confidence,
          classifiedFrom: `qualification.title: "${qual.qualification}"`,
          rawSource: qual.qualification,
        };
      }
    }

    // Priority 3: institution if it explicitly indicates a specialized domain (e.g. "Rizvi Law College")
    if (qual.institution && qual.institution.trim().length > 0) {
      const match = matchDiscipline(qual.institution.trim());
      if (match) {
        return {
          domain: match.domain,
          subDomain: match.subDomain,
          confidence: "MEDIUM",
          classifiedFrom: `qualification.institution: "${qual.institution}"`,
          rawSource: qual.institution,
        };
      }
    }

    // Priority 4: levelOfStudy if it mentions a discipline (e.g. "Senior Secondary (Science)")
    if (qual.levelOfStudy && qual.levelOfStudy.trim().length > 0) {
      const match = matchDiscipline(qual.levelOfStudy.trim());
      if (match) {
        return {
          domain: match.domain,
          subDomain: match.subDomain,
          confidence: "LOW",
          classifiedFrom: `qualification.levelOfStudy: "${qual.levelOfStudy}"`,
          rawSource: qual.levelOfStudy,
        };
      }
    }
  }

  // Step 6: UNKNOWN if no match can be established
  return {
    domain: "UNKNOWN",
    subDomain: "UNKNOWN_SUBDOMAIN",
    confidence: "LOW",
    classifiedFrom: "none",
  };
}

// ---------------------------------------------------------------------------
// Target Domain Classifier
// ---------------------------------------------------------------------------

/**
 * Classifies the target program domain from a NormalizedAppliedProgram.
 */
export function classifyTargetDomain(
  program?: NormalizedAppliedProgram | null
): AcademicField {
  if (!program) {
    return {
      domain: "UNKNOWN",
      subDomain: "UNKNOWN_SUBDOMAIN",
      confidence: "LOW",
      classifiedFrom: "none",
    };
  }

  // Priority 1: Course title
  if (program.course && program.course.trim().length > 0) {
    const match = matchDiscipline(program.course.trim());
    if (match) {
      return {
        domain: match.domain,
        subDomain: match.subDomain,
        confidence: match.confidence,
        classifiedFrom: `targetProgram.course: "${program.course}"`,
        rawSource: program.course,
      };
    }
  }

  // Priority 2: courseCategory fallback (if not "Other")
  if (
    program.courseCategory &&
    program.courseCategory.trim().length > 0 &&
    program.courseCategory !== "Other"
  ) {
    const match = matchDiscipline(program.courseCategory.trim());
    if (match) {
      return {
        domain: match.domain,
        subDomain: match.subDomain,
        confidence: "MEDIUM",
        classifiedFrom: `targetProgram.courseCategory: "${program.courseCategory}"`,
        rawSource: program.courseCategory,
      };
    }
  }

  // Step 6: UNKNOWN
  return {
    domain: "UNKNOWN",
    subDomain: "UNKNOWN_SUBDOMAIN",
    confidence: "LOW",
    classifiedFrom: "none",
  };
}
