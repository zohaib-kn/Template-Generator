/**
 * Dedicated parser for direct CV section user instructions entered in chat,
 * e.g. "add this text '...' into my Work experience /internship",
 * "add hobbies Gym, Reading, Writing", "add skills Python, React", etc.
 */

export function cleanExtractedSnippet(raw: string): string {
  let s = raw.trim();
  if (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith('“') && s.endsWith('”'))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function parseDirectCvSectionInstruction(prompt: string): {
  heading: string;
  sectionKey: string;
  label: string;
  content: string;
} | null {
  const p = prompt.trim();

  // Guard: Never treat enhancement, rephrasing, humanizing, About Me directives, or deletion commands as adding a section
  if (
    /^(?:enhance|improve|polish|humanize|rephrase|rewrite|make|delete|remove|clear|drop)\b/i.test(p) ||
    /^(?:in|for|to|on)\s+(?:my\s+)?(?:about\s+me|summary|profile|bio)\b/i.test(p) ||
    /\b(?:about\s+me|summary|profile)\b/i.test(p)
  ) {
    return null;
  }

  // Structured key-value Work Experience (even without "Add work experience")
  if (
    /(?:position|job\s*title|role)\s*[:=-]/i.test(p) &&
    /(?:company|employer|organization)\s*[:=-]/i.test(p)
  ) {
    return {
      heading: "WORK EXPERIENCE",
      sectionKey: "workExperience",
      label: "Work Experience",
      content: p,
    };
  }

  // General Suffix Form: e.g. "add this text '...' into my Work experience /internship", "add '...' into certifications", "insert '...' into hobbies"
  const suffixMatch = p.match(
    /^(?:add|insert|append|put)\s*(?:this\s+)?(?:text\s+|entry\s+|details?\s+|job\s+|internship\s+)?([\s\S]+?)\s+\b(?:into|in|to)\b\s+(?:my\s+)?([a-z\s\/\&,-]+)$/i
  );
  if (suffixMatch && suffixMatch[1].trim()) {
    const rawContent = cleanExtractedSnippet(suffixMatch[1]);
    const target = suffixMatch[2].trim().toLowerCase();

    if (/^(?:work\s*experience(?:\s*(?:[\/\&]|and)\s*internships?)?|internships?|jobs?)$/i.test(target)) {
      return {
        heading: "WORK EXPERIENCE",
        sectionKey: "workExperience",
        label: "Work Experience",
        content: rawContent,
      };
    }
    if (/^(?:education(?:\s*(?:[\/\&]|and)\s*training)?|degrees?|qualifications?)$/i.test(target)) {
      return {
        heading: "EDUCATION AND TRAINING",
        sectionKey: "education",
        label: "Education",
        content: rawContent,
      };
    }
    if (/^(?:training(?:\s*(?:[\/\&]|and)\s*workshops?)?|workshops?)$/i.test(target)) {
      return {
        heading: "TRAINING AND WORKSHOPS",
        sectionKey: "training",
        label: "Training",
        content: rawContent,
      };
    }
    if (/^(?:certifications?|licenses?)$/i.test(target)) {
      return {
        heading: "CERTIFICATIONS",
        sectionKey: "certifications",
        label: "Certifications",
        content: rawContent,
      };
    }
    if (/^(?:academic\s*projects?|projects?)$/i.test(target)) {
      return {
        heading: "ACADEMIC PROJECTS",
        sectionKey: "academicProjects",
        label: "Academic Projects",
        content: rawContent,
      };
    }
    if (/^(?:hobbies(?:\s*(?:[\/\&]|and)\s*interests)?|interests?)$/i.test(target)) {
      return {
        heading: "HOBBIES AND INTERESTS",
        sectionKey: "hobbies",
        label: "Hobbies",
        content: rawContent,
      };
    }
    if (/^(?:(?:technical\s*|digital\s*)?skills)$/i.test(target)) {
      return {
        heading: "DIGITAL SKILLS",
        sectionKey: "skills",
        label: "Technical Skills",
        content: rawContent,
      };
    }
    if (/^(?:language\s*skills?|languages?)$/i.test(target)) {
      return {
        heading: "LANGUAGE SKILLS",
        sectionKey: "languageSkills",
        label: "Language Skills",
        content: rawContent,
      };
    }
    if (/^(?:volunteering(?:\s*(?:[\/\&]|and)\s*community\s*engagement)?|community\s*service)$/i.test(target)) {
      return {
        heading: "VOLUNTEERING / COMMUNITY ENGAGEMENT",
        sectionKey: "volunteering",
        label: "Volunteering / Community Engagement",
        content: rawContent,
      };
    }
    if (/^(?:leadership(?:\s*(?:[\/\&]|and)\s*extracurricular)?|responsibilities|extracurricular)$/i.test(target)) {
      return {
        heading: "LEADERSHIP & RESPONSIBILITIES",
        sectionKey: "responsibilities",
        label: "Responsibilities",
        content: rawContent,
      };
    }
  }

  // Work Experience: prefix form e.g. "add to work experience: '...'", "Add work experience Software Engineer Intern..."
  const workMatch =
    p.match(/^(?:add|insert|set)?\s*(?:(?:to|into|in)\s+)?(?:my\s+)?(?:work\s*experience(?:\s*(?:[\/\&]|and)\s*internships?)?|internships?|jobs?)\s*(?:is|to|:|-)\s*([\s\S]+)$/i) ||
    p.match(/^(?:add|set)\s+(?:work\s*experience(?:\s*(?:[\/\&]|and)\s*internships?)?|internship|job)\s+([\s\S]+)$/i) ||
    p.match(/^(?:add|set)?\s*(?:work\s*experience(?:\s*(?:[\/\&]|and)\s*internships?)?|internship|job)\s*(?:is|to|:|-)?\s*(.+)$/i);
  if (workMatch && workMatch[1].trim()) {
    return {
      heading: "WORK EXPERIENCE",
      sectionKey: "workExperience",
      label: "Work Experience",
      content: cleanExtractedSnippet(workMatch[1]),
    };
  }

  // Hobbies: e.g. "Add hobbies Gym, Reading, Writing", "Hobbies: Gym, Reading", "My hobbies are Gym, Reading"
  const hobbyMatch = p.match(/^(?:add|set|my)?\s*hobbies(?:\s*and\s*interests)?\s*(?:are|is|to|:|-)?\s*(.+)$/i);
  if (hobbyMatch && hobbyMatch[1].trim()) {
    return {
      heading: "HOBBIES AND INTERESTS",
      sectionKey: "hobbies",
      label: "Hobbies",
      content: cleanExtractedSnippet(hobbyMatch[1]),
    };
  }

  // Skills: e.g. "Add skills Python, React, Next.js", "Skills: Python, SQL"
  const skillsMatch = p.match(/^(?:add|set)?\s*(?:technical\s*|digital\s*)?skills\s*(?:are|is|to|:|-)?\s*(.+)$/i);
  if (skillsMatch && skillsMatch[1].trim() && !/\b(?:about\s+me|summary|as\s+well|in\s+my)\b/i.test(skillsMatch[1])) {
    return {
      heading: "DIGITAL SKILLS",
      sectionKey: "skills",
      label: "Technical Skills",
      content: cleanExtractedSnippet(skillsMatch[1]),
    };
  }

  // Certifications: e.g. "Add certification AWS Solutions Architect - Amazon, 2024"
  const certMatch = p.match(/^(?:add|set)?\s*certifications?\s*(?:are|is|to|:|-)?\s*(.+)$/i);
  if (certMatch && certMatch[1].trim()) {
    return {
      heading: "CERTIFICATIONS",
      sectionKey: "certifications",
      label: "Certifications",
      content: cleanExtractedSnippet(certMatch[1]),
    };
  }

  // English Certificate / IELTS: e.g. "Add IELTS score 7.5, TRF 26IA004123"
  const ieltsMatch = p.match(/^(?:add|set)?\s*(?:ielts|english\s*certificate|english\s*score)\s*(?:are|is|to|:|-)?\s*(.+)$/i);
  if (ieltsMatch && ieltsMatch[1].trim()) {
    return {
      heading: "ENGLISH LANGUAGE CERTIFICATE",
      sectionKey: "englishCertificate",
      label: "English Certificate (IELTS)",
      content: cleanExtractedSnippet(ieltsMatch[1]),
    };
  }

  // Education: e.g. "Add education B.Tech in CS, University of Cassino"
  const eduMatch = p.match(/^(?:add|set)?\s*(?:education|degree|qualification)\s*(?:is|to|:|-)?\s*(.+)$/i);
  if (eduMatch && eduMatch[1].trim()) {
    return {
      heading: "EDUCATION AND TRAINING",
      sectionKey: "education",
      label: "Education",
      content: cleanExtractedSnippet(eduMatch[1]),
    };
  }

  // Training: e.g. "Add training Full-Stack Web Development Bootcamp"
  const trainMatch = p.match(/^(?:add|set)?\s*(?:training|workshop)\s*(?:is|to|:|-)?\s*(.+)$/i);
  if (trainMatch && trainMatch[1].trim()) {
    return {
      heading: "TRAINING AND WORKSHOPS",
      sectionKey: "training",
      label: "Training",
      content: cleanExtractedSnippet(trainMatch[1]),
    };
  }

  // Academic Projects: e.g. "Add project AI Resume Builder"
  const projMatch = p.match(/^(?:add|set)?\s*(?:academic\s*project|project)\s*(?:is|to|:|-)?\s*(.+)$/i);
  if (projMatch && projMatch[1].trim()) {
    return {
      heading: "ACADEMIC PROJECTS",
      sectionKey: "academicProjects",
      label: "Academic Projects",
      content: cleanExtractedSnippet(projMatch[1]),
    };
  }

  // Responsibilities / Leadership: e.g. "Add responsibility Student Council President"
  const respMatch = p.match(/^(?:add|set)?\s*(?:leadership|responsibility|responsibilities|extracurricular)\s*(?:is|to|:|-)?\s*(.+)$/i);
  if (respMatch && respMatch[1].trim()) {
    return {
      heading: "LEADERSHIP & RESPONSIBILITIES",
      sectionKey: "responsibilities",
      label: "Responsibilities",
      content: cleanExtractedSnippet(respMatch[1]),
    };
  }

  // Language Skills: e.g. "Mother tongue Hindi, Other languages German, French", "Languages: Hindi, German", "Add language German"
  const langMatch = p.match(/^(?:add|set)?\s*(?:language\s*skills?|languages?|mother\s*tongue|native\s*language)\s*(?:are|is|to|:|-)?\s*(.+)$/i);
  if (langMatch && langMatch[1].trim()) {
    return {
      heading: "LANGUAGE SKILLS",
      sectionKey: "languageSkills",
      label: "Language Skills",
      content: p,
    };
  }

  return null;
}

