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
      const compName = compLine.replace(/\[\s*[^\]]+\s*\]/, "").trim();
      const descLines = lines.slice(2);
      return {
        id: `intern-${idx}`,
        role: roleLine,
        company: compName || "Company",
        startDate: datesMatch ? datesMatch[1].split(/[–-]/)[0]?.trim() || "" : "",
        endDate: datesMatch ? datesMatch[1].split(/[–-]/)[1]?.trim() || "" : "",
        description: descLines.join("\n"),
      };
    });
  } else if (workSec && !workSec.content.trim()) {
    updatedCv.internships = [];
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
  }

  // 8. Declaration
  const declSec = sections.find((s) => s.heading?.toLowerCase().includes("declaration"));
  if (declSec && declSec.content.trim()) {
    updatedCv.declaration = declSec.content;
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

  // 14. Map dynamic section order from sections array for Europass template
  const headingToSectionId = (heading: string): string | null => {
    const h = heading.toLowerCase();
    if (h.includes("about me") || h.includes("about")) return "aboutMe";
    if (h.includes("education") || h.includes("training")) return "education";
    if (h.includes("work") || h.includes("internship") || h.includes("employment")) return "internships";
    if (h.includes("english") || h.includes("ielts") || h.includes("toefl")) return "englishCertificate";
    if (h.includes("language")) return "languages";
    if (h.includes("digital") || h.includes("skill")) return "skills";
    if (h.includes("certification") || h.includes("certificate")) return "certifications";
    if (h.includes("hobbi") || h.includes("interest")) return "hobbies";
    if (h.includes("project")) return "academicProjects";
    if (h.includes("achievement") || h.includes("award")) return "achievements";
    if (h.includes("leadership") || h.includes("responsibilit")) return "leadershipActivities";
    if (h.includes("volunteer")) return "volunteering";
    if (h.includes("recommendation")) return "recommendations";
    if (h.includes("declaration")) return "declaration";
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

  // Preserve existing sections from baseCv.sectionOrder that weren't in sections
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
    if (!mergedOrder.includes(id)) {
      mergedOrder.push(id);
    }
  }
  updatedCv.sectionOrder = mergedOrder;

  return updatedCv;
}
