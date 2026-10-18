/**
 * features/document-generator/utils/buildAcademicProfileSummary.ts
 *
 * Generates a clean, simple, and professional First-Person Academic Profile / About Me
 * tailored for European university admissions.
 *
 * Key Principles:
 * 1. First-person voice ("My name is...", "I have completed...")
 * 2. Strictly student-centric: NEVER includes parents' names, jobs, or private family details
 * 3. Accurate academic level:
 *    - High school / Grade 12th graduates: aims to pursue a Bachelor's degree (never "pursuing Master's")
 *    - University / Bachelor's graduates: aims to pursue a Master's degree
 * 4. Simple, natural, and honest English — avoiding heavy AI buzzwords.
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

export function buildAcademicProfileSummary(options: BuildAcademicProfileOptions): string {
  const {
    studentName = "The applicant",
    city,
    country,
    primaryDegree = "Class 12",
    domainName,
    strengths = [],
    targetCourse,
    degreeLevel,
    destinationCountry,
  } = options;

  // 1. Origin / Location
  const locationParts = [city, country || "India"].filter(Boolean);
  const locationStr = locationParts.length > 0 ? locationParts.join(", ") : "India";

  // Determine if student is applying for Bachelor's or Master's
  const normDegree = (primaryDegree || "").toLowerCase();
  const normLevel = (degreeLevel || "").toLowerCase();

  const isBachelorsTarget =
    /bachelor|undergraduate|\bug\b/i.test(normLevel) ||
    /12|10\+2|high\s*school|secondary/i.test(normDegree);

  // Destination phrasing (e.g. "in Europe", "in Italy", "in Germany")
  const destPart = destinationCountry ? ` in ${destinationCountry}` : " in Europe";

  // Target course phrasing
  const courseName = targetCourse?.trim() || (domainName ? domainName : "my chosen field");

  if (isBachelorsTarget) {
    // ── Bachelor's Applicant (High School / Class 12 Graduate) ───────────────
    // Intro
    const p1 = `My name is ${studentName}, and I am from ${locationStr}.`;

    // Academic stream in Grade 12
    const stream = domainName || primaryDegree || "Science and Mathematics";
    const p2 = `I have completed my Class 12 education with a focus on ${stream}. Through my school studies, I developed a strong interest in programming, problem-solving, and logical thinking.`;

    // Hands-on & personal qualities
    let p3 = "I enjoy working on practical projects, learning new skills, and exploring how technology works.";
    if (strengths.length > 0) {
      const topStrengths = strengths.slice(0, 2).map((s) => s.toLowerCase()).join(" and ");
      p3 = `I enjoy working on practical projects and developing my skills in ${topStrengths}. These experiences have helped me develop logical thinking and a habit of learning new things independently.`;
    }
    const p4 = "I consider myself a hardworking, curious, and responsible student who values education and personal growth.";

    // Future aspiration (Bachelor's degree in Europe)
    const p5 = `Looking ahead, I want to pursue a Bachelor’s degree in ${courseName}${destPart}. My goal is to build strong foundational knowledge at university and prepare myself for a successful professional career.`;

    return `${p1} ${p2} ${p3} ${p4} ${p5}`.replace(/\s{2,}/g, " ").trim();
  } else {
    // ── Master's Applicant (Undergraduate Graduate / Final Year) ──────────────
    const p1 = `My name is ${studentName}, and I am from ${locationStr}.`;

    const qual = primaryDegree && !/high\s*school|12/i.test(primaryDegree) ? primaryDegree : "Bachelor's degree";
    const p2 = `I have completed my ${qual}${domainName ? ` with a focus on ${domainName}` : ""}. During my undergraduate studies, I focused on building both strong theoretical understanding and practical problem-solving skills.`;

    let p3 = "I actively engage in academic projects, coursework, and practical assignments to apply my knowledge to real challenges.";
    if (strengths.length > 0) {
      const topStrengths = strengths.slice(0, 2).map((s) => s.toLowerCase()).join(" and ");
      p3 = `I have actively applied my skills in ${topStrengths} through academic projects and coursework. These experiences have strengthened my analytical thinking, research abilities, and discipline.`;
    }
    const p4 = "I consider myself a dedicated, focused, and adaptable learner committed to continuous academic and personal growth.";

    const p5 = `Looking ahead, I aim to pursue a Master’s degree in ${courseName}${destPart}. My goal is to gain advanced specialized knowledge, expand my horizons, and build a rewarding career in this field.`;

    return `${p1} ${p2} ${p3} ${p4} ${p5}`.replace(/\s{2,}/g, " ").trim();
  }
}
