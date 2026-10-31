export function sanitizeAddressValue(raw: string): string {
  if (!raw) return "";
  let clean = raw.trim();
  // Strip surrounding quotes
  clean = clean.replace(/^['"`]+|['"`]+$/g, "").trim();
  // Strip trailing conversational sentences or instructions
  clean = clean.replace(/\s+(?:to|in|for)\s+(?:the\s+)?(?:about\s+me|cv|profile|section).*$/i, "");
  clean = clean.replace(/\s+as\s+requested.*$/i, "");
  clean = clean.replace(/\s+proceed\s+with\s+it.*$/i, "");
  clean = clean.replace(/^['"`]+|['"`]+$/g, "").trim();
  clean = clean.replace(/[.,;]+$/, "").trim();

  // If user typed "bhopal india", normalize to "Bhopal, India"
  if (/^[a-zA-Z\s]+$/.test(clean) && !clean.includes(",")) {
    const parts = clean.split(/\s+/);
    if (parts.length === 2) {
      clean = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(", ");
    } else {
      clean = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
    }
  }

  return clean;
}

import type { DocumentData } from "@/types/document";

/**
 * Synchronizes sections edited in the Caret Editor back into the structured DocumentData model.
 * Ensures that typed-out sections, customized text, empty sections, or deleted sections
 * are immediately and accurately reflected in the Cairo-compliant Europass layout.
 */
export function syncSectionsToCvData(
  sections: { heading?: string; content: string }[],
  baseCv: DocumentData
): DocumentData {
  const updatedCv: DocumentData = JSON.parse(JSON.stringify(baseCv));

  // 1. About Me
  const aboutSec = sections.find((s) => s.heading?.toLowerCase().includes("about me"));
  if (aboutSec && aboutSec.content.trim()) {
    // Strip accidental contact/address line pollution from About Me summary
    const cleanAbout = aboutSec.content
      .replace(/(?:\r?\n|\s+)(?:Home\s+Address|Address)\s*[:\-]\s*[^\n.]+(?:\.)?/gi, "")
      .trim();
    updatedCv.aboutMe = cleanAbout;
  } else if (aboutSec && !aboutSec.content.trim()) {
    updatedCv.aboutMe = "";
  } else if (!aboutSec) {
    updatedCv.aboutMe = "";
    if (updatedCv.sectionOrder) {
      updatedCv.sectionOrder = updatedCv.sectionOrder.filter((id) => id !== "aboutMe" && id !== "about");
    }
  }

  // 2. Work Experience / Internships
  const workSec = sections.find(
    (s) =>
      s.heading?.toLowerCase().includes("work experience") ||
      s.heading?.toLowerCase().includes("internship") ||
      s.heading?.toLowerCase().includes("employment")
  );
  if (workSec && workSec.content.trim()) {
    const entries = workSec.content.split(/\n\n+/).filter(Boolean);
    updatedCv.internships = entries.map((entryStr, idx) => {
      const lines = entryStr.split("\n").map((l) => l.trim()).filter(Boolean);
      const roleLine = lines[0] || "Role";
      const compLine = lines[1] || "";
      const datesMatch = compLine.match(/\[\s*([^\]]+)\s*\]/);
      const withoutDates = compLine.replace(/\[\s*[^\]]+\s*\]/, "").trim();
      let compName = withoutDates;
      let locName = "";
      if (withoutDates.includes("|")) {
        const p = withoutDates.split("|").map((x) => x.trim()).filter(Boolean);
        compName = p[0] || "Company";
        locName = p.slice(1).join(", ").replace(/^Location:\s*/i, "").trim();
      } else if (/Location:\s*/i.test(withoutDates)) {
        const locM = withoutDates.match(/Location:\s*([^,.\n]+)/i);
        if (locM) locName = locM[1].trim();
        compName = withoutDates.replace(/Location:\s*[^,.\n]+/i, "").trim();
      }
      const descLines = lines.slice(2);
      return {
        id: `intern-${idx}`,
        role: roleLine,
        company: compName || "Company",
        location: locName || undefined,
        startDate: datesMatch ? datesMatch[1].split(/[–-]/)[0]?.trim() || "" : "",
        endDate: datesMatch ? datesMatch[1].split(/[–-]/)[1]?.trim() || "" : "",
        description: descLines.join("\n"),
      };
    });
  } else if (workSec && !workSec.content.trim()) {
    updatedCv.internships = [];
  } else if (!workSec) {
    updatedCv.internships = [];
    if (updatedCv.sectionOrder) {
      updatedCv.sectionOrder = updatedCv.sectionOrder.filter((id) => id !== "internships");
    }
  }

  // 3. Education
  const eduSec = sections.find(
    (s) =>
      s.heading?.toLowerCase().includes("education") ||
      s.heading?.toLowerCase().includes("training")
  );
  if (eduSec && eduSec.content.trim()) {
    const entries = eduSec.content.split(/\n\n+/).filter(Boolean);
    updatedCv.education = entries.map((entryStr, idx) => {
      const lines = entryStr.split("\n").map((l) => l.trim()).filter(Boolean);
      const qual = lines[0] || "Degree";
      const instLine = lines[1] || "";
      const datesMatch = instLine.match(/\[\s*([^\]]+)\s*\]/);
      const instName = instLine.replace(/\[\s*[^\]]+\s*\]/, "").trim();
      const metaLine = lines.slice(2).join(" | ");
      const gradeMatch = metaLine.match(/Final grade:\s*([^|]+)/i);
      const locMatch = metaLine.match(/Location:\s*([^|]+)/i);
      const webMatch = metaLine.match(/Website:\s*([^|]+)/i);
      return {
        id: `edu-${idx}`,
        qualification: qual,
        institution: instName,
        startDate: datesMatch ? datesMatch[1].split("–")[0]?.trim() || "" : "",
        endDate: datesMatch ? datesMatch[1].split("–")[1]?.trim() || "" : "",
        finalGrade: gradeMatch ? gradeMatch[1].trim() : undefined,
        address: locMatch ? locMatch[1].trim() : undefined,
        website: webMatch ? webMatch[1].trim() : undefined,
      };
    });
  } else if (eduSec && !eduSec.content.trim()) {
    updatedCv.education = [];
  } else if (!eduSec) {
    updatedCv.education = [];
    if (updatedCv.sectionOrder) {
      updatedCv.sectionOrder = updatedCv.sectionOrder.filter((id) => id !== "education");
    }
  }

  // 4. English Language Certificate
  const engSec = sections.find(
    (s) =>
      s.heading?.toLowerCase().includes("english language certificate") ||
      s.heading?.toLowerCase().includes("ielts") ||
      s.heading?.toLowerCase().includes("language certificate")
  );
  if (engSec && engSec.content.trim()) {
    const content = engSec.content;
    const bandMatch = content.match(/(?:Overall Band Score|Overall|Band|Score)\s*[-:]\s*([0-9.]+)/i);
    const listeningMatch = content.match(/Listening\s*[-:]\s*([0-9.]+)/i);
    const readingMatch = content.match(/Reading\s*[-:]\s*([0-9.]+)/i);
    const writingMatch = content.match(/Writing\s*[-:]\s*([0-9.]+)/i);
    const speakingMatch = content.match(/Speaking\s*[-:]\s*([0-9.]+)/i);
    const trfMatch = content.match(/(?:Test Report Form Number|TRF Number|TRF)\s*[-:]\s*([a-zA-Z0-9]+)/i);
    const dateMatch = content.match(/(?:Issue Date|Date Taken|Test Date|Date)\s*[-:]\s*([^\n]+)/i);

    updatedCv.englishCertificate = {
      examName: "IELTS",
      score: bandMatch ? bandMatch[1].trim() : updatedCv.englishCertificate?.score || "7.5",
      listening: listeningMatch ? listeningMatch[1].trim() : updatedCv.englishCertificate?.listening,
      reading: readingMatch ? readingMatch[1].trim() : updatedCv.englishCertificate?.reading,
      writing: writingMatch ? writingMatch[1].trim() : updatedCv.englishCertificate?.writing,
      speaking: speakingMatch ? speakingMatch[1].trim() : updatedCv.englishCertificate?.speaking,
      trfNumber: trfMatch ? trfMatch[1].trim() : updatedCv.englishCertificate?.trfNumber,
      dateTaken: dateMatch ? dateMatch[1].trim() : updatedCv.englishCertificate?.dateTaken,
    };
  } else if (engSec && !engSec.content.trim()) {
    updatedCv.englishCertificate = undefined;
  } else if (!engSec) {
    updatedCv.englishCertificate = undefined;
    if (updatedCv.sectionOrder) {
      updatedCv.sectionOrder = updatedCv.sectionOrder.filter((id) => id !== "englishCertificate");
    }
  }

  // 5. Skills
  const skillsSec = sections.find(
    (s) =>
      s.heading?.toLowerCase().includes("skills") &&
      !s.heading?.toLowerCase().includes("language")
  );
  if (skillsSec && skillsSec.content.trim()) {
    const skillList = skillsSec.content
      .split(/[/•,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    updatedCv.skills = skillList.map((name, idx) => ({ id: `skill-${idx}`, name }));
  } else if (skillsSec && !skillsSec.content.trim()) {
    updatedCv.skills = [];
  } else if (!skillsSec) {
    updatedCv.skills = [];
    if (updatedCv.sectionOrder) {
      updatedCv.sectionOrder = updatedCv.sectionOrder.filter((id) => id !== "skills");
    }
  }

  // 6. Certifications
  const certSec = sections.find((s) => s.heading?.toLowerCase().includes("certification"));
  if (certSec && certSec.content.trim()) {
    const rawLines = certSec.content
      .split("\n")
      .map((l) => l.trim().replace(/^[•\s*-]+/, "").trim())
      .filter(Boolean);
    updatedCv.certifications = rawLines.map((line, idx) => {
      // Extract date if present: [ 2023 ] or (2023)
      const dateMatch = line.match(/\[\s*([^\]]+)\s*\]/) || line.match(/\((20\d\d)\)/);
      const completionDate = dateMatch ? dateMatch[1].trim() : undefined;
      const cleanLine = line.replace(/\[\s*[^\]]+\s*\]/, "").replace(/\((20\d\d)\)/, "").trim();

      let name = cleanLine;
      let provider: string | undefined = undefined;

      const delimiterMatch = cleanLine.match(/\s*(?:–|—|-|\||\bby\b|\bfrom\b)\s*/i);
      if (delimiterMatch && delimiterMatch.index !== undefined) {
        name = cleanLine.slice(0, delimiterMatch.index).trim();
        provider = cleanLine.slice(delimiterMatch.index + delimiterMatch[0].length).trim();
      }

      return {
        id: `cert-${idx}`,
        name: name || line,
        provider: provider && provider.toLowerCase() !== "online course provider" ? provider : undefined,
        completionDate,
      };
    });
  } else if (certSec && !certSec.content.trim()) {
    updatedCv.certifications = [];
  } else if (!certSec) {
    updatedCv.certifications = [];
    if (updatedCv.sectionOrder) {
      updatedCv.sectionOrder = updatedCv.sectionOrder.filter((id) => id !== "certifications");
    }
  }

  // 7. Hobbies
  const hobbySec = sections.find((s) => s.heading?.toLowerCase().includes("hobbies"));
  if (hobbySec && hobbySec.content.trim()) {
    const hobbiesList = hobbySec.content
      .split(/[•,\n]+/)
      .map((h) => h.trim())
      .filter(Boolean);
    updatedCv.hobbies = hobbiesList.map((name, idx) => ({ id: `hobby-${idx}`, name }));
  } else if (hobbySec && !hobbySec.content.trim()) {
    updatedCv.hobbies = [];
  } else if (!hobbySec) {
    updatedCv.hobbies = [];
    if (updatedCv.sectionOrder) {
      updatedCv.sectionOrder = updatedCv.sectionOrder.filter((id) => id !== "hobbies");
    }
  }

  // 8. Declaration / Visa Compliance Intent
  const declSec = sections.find(
    (s) =>
      s.heading?.toLowerCase().includes("declaration") ||
      s.heading?.toLowerCase().includes("compliance") ||
      s.heading?.toLowerCase().includes("genuine")
  );
  if (declSec && declSec.content.trim()) {
    updatedCv.declaration = declSec.content;
  } else if (declSec && !declSec.content.trim()) {
    updatedCv.declaration = "";
  } else if (!declSec) {
    updatedCv.declaration = "";
    if (updatedCv.sectionOrder) {
      updatedCv.sectionOrder = updatedCv.sectionOrder.filter((id) => id !== "declaration");
    }
  }

  // 9. Language Skills & Mother Tongue
  const langSec = sections.find(
    (s) =>
      s.heading?.toLowerCase().includes("language") &&
      !s.heading?.toLowerCase().includes("certificate") &&
      !s.heading?.toLowerCase().includes("ielts")
  );
  if (langSec && langSec.content.trim()) {
    const raw = langSec.content;
    const mtMatch =
      raw.match(/mother\s*tou?ngue(?:\(s\))?\s*[-:]\s*([^\n,]+)/i) ||
      raw.match(/(?:native\s*language|mother\s*language)[-:]\s*([^\n,]+)/i);
    if (mtMatch && mtMatch[1]) {
      updatedCv.motherTongue = mtMatch[1].trim();
    }
    const otherMatch = raw.match(/other\s*language(?:\(s\))?\s*[-:]\s*([^\n]+)/i);
    if (otherMatch && otherMatch[1] && otherMatch[1].trim()) {
      const cleanOther = otherMatch[1].trim();
      // If user typed "remove other language" or "none" or empty, clear languages
      if (/^(?:none|nil|n\/a|remove|no\s+other|empty)$/i.test(cleanOther) || cleanOther.toLowerCase().includes("remove the other")) {
        updatedCv.languages = [];
      } else {
        const otherLangs = cleanOther.split(/[,/•\n]+/).map((l) => l.trim()).filter(Boolean);
        if (otherLangs.length > 0) {
          updatedCv.languages = otherLangs.map((lang, idx) => {
            const existing = (baseCv.languages || []).find((l) => l.language?.toLowerCase() === lang.toLowerCase());
            return existing || {
              id: `lang-${idx}`,
              language: lang,
              level: "Proficient",
            };
          });
        } else {
          updatedCv.languages = [];
        }
      }
    } else {
      // If section does NOT contain "Other language(s):", clear languages so previous defaults are removed
      updatedCv.languages = [];
    }
  } else if (langSec && !langSec.content.trim()) {
    updatedCv.motherTongue = "";
    updatedCv.languages = [];
  } else if (!langSec) {
    updatedCv.motherTongue = "";
    updatedCv.languages = [];
    if (updatedCv.sectionOrder) {
      updatedCv.sectionOrder = updatedCv.sectionOrder.filter((id) => id !== "languages");
    }
  }

  // 10. Personal Details & Home Address Sync
  const personalSec = sections.find(
    (s) =>
      s.heading?.toLowerCase().includes("personal") ||
      s.heading?.toLowerCase().includes("contact") ||
      s.heading?.toLowerCase().includes("address")
  );
  if (personalSec && personalSec.content.trim()) {
    const raw = personalSec.content;
    const addrMatch =
      raw.match(/(?:home\s*address|home|address)\s*[-:]\s*([^\n]+)/i) ||
      raw.match(/(?:residing at|living in|location)\s*[-:]?\s*([^\n]+)/i);
    if (addrMatch && addrMatch[1]?.trim()) {
      const sanitized = sanitizeAddressValue(addrMatch[1]);
      if (sanitized) {
        updatedCv.personal = {
          ...updatedCv.personal,
          address: sanitized,
        };
      }
    }
  }

  // 11. Academic Projects
  const projSec = sections.find(
    (s) => s.heading?.toLowerCase().includes("project")
  );
  if (projSec && projSec.content.trim()) {
    const entries = projSec.content.split(/\n\n+/).filter(Boolean);
    updatedCv.academicProjects = entries.map((entryStr, idx) => {
      const lines = entryStr.split("\n").map((l) => l.trim()).filter(Boolean);
      return {
        id: `proj-${idx}`,
        title: lines[0] || "Academic Project",
        role: lines[1] || "",
        description: lines.slice(2).join("\n"),
      };
    });
  }

  // 12. Achievements & Awards
  const achSec = sections.find(
    (s) => s.heading?.toLowerCase().includes("achievement") || s.heading?.toLowerCase().includes("award")
  );
  if (achSec && achSec.content.trim()) {
    const entries = achSec.content.split(/[•\n]+/).map((l) => l.trim()).filter(Boolean);
    updatedCv.achievements = entries.map((ach, idx) => ({
      id: `ach-${idx}`,
      title: ach,
    }));
  }

  // 13. Leadership & Responsibilities
  const leaderSec = sections.find(
    (s) =>
      s.heading?.toLowerCase().includes("leadership") ||
      s.heading?.toLowerCase().includes("responsibilit")
  );
  if (leaderSec && leaderSec.content.trim()) {
    const entries = leaderSec.content.split(/\n\n+/).filter(Boolean);
    updatedCv.leadershipActivities = entries.map((entryStr, idx) => {
      const lines = entryStr.split("\n").map((l) => l.trim()).filter(Boolean);
      const activityLine = lines[0] || "Leadership Role";
      const orgLine = lines[1] || "";
      const datesMatch = orgLine.match(/\[\s*([^\]]+)\s*\]/);
      const orgName = orgLine.replace(/\[\s*[^\]]+\s*\]/, "").trim();
      const descLines = lines.slice(2);
      return {
        id: `leader-${idx}`,
        activity: activityLine,
        organisation: orgName || undefined,
        duration: datesMatch ? datesMatch[1].trim() : undefined,
        description: descLines.join("\n") || undefined,
      };
    });
  } else if (leaderSec && !leaderSec.content.trim()) {
    updatedCv.leadershipActivities = [];
  }

  // 14. Academic Interests
  const interestSec = sections.find(
    (s) =>
      s.heading?.toLowerCase().includes("academic interest") ||
      (s.heading?.toLowerCase().includes("interest") && !s.heading?.toLowerCase().includes("hobb"))
  );
  if (interestSec && interestSec.content.trim()) {
    const entries = interestSec.content
      .split(/[,•\n]+/)
      .map((l) => l.trim().replace(/^[•\-*0-9.)\s]+/, "").trim())
      .filter(Boolean);
    updatedCv.academicInterests = entries.map((name, idx) => ({ id: `interest-${idx}`, name }));
  } else if (interestSec && !interestSec.content.trim()) {
    updatedCv.academicInterests = [];
  }

  // 15. Volunteering
  const volSec = sections.find(
    (s) => s.heading?.toLowerCase().includes("volunteer") || s.heading?.toLowerCase().includes("community")
  );
  if (volSec && volSec.content.trim()) {
    const entries = volSec.content.split(/\n\n+/).filter(Boolean);
    updatedCv.volunteering = entries.map((entryStr, idx) => {
      const lines = entryStr.split("\n").map((l) => l.trim()).filter(Boolean);
      const roleLine = lines[0] || "Volunteer";
      const orgLine = lines[1] || "";
      const datesMatch = orgLine.match(/\[\s*([^\]]+)\s*\]/);
      const orgName = orgLine.replace(/\[\s*[^\]]+\s*\]/, "").trim();
      const descLines = lines.slice(2);
      return {
        id: `vol-${idx}`,
        role: roleLine,
        organization: orgName || undefined,
        startDate: datesMatch ? datesMatch[1].split(/[–-]/)[0]?.trim() || "" : "",
        endDate: datesMatch ? datesMatch[1].split(/[–-]/)[1]?.trim() || "" : "",
        description: descLines.join("\n") || undefined,
      };
    });
  } else if (volSec && !volSec.content.trim()) {
    updatedCv.volunteering = [];
  }

  // 16. Recommendations
  const recSec = sections.find(
    (s) => s.heading?.toLowerCase().includes("recommendation") || s.heading?.toLowerCase().includes("referee")
  );
  if (recSec && recSec.content.trim()) {
    const entries = recSec.content.split(/\n\n+/).filter(Boolean);
    updatedCv.recommendations = entries.map((entryStr, idx) => {
      const lines = entryStr.split("\n").map((l) => l.trim()).filter(Boolean);
      return {
        id: `rec-${idx}`,
        recommenderName: lines[0] || "Recommender",
        recommenderTitle: lines[1] || undefined,
        organization: lines[2] || undefined,
        text: lines.slice(3).join("\n") || undefined,
      };
    });
  } else if (recSec && !recSec.content.trim()) {
    updatedCv.recommendations = [];
  }

  // 17. Map dynamic section order from sections array for Europass template
  const headingToSectionId = (heading: string): string | null => {
    const h = heading.toLowerCase();
    if (h.includes("about me") || h.includes("about")) return "aboutMe";
    if (h.includes("education") || h.includes("training")) return "education";
    if (h.includes("work") || h.includes("internship") || h.includes("employment")) return "internships";
    if (h.includes("english") || h.includes("ielts") || h.includes("toefl")) return "englishCertificate";
    if (h.includes("language")) return "languages";
    if (h.includes("digital") || h.includes("skill")) return "skills";
    if (h.includes("certification") || h.includes("certificate")) return "certifications";
    if (h.includes("academic interest") || (h.includes("interest") && !h.includes("hobb"))) return "academicInterests";
    if (h.includes("hobbi") || h.includes("interest")) return "hobbies";
    if (h.includes("project")) return "academicProjects";
    if (h.includes("achievement") || h.includes("award")) return "achievements";
    if (h.includes("leadership") || h.includes("responsibilit") || h.includes("extracurricular")) return "leadershipActivities";
    if (h.includes("volunteer") || h.includes("community")) return "volunteering";
    if (h.includes("recommendation") || h.includes("referee")) return "recommendations";
    if (h.includes("declaration") || h.includes("compliance") || h.includes("genuine")) return "declaration";
    return null;
  };

  const detectedOrder: string[] = [];
  for (const sec of sections) {
    if (sec.heading) {
      const id = headingToSectionId(sec.heading);
      if (id && !detectedOrder.includes(id)) {
        detectedOrder.push(id);
      }
    }
  }

  // Preserve existing sections from baseCv.sectionOrder that weren't in sections,
  // BUT do not re-add sections that were explicitly removed from sections
  const removedSectionIds = new Set<string>();
  if (!aboutSec) { removedSectionIds.add("aboutMe"); removedSectionIds.add("about"); }
  if (!workSec) removedSectionIds.add("internships");
  if (!eduSec) removedSectionIds.add("education");
  if (!engSec) removedSectionIds.add("englishCertificate");
  if (!skillsSec) removedSectionIds.add("skills");
  if (!certSec) removedSectionIds.add("certifications");
  if (!hobbySec) removedSectionIds.add("hobbies");
  if (!langSec) removedSectionIds.add("languages");
  if (!declSec) removedSectionIds.add("declaration");
  if (!projSec) removedSectionIds.add("academicProjects");
  if (!achSec) removedSectionIds.add("achievements");
  if (!leaderSec) removedSectionIds.add("leadershipActivities");
  if (!interestSec) removedSectionIds.add("academicInterests");
  if (!volSec) removedSectionIds.add("volunteering");
  if (!recSec) removedSectionIds.add("recommendations");

  const existingOrder = baseCv.sectionOrder && baseCv.sectionOrder.length > 0
    ? baseCv.sectionOrder
    : [
      "aboutMe",
      "education",
      "languages",
      "englishCertificate",
      "hobbies",
      "internships",
      "academicProjects",
      "achievements",
      "certifications",
      "skills",
      "leadershipActivities",
      "volunteering",
      "academicInterests",
      "recommendations",
      "declaration",
    ];
  const mergedOrder = [...detectedOrder];
  for (const id of existingOrder) {
    if (!mergedOrder.includes(id) && !removedSectionIds.has(id)) {
      mergedOrder.push(id);
    }
  }
  updatedCv.sectionOrder = mergedOrder.filter((id) => !removedSectionIds.has(id));

  return updatedCv;
}

/**
 * Synchronizes structured DocumentData updates (e.g. from inline Europass canvas editing)
 * back into the flat HydratedSection array used by the studio.
 */
export function syncCvDataToSections(
  cv: DocumentData,
  existingSections: { heading: string; content: string }[]
): { heading: string; content: string }[] {
  const sections = existingSections.map((s) => ({ ...s }));

  // 1. About Me
  const aboutIdx = sections.findIndex((s) => s.heading?.toLowerCase().includes("about me"));
  if (cv.aboutMe !== undefined && aboutIdx >= 0) {
    sections[aboutIdx].content = cv.aboutMe || "";
  }

  // 2. Work Experience / Internships
  const workIdx = sections.findIndex(
    (s) =>
      s.heading?.toLowerCase().includes("work experience") ||
      s.heading?.toLowerCase().includes("internship") ||
      s.heading?.toLowerCase().includes("employment")
  );
  if (cv.internships !== undefined && workIdx >= 0) {
    const validInternships = (cv.internships || []).filter((e) => e.role || e.company || e.description);
    sections[workIdx].content = validInternships
      .map((exp) => {
        const lines: string[] = [];
        if (exp.role) lines.push(exp.role);
        const compParts: string[] = [];
        if (exp.company) compParts.push(exp.company);
        if (exp.location) compParts.push(`Location: ${exp.location}`);
        const dateStr = exp.startDate || exp.endDate ? `[ ${exp.startDate || ""} – ${exp.endDate || ""} ]` : "";
        if (dateStr) compParts.push(dateStr);
        if (compParts.length > 0) lines.push(compParts.join(" | "));
        if (exp.description) lines.push(exp.description);
        return lines.join("\n");
      })
      .join("\n\n");
  }

  // 3. Education
  const eduIdx = sections.findIndex(
    (s) =>
      s.heading?.toLowerCase().includes("education") ||
      s.heading?.toLowerCase().includes("training")
  );
  if (cv.education !== undefined && eduIdx >= 0) {
    const validEdu = (cv.education || []).filter((e) => e.qualification || e.institution);
    sections[eduIdx].content = validEdu
      .map((edu) => {
        const lines = [
          edu.qualification || "Degree",
          `${edu.institution || ""} [ ${edu.startDate || ""} – ${edu.endDate || ""} ]`,
        ];
        const meta = [
          edu.address ? `Location: ${edu.address}` : "",
          edu.website ? `Website: ${edu.website}` : "",
          edu.finalGrade ? `Final grade: ${edu.finalGrade}` : "",
        ]
          .filter(Boolean)
          .join(" | ");
        if (meta) lines.push(meta);
        if (edu.description) lines.push(edu.description);
        return lines.join("\n");
      })
      .join("\n\n");
  }

  // 4. Skills
  const skillsIdx = sections.findIndex((s) => s.heading?.toLowerCase().includes("skill"));
  if (cv.skills !== undefined && skillsIdx >= 0) {
    sections[skillsIdx].content = (cv.skills || []).map((s) => s.name).filter(Boolean).join(" / ");
  }

  // 5. Hobbies
  const hobbiesIdx = sections.findIndex((s) => s.heading?.toLowerCase().includes("hobb"));
  if (cv.hobbies !== undefined && hobbiesIdx >= 0) {
    sections[hobbiesIdx].content = (cv.hobbies || []).map((h) => h.name).filter(Boolean).join(" • ");
  }

  // 6. Certifications
  const certsIdx = sections.findIndex((s) => s.heading?.toLowerCase().includes("certificat"));
  if (cv.certifications !== undefined && certsIdx >= 0) {
    sections[certsIdx].content = (cv.certifications || [])
      .map((c) => (c.provider ? `${c.name} – ${c.provider}.` : `${c.name}.`))
      .join("\n");
  }

  // 7. Languages
  const langIdx = sections.findIndex((s) => s.heading?.toLowerCase().includes("language") && !s.heading?.toLowerCase().includes("certificate"));
  if ((cv.motherTongue !== undefined || cv.languages !== undefined) && langIdx >= 0) {
    const parts: string[] = [];
    if (cv.motherTongue?.trim()) parts.push(`Mother tongue(s): ${cv.motherTongue.trim()}`);
    const other = (cv.languages || []).map((l) => l.language?.trim()).filter(Boolean);
    if (other.length > 0) parts.push(`Other language(s): ${other.join(", ")}`);
    sections[langIdx].content = parts.join("\n");
  }

  // 8. Academic Projects
  const projIdx = sections.findIndex((s) => s.heading?.toLowerCase().includes("project"));
  if (cv.academicProjects !== undefined && projIdx >= 0) {
    sections[projIdx].content = (cv.academicProjects || [])
      .map((p) => [p.title, p.description].filter(Boolean).join("\n"))
      .join("\n\n");
  }

  // 9. Academic Interests
  const intIdx = sections.findIndex((s) => s.heading?.toLowerCase().includes("academic interest") || (s.heading?.toLowerCase().includes("interest") && !s.heading?.toLowerCase().includes("hobb")));
  if (cv.academicInterests !== undefined && intIdx >= 0) {
    sections[intIdx].content = (cv.academicInterests || []).map((i) => i.name).filter(Boolean).join(" • ");
  }

  // 10. Achievements & Awards
  const achIdx = sections.findIndex((s) => s.heading?.toLowerCase().includes("achievement") || s.heading?.toLowerCase().includes("award"));
  if (cv.achievements !== undefined && achIdx >= 0) {
    sections[achIdx].content = (cv.achievements || []).map((a) => a.title).filter(Boolean).join("\n");
  }

  // 11. Leadership & Extracurricular
  const leadIdx = sections.findIndex((s) => s.heading?.toLowerCase().includes("leadership") || s.heading?.toLowerCase().includes("responsibilit") || s.heading?.toLowerCase().includes("extracurricular"));
  if (cv.leadershipActivities !== undefined && leadIdx >= 0) {
    sections[leadIdx].content = (cv.leadershipActivities || [])
      .map((l) => [l.activity, [l.organisation, l.duration ? `[ ${l.duration} ]` : null].filter(Boolean).join(" "), l.description].filter(Boolean).join("\n"))
      .join("\n\n");
  }

  // 12. Volunteering
  const volIdx = sections.findIndex((s) => s.heading?.toLowerCase().includes("volunteer") || s.heading?.toLowerCase().includes("community"));
  if (cv.volunteering !== undefined && volIdx >= 0) {
    sections[volIdx].content = (cv.volunteering || [])
      .map((v) => [v.role, [v.organization, v.startDate || v.endDate ? `[ ${v.startDate || ""} – ${v.endDate || ""} ]` : null].filter(Boolean).join(" "), v.description].filter(Boolean).join("\n"))
      .join("\n\n");
  }

  // 13. Recommendations
  const recIdx = sections.findIndex((s) => s.heading?.toLowerCase().includes("recommendation") || s.heading?.toLowerCase().includes("referee"));
  if (cv.recommendations !== undefined && recIdx >= 0) {
    sections[recIdx].content = (cv.recommendations || [])
      .map((r) => [r.recommenderName, [r.recommenderTitle, r.organization].filter(Boolean).join(", "), r.text ? `"${r.text}"` : null].filter(Boolean).join("\n"))
      .join("\n\n");
  }

  return sections;
}
