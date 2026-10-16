/**
 * features/document-generator/utils/buildAcademicProfileSummary.ts
 *
 * Generates a comprehensive, personalized Academic Profile / About Me summary
 * incorporating:
 * 1. Student Name
 * 2. Origin City & Geographic Context
 * 3. Family Background & Values
 * 4. Academic Foundation & What Degree They Are Pursuing (with accurate level)
 * 5. Impactful Closing Statement
 */

export interface BuildAcademicProfileOptions {
  studentName?: string;
  city?: string;
  country?: string;
  parents?: {
    father?: { name?: string; occupation?: string; department?: string; employmentType?: string };
    mother?: { name?: string; occupation?: string; department?: string; employmentType?: string };
  };
  familyProfile?: Record<string, unknown>;
  primaryDegree?: string;
  domainName?: string;
  strengths?: string[];
  targetCourse?: string;
  degreeLevel?: string;
  targetDomainName?: string;
  destinationCountry?: string;
}

function isValidName(val?: string | null): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  return (
    trimmed.length > 0 &&
    !/^(?:n\.?a\.?|none|nil|not\s+applicable|-)$/i.test(trimmed)
  );
}

export function buildAcademicProfileSummary(options: BuildAcademicProfileOptions): string {
  const {
    studentName = "The applicant",
    city,
    country,
    parents,
    primaryDegree = "High School Education",
    domainName,
    strengths = [],
    targetCourse,
    degreeLevel,
    targetDomainName,
  } = options;

  // 1. Name & City / Origin statement
  const locationParts = [city, country].filter(Boolean);
  const locationStr = locationParts.length > 0 ? `from ${locationParts.join(", ")}` : "";
  const academicStream = domainName ? ` (${domainName})` : "";
  const sentence1 = `${studentName} is a dedicated and ambitious student ${locationStr ? locationStr + ", " : ""}who has established a strong academic foundation in ${primaryDegree}${academicStream}.`.replace(/\s{2,}/g, " ");

  // 2. Family Background statement
  const motherName = isValidName(parents?.mother?.name) ? parents?.mother?.name?.trim() : undefined;
  const motherOcc = parents?.mother?.occupation?.trim();
  const fatherName = isValidName(parents?.father?.name) ? parents?.father?.name?.trim() : undefined;
  const fatherOcc = parents?.father?.occupation?.trim();

  let sentence2 = "";
  if (motherName && fatherName) {
    const mDetails = motherOcc ? `${motherName} (${motherOcc})` : motherName;
    const fDetails = fatherOcc ? `${fatherName} (${fatherOcc})` : fatherName;
    sentence2 = `Raised in a dedicated family environment by his parents, ${fDetails} and ${mDetails}, he has cultivated strong personal discipline, integrity, and a steadfast commitment to higher education.`;
  } else if (motherName) {
    const mDetails = motherOcc ? `${motherName} (${motherOcc})` : motherName;
    sentence2 = `Raised in a supportive family by his mother, ${mDetails}, he has developed resilience, a grounded work ethic, and a deep-seated passion for learning and technology.`;
  } else if (fatherName) {
    const fDetails = fatherOcc ? `${fatherName} (${fatherOcc})` : fatherName;
    sentence2 = `Raised in a supportive family by his father, ${fDetails}, he has developed a strong work ethic, intellectual discipline, and a deep-seated dedication to academic growth.`;
  } else {
    sentence2 = `Coming from a supportive family background${city ? ` in ${city}` : ""} that prioritizes academic excellence, he has fostered intellectual curiosity and a strong foundation of personal discipline.`;
  }

  // 3. Academic strengths & practical application
  const keyStrengths = strengths.slice(0, 2);
  let sentence3 = "";
  if (keyStrengths.length > 0) {
    sentence3 = `Bringing demonstrated strengths in ${keyStrengths.join(" and ")}, he has actively sought opportunities to apply theoretical learning to practical problem-solving.`;
  }

  // 4. What degree he is pursuing (accurate degree level)
  const normLevel = (degreeLevel || "").toLowerCase();
  let levelPhrase = "higher education studies";
  if (/bachelor|undergraduate|\bug\b/i.test(normLevel)) {
    levelPhrase = "a Bachelor's degree";
  } else if (/master|postgraduate|\bpg\b/i.test(normLevel)) {
    levelPhrase = "a Master's degree";
  } else if (/phd|doctorate/i.test(normLevel)) {
    levelPhrase = "doctoral research";
  }

  const courseStr = targetCourse ? ` in ${targetCourse}` : "";
  const domainContext = targetDomainName ? ` (${targetDomainName})` : "";
  const sentence4 = `He is actively pursuing ${levelPhrase}${courseStr}${domainContext}, aiming to deepen his analytical rigor and develop specialized expertise.`;

  // 5. Inspiring Closing Line
  const sentence5 = `Committed to academic excellence and purposeful innovation, he aspires to contribute meaningfully to collaborative research and create impactful solutions in the field.`;

  const paragraph = [sentence1, sentence2, sentence3, sentence4, sentence5]
    .filter(Boolean)
    .join(" ");

  return paragraph.replace(/\s{2,}/g, " ").trim();
}
