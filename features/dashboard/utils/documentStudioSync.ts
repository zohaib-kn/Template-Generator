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
    updatedCv.aboutMe = aboutSec.content.trim();
  } else {
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
        startDate: datesMatch ? datesMatch[1].split("–")[0]?.trim() || "" : "",
        endDate: datesMatch ? datesMatch[1].split("–")[1]?.trim() || "" : "",
        description: descLines.join("\n"),
      };
    });
  } else {
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
        provider: provider || "Online Course Provider",
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

  return updatedCv;
}
