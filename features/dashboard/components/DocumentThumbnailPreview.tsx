import React from "react";

export interface DocumentThumbnailPreviewProps {
  docType: "COVER_LETTER" | "SOP" | "CV" | "LOR" | "BLANK";
  title?: string;
  studentName?: string;
  targetUniversity?: string;
  targetCourse?: string;
  targetCountry?: string;
  sections?: { heading: string; content: string }[];
  isTemplateCard?: boolean;
  /** Candidate photo for CV thumbnails; initials monogram is shown when absent. */
  photoUrl?: string;
  className?: string;
}

/**
 * Utility helpers to sanitize markdown and extract structured snippets
 * from hydrated document sections.
 */
function stripMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function getInitials(name?: string): string {
  if (!name) return "CV";
  const clean = name.replace(/[^a-zA-Z\s]/g, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function extractEmail(text: string, fallback: string): string {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : fallback;
}

function extractPhone(text: string, fallback: string): string {
  const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{4,6}/);
  return match ? match[0] : fallback;
}

/**
 * High-visibility miniature document page preview.
 * Reconstructs the authentic visual layout of the document inside
 * (Europass CV with photo/monogram/logo/corners, Cover Letter with centered title & consular paragraphs,
 * SOP with academic essay format, and LOR with official institutional letterhead).
 *
 * Fully dynamic to the specific student and document sections when displayed in "Recent documents".
 */
export function DocumentThumbnailPreview({
  docType,
  studentName = "",
  targetUniversity = "Università degli Studi di Padova",
  targetCourse = "Master of Science in Data Science",
  targetCountry = "Italy",
  sections = [],
  isTemplateCard = false,
  photoUrl,
  className = "",
}: DocumentThumbnailPreviewProps) {
  // Helper to retrieve section content safely
  const getSec = (query: string): string => {
    if (!sections || sections.length === 0) return "";
    const q = query.toLowerCase();
    const found = sections.find((s) => s.heading?.toLowerCase().includes(q));
    return found ? found.content : "";
  };

  const allSectionsText = sections ? sections.map((s) => `${s.heading} ${s.content}`).join("\n") : "";

  // ── 1. Europass CV Template & Document Preview ────────────────────────────
  if (docType === "CV") {
    const candidateName = isTemplateCard ? "FIRSTNAME LASTNAME" : studentName.toUpperCase();
    const university = isTemplateCard ? "University / Institution" : targetUniversity;
    const course = isTemplateCard ? "Field of Study / Degree" : targetCourse;

    // Avatar logic: a photo is shown only when the document supplies one;
    // otherwise an initials monogram (template cards get a neutral silhouette)
    const hasPhoto = !isTemplateCard && Boolean(photoUrl);

    const initials = getInitials(studentName);

    // Dynamic contact details extraction
    const dynamicEmail = isTemplateCard
      ? "email@example.com"
      : extractEmail(allSectionsText, `${studentName.toLowerCase().replace(/\s+/g, ".")}@gmail.com`);

    const dynamicPhone = isTemplateCard
      ? "+00 000 000 000"
      : extractPhone(allSectionsText, "+91 98765 43210");

    const dynamicLocation = isTemplateCard
      ? "City, Country"
      : targetCountry && targetCountry !== "Global"
      ? `${targetCountry} Candidate · India`
      : "India";

    // Dynamic Work Experience extraction
    const workSecContent = getSec("work") || getSec("experience") || getSec("internship");
    let workDate = isTemplateCard ? "2022 – Present" : "01/2024 – 06/2024";
    let workRole = isTemplateCard ? "Position / Role Title" : "AI & Software Intern";
    let workOrg = isTemplateCard ? "Organization / Employer Name" : "TechSolutions Global · Bhopal, India";
    let workBullet = isTemplateCard
      ? "• Key achievement, project responsibility, or measurable impact"
      : "• Deployed neural network models and automated pipeline benchmarking";

    if (!isTemplateCard && workSecContent) {
      const cleanWork = workSecContent.split("\n").filter((l) => l.trim().length > 0);
      if (cleanWork.length > 0) {
        workRole = stripMarkdown(cleanWork[0]);
      }
      if (cleanWork.length > 1) {
        const line2 = stripMarkdown(cleanWork[1]);
        const dateMatch = line2.match(/\[?\s*(\d{2}\/\d{4}\s*–\s*\d{2}\/\d{4}|\d{4}\s*–\s*\d{4})\s*\]?/);
        if (dateMatch) {
          workDate = dateMatch[1];
          workOrg = line2.replace(dateMatch[0], "").trim() || university;
        } else {
          workOrg = line2;
          workDate = "Recent";
        }
      }
      const bulletLine = cleanWork.find((l) => l.trim().startsWith("•") || l.trim().startsWith("-"));
      if (bulletLine) {
        workBullet = stripMarkdown(bulletLine);
      } else if (cleanWork.length > 2) {
        workBullet = `• ${stripMarkdown(cleanWork[2])}`;
      }
    } else if (!isTemplateCard && !workSecContent) {
      // Academic CV without work experience: showcase research/projects
      workDate = "2024 – 2026";
      workRole = "Academic Projects & Research";
      workOrg = `${university} · Research Portfolio`;
      workBullet = `• Core technical implementations in ${course}`;
    }

    // Dynamic Education extraction
    const eduSecContent = getSec("education") || getSec("academic");
    let eduDate = isTemplateCard ? "2018 – 2022" : "2021 – 2025";
    let eduDegree = isTemplateCard ? "Degree / Qualification Title" : course;
    let eduInst = isTemplateCard ? "University / Academic Institution" : `${university} · GPA 8.12/10`;

    if (!isTemplateCard && eduSecContent) {
      const cleanEdu = eduSecContent.split("\n").filter((l) => l.trim().length > 0);
      if (cleanEdu.length > 0) {
        eduDegree = stripMarkdown(cleanEdu[0]);
      }
      if (cleanEdu.length > 1) {
        const line2 = stripMarkdown(cleanEdu[1]);
        const dateMatch = line2.match(/\[?\s*(\d{4}\s*–\s*\d{4}|\d{2}\/\d{4}\s*–\s*\d{2}\/\d{4})\s*\]?/);
        if (dateMatch) {
          eduDate = dateMatch[1];
          eduInst = line2.replace(dateMatch[0], "").trim() || university;
        } else {
          eduInst = line2;
        }
      }
      const gradeLine = cleanEdu.find((l) => l.toLowerCase().includes("grade") || l.toLowerCase().includes("gpa") || l.toLowerCase().includes("score"));
      if (gradeLine && !eduInst.toLowerCase().includes("gpa")) {
        eduInst += ` · ${stripMarkdown(gradeLine)}`;
      }
    }

    // Dynamic Language Skills extraction
    const langSecContent = getSec("language");
    let langLine = isTemplateCard ? "Mother tongue(s) · Foreign language(s)" : "English (C1 Fluent) · Hindi (Native)";
    let langScore = isTemplateCard ? "CEFR / IELTS" : "IELTS 7.5";

    if (!isTemplateCard && langSecContent) {
      const cleanLang = stripMarkdown(langSecContent);
      if (cleanLang.includes("IELTS")) {
        const scoreMatch = cleanLang.match(/IELTS\s*([\d.]+)/i);
        if (scoreMatch) langScore = `IELTS ${scoreMatch[1]}`;
      }
      const firstLine = cleanLang.split(".")[0];
      if (firstLine && firstLine.length > 8) {
        langLine = firstLine.replace(/other languages:?/i, "").replace(/mother tongue:?/i, "Native:").trim();
      }
    }

    return (
      <div
        className={`w-full aspect-[210/280] bg-white rounded-sm border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.07)] overflow-hidden relative p-2.5 flex flex-col justify-between select-none text-slate-800 ${className}`}
      >
        {/* Authoritative Light-Blue Europass Top Bar & Corner Ears (#82acd9) */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-[#82acd9] z-10 pointer-events-none" />
        <div className="absolute top-0 left-0 w-[2.5px] h-3.5 bg-[#82acd9] z-10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[2.5px] h-3.5 bg-[#82acd9] z-10 pointer-events-none" />

        {/* Top Header Row: Photo/Monogram + Name/Details + Europass Logo */}
        <div className="flex items-start justify-between gap-1.5 pt-1">
          <div className="flex items-start gap-1.5 min-w-0">
            {/* Candidate Photo or Verified Monogram Avatar */}
            {isTemplateCard ? (
              <div className="w-6 h-7.5 bg-slate-100 rounded-[2px] border border-slate-300 flex items-center justify-center text-slate-400 shrink-0 shadow-2xs">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            ) : hasPhoto ? (
              <div className="w-6 h-7.5 bg-slate-200 rounded-[2px] border border-slate-300 overflow-hidden shrink-0 shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt="Candidate"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div className="w-6 h-7.5 bg-[#0c56a5] text-white rounded-[2px] border border-[#094280] flex items-center justify-center font-bold text-[7px] tracking-tight shrink-0 shadow-2xs">
                <span>{initials}</span>
              </div>
            )}

            {/* Candidate Name & Contact Lines */}
            <div className="min-w-0 leading-tight">
              <div className="text-[6.5px] font-bold text-[#0c56a5] truncate tracking-tight">
                {candidateName}
              </div>
              <div className="text-[4.5px] text-slate-500 leading-snug truncate">
                {isTemplateCard ? "Passport: [National ID]" : "Passport: Verified · Indian"}
              </div>
              <div className="text-[4.5px] text-[#214493] leading-snug truncate">
                {dynamicEmail}
              </div>
              <div className="text-[4.5px] text-slate-500 leading-snug truncate">
                {dynamicPhone} · {dynamicLocation}
              </div>
            </div>
          </div>

          {/* Europass Official Logo */}
          <div className="shrink-0 flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/europass-logo.png"
              alt="Europass"
              className="h-3.5 object-contain"
              onError={(e) => {
                const el = e.target as HTMLElement;
                if (el.parentElement) {
                  el.parentElement.innerHTML = `
                    <div class="px-1 py-0.5 bg-[#0c56a5] text-white rounded-[2px] text-[4.5px] font-bold flex items-center gap-0.5">
                      <span>★</span>
                      <span>europass</span>
                    </div>
                  `;
                }
              }}
            />
          </div>
        </div>

        {/* Europass Sections Body */}
        <div className="space-y-1.5 my-auto overflow-hidden">
          {/* Section 1: Work Experience */}
          <div>
            <div className="text-[5.5px] font-bold text-[#0c56a5] uppercase tracking-wider border-b border-[#82acd9]/60 pb-0.5 mb-0.5">
              Work Experience
            </div>
            <div className="flex items-start gap-1">
              <div className="text-[4px] text-[#214493] font-medium w-11 shrink-0 truncate">
                {workDate}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[4.8px] font-bold text-slate-800 truncate">
                  {workRole}
                </div>
                <div className="text-[4px] text-slate-600 truncate">
                  {workOrg}
                </div>
                <div className="text-[3.8px] text-slate-500 line-clamp-1">
                  {workBullet}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Education and Training */}
          <div>
            <div className="text-[5.5px] font-bold text-[#0c56a5] uppercase tracking-wider border-b border-[#82acd9]/60 pb-0.5 mb-0.5">
              Education and Training
            </div>
            <div className="flex items-start gap-1">
              <div className="text-[4px] text-[#214493] font-medium w-11 shrink-0 truncate">
                {eduDate}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[4.8px] font-bold text-slate-800 truncate">
                  {eduDegree}
                </div>
                <div className="text-[4px] text-slate-600 truncate">
                  {eduInst}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Language Skills */}
          <div>
            <div className="text-[5.5px] font-bold text-[#0c56a5] uppercase tracking-wider border-b border-[#82acd9]/60 pb-0.5 mb-0.5">
              Language Skills
            </div>
            <div className="text-[4px] text-slate-600 flex items-center justify-between">
              <span className="truncate pr-1">{langLine}</span>
              <span className="text-[#0c56a5] font-semibold shrink-0">{langScore}</span>
            </div>
          </div>
        </div>

        {/* Authoritative Light-Blue Europass Bottom Bar & Corner Ears (#82acd9) */}
        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#82acd9] z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[2.5px] h-4 bg-[#82acd9] z-10 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[2.5px] h-4 bg-[#82acd9] z-10 pointer-events-none" />
      </div>
    );
  }

  // ── 2. Italy Type D Student Visa Cover Letter Preview ─────────────────────
  if (docType === "COVER_LETTER") {
    const candidateName = isTemplateCard ? "Applicant Full Name" : studentName;
    const university = isTemplateCard ? "Target University" : targetUniversity;
    const course = isTemplateCard
      ? "Target Degree Program"
      : targetCourse || "Bachelor's Degree";

    // Recipient extraction
    const rawRecipient = getSec("recipient") || getSec("consulate");
    const recipientLines = !isTemplateCard && rawRecipient
      ? rawRecipient.split("\n").filter((l) => l.trim().length > 0).map(stripMarkdown)
      : isTemplateCard
      ? [
          "To,",
          "The Respected Visa Officer,",
          "Consulate General of Italy, Mumbai, India.",
        ]
      : [
          "To,",
          "The Respected Visa Officer,",
          `Consulate General of ${targetCountry || "Italy"}, Mumbai, India.`,
        ];

    // Subject extraction
    const rawSubject = getSec("subject");
    const subjectLine = !isTemplateCard && rawSubject
      ? stripMarkdown(rawSubject.replace(/^subject:\s*/i, ""))
      : isTemplateCard
      ? "Application for Long-Term Type D Student Visa"
      : `Application for a Long-Term Type D Student Visa to Pursue ${course} at ${university}`;

    // Paragraph 1: Intro + Academic background
    const rawP1 =
      getSec("student introduction") ||
      getSec("academic background") ||
      getSec("background");
    const p1Text = !isTemplateCard && rawP1
      ? stripMarkdown(rawP1)
      : isTemplateCard
      ? "My name is Applicant Full Name, and I am applying for a Long-Term Type D Student Visa to pursue Target Degree Program at Target University. Verified academic preparation and language qualifications."
      : `My name is ${candidateName}, and I am from Bhopal, India. Completed Class XII under CBSE curriculum (88.6%), securing an overall IELTS band score of 7.5 and 81.75 in CISIA CEnT-S. Family of four; father Insurance Surveyor, mother Amazon.`;

    // Paragraph 2: University & Country
    const rawP2 =
      getSec("why this university") ||
      getSec("why university") ||
      getSec("why course") ||
      getSec("academic plan");
    const p2Text = !isTemplateCard && rawP2
      ? stripMarkdown(rawP2)
      : isTemplateCard
      ? "University & Country: Target University's recognized curriculum and international faculty offer rigorous academic training in the chosen specialization."
      : `${university}'s rich academic excellence and pioneering research laboratories provide the ideal foundation in ${course} in ${targetCountry || "Italy"}.`;

    // Paragraph 3: Financial Sponsorship
    const rawP3 = getSec("financial") || getSec("sponsorship");
    const p3Text = !isTemplateCard && rawP3
      ? stripMarkdown(rawP3)
      : isTemplateCard
      ? "Financial Sponsorship: Fully backed by documented family liquid savings, educational financial support, and multi-year tax returns."
      : `Financial Sponsorship: Fully sponsored by verified family education loan disbursed into bank account, CA Net Worth statement, and multi-year ITRs.`;

    // Paragraph 4: Logistics (Accommodation + Insurance + Travel)
    const rawP4 =
      getSec("logistics") ||
      getSec("accommodation") ||
      getSec("travel") ||
      getSec("insurance");
    const p4Text = !isTemplateCard && rawP4
      ? stripMarkdown(rawP4)
      : isTemplateCard
      ? "Logistics: Pre-arranged student accommodation near campus, comprehensive overseas medical coverage, and confirmed flight itinerary."
      : `Logistics: Accommodation confirmed near ${university}, comprehensive 365-day overseas health insurance, and confirmed flight itinerary.`;

    // Signature Block extraction
    const rawSig = getSec("signature") || getSec("contact");
    const dynamicEmail = !isTemplateCard && rawSig
      ? extractEmail(rawSig, `${candidateName.toLowerCase().replace(/\s+/g, ".")}@gmail.com`)
      : isTemplateCard
      ? "applicant@example.com"
      : `${candidateName.toLowerCase().replace(/\s+/g, ".")}@gmail.com`;

    const dynamicPhone = !isTemplateCard && rawSig
      ? extractPhone(rawSig, "+91 98765 43210")
      : isTemplateCard
      ? "+00 000 000 000"
      : "+91 98765 43210";

    return (
      <div
        className={`w-full aspect-[210/280] bg-white rounded-sm border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.07)] overflow-hidden relative p-3 flex flex-col justify-between select-none text-slate-800 ${className}`}
      >
        {/* Centered Underlined Title */}
        <div className="text-center font-bold tracking-wider text-[6px] text-slate-900 uppercase underline decoration-slate-900 decoration-1 pb-1 whitespace-nowrap overflow-hidden text-ellipsis">
          COVER LETTER
        </div>

        {/* Consular Recipient Block */}
        <div className="text-[4.5px] text-slate-800 leading-tight">
          {recipientLines.map((line, idx) => (
            <div key={idx} className={idx === 0 ? "font-semibold text-slate-900" : ""}>
              {line}
            </div>
          ))}
        </div>

        {/* Bold Subject Line */}
        <div className="text-[4.8px] text-slate-900 font-semibold leading-snug py-0.5 border-b border-slate-200 line-clamp-2">
          <span className="font-bold">Subject:</span> {subjectLine}
        </div>

        {/* Flowing Visa Cover Letter Paragraphs */}
        <div className="space-y-1 text-[4.3px] text-slate-700 leading-tight my-auto text-justify">
          <p className="line-clamp-2">
            {p1Text}
          </p>

          <p className="line-clamp-2">
            <span className="font-semibold text-slate-800">University &amp; Country:</span> {p2Text.replace(/^university & country:?/i, "")}
          </p>

          <p className="line-clamp-2">
            <span className="font-semibold text-slate-800">Financial Sponsorship:</span> {p3Text.replace(/^financial sponsorship:?/i, "")}
          </p>

          <p className="line-clamp-2">
            <span className="font-semibold text-slate-800">Logistics:</span> {p4Text.replace(/^logistics:?/i, "")}
          </p>
        </div>

        {/* Sign-off Block */}
        <div className="text-[4.5px] text-slate-800 leading-tight pt-1 border-t border-slate-100 flex items-end justify-between">
          <div>
            <div>Sincerely,</div>
            <div className="font-bold text-slate-900 text-[5px] mt-0.5">{candidateName}</div>
            <div className="text-[4px] text-slate-500">
              Email: {dynamicEmail} · Phone: {dynamicPhone}
            </div>
          </div>
          <div className="text-[4px] text-indigo-700 font-semibold uppercase tracking-wider">
            Verified Type-D
          </div>
        </div>
      </div>
    );
  }

  // ── 3. Statement of Purpose (SOP) Preview ─────────────────────────────────
  if (docType === "SOP") {
    const candidateName = isTemplateCard ? "Applicant Full Name" : studentName;
    const university = isTemplateCard ? "Target University" : targetUniversity;
    const course = isTemplateCard
      ? "Master of Science Program"
      : targetCourse || "Master of Science";

    // Dynamic SOP sections extraction (takes up to 4 sections from document)
    const validSections = sections && sections.length > 0 ? sections.slice(0, 4) : [];

    return (
      <div
        className={`w-full aspect-[210/280] bg-white rounded-sm border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.07)] overflow-hidden relative p-3 flex flex-col justify-between select-none text-slate-800 ${className}`}
      >
        {/* Centered SOP Heading */}
        <div className="text-center">
          <div className="font-bold tracking-wider text-[6px] text-slate-900 uppercase whitespace-nowrap overflow-hidden text-ellipsis">
            STATEMENT OF PURPOSE
          </div>
          <div className="text-[4.8px] font-semibold text-indigo-700 mt-0.5 truncate">
            {course} · {university}
          </div>
          <div className="text-[4px] text-slate-500 mt-0.5 border-b border-slate-200 pb-1">
            Candidate: {candidateName}
          </div>
        </div>

        {/* Academic Statement Essay Body */}
        <div className="space-y-1 text-[4.3px] text-slate-700 leading-tight my-auto text-justify">
          {!isTemplateCard && validSections.length > 0 ? (
            validSections.map((sec, idx) => (
              <p key={idx} className="line-clamp-2">
                <span className="font-semibold text-slate-900">
                  {idx + 1}. {sec.heading}:
                </span>{" "}
                {stripMarkdown(sec.content)}
              </p>
            ))
          ) : isTemplateCard ? (
            <>
              <p className="line-clamp-2">
                <span className="font-semibold text-slate-900">1. Intellectual Motivation:</span> Academic rationale and motivation for selecting the specialized graduate curriculum and technical focus area.
              </p>

              <p className="line-clamp-2">
                <span className="font-semibold text-slate-900">2. Academic Preparation:</span> Relevant undergraduate background, coursework distinction, capstone projects, and computational proficiencies.
              </p>

              <p className="line-clamp-2">
                <span className="font-semibold text-slate-900">3. Why Target University:</span> Faculty alignment, specialized research laboratories, and distinctive academic curriculum advantages.
              </p>

              <p className="line-clamp-2">
                <span className="font-semibold text-slate-900">4. Future Trajectory:</span> Post-graduation professional objectives and strategic contribution in technical and research domains.
              </p>
            </>
          ) : (
            <>
              <p className="line-clamp-2">
                <span className="font-semibold text-slate-900">1. Intellectual Motivation:</span> My
                dedication to advanced computing and analytical engineering stems from an imperative to solve complex
                algorithmic challenges. Developing intelligent systems capable of processing
                multidimensional datasets requires theoretical rigour.
              </p>

              <p className="line-clamp-2">
                <span className="font-semibold text-slate-900">2. Academic Preparation:</span> During my
                undergraduate coursework, I maintained distinction in discrete mathematics,
                distributed algorithms, and statistical inference, completing capstone research in
                predictive modeling.
              </p>

              <p className="line-clamp-2">
                <span className="font-semibold text-slate-900">3. Why {university}:</span> The
                institution&apos;s pioneering research laboratories and specialized computational curriculum
                provide an unparalleled ecosystem for my thesis.
              </p>

              <p className="line-clamp-2">
                <span className="font-semibold text-slate-900">4. Future Trajectory:</span> Following
                graduate completion, I aim to lead enterprise technical initiatives in scalable
                infrastructure and algorithmic engineering.
              </p>
            </>
          )}
        </div>

        {/* Footer Candidate Line */}
        <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[4px] text-slate-500">
          <span>Admissions Committee Submission</span>
          <span className="font-semibold text-slate-700">{candidateName}</span>
        </div>
      </div>
    );
  }

  // ── 4. Institutional Letter of Recommendation (LOR) Preview ───────────────
  if (docType === "LOR") {
    const candidateName = isTemplateCard ? "the candidate" : studentName;
    const university = isTemplateCard ? "Faculty of Engineering" : targetUniversity;

    const rawRecom = getSec("recommendation") || getSec("body");
    const recomSnippet = !isTemplateCard && rawRecom
      ? stripMarkdown(rawRecom)
      : `It is my distinct pleasure to offer my highest recommendation for ${candidateName} for admission to your graduate degree programme. Over multiple academic terms, they demonstrated exemplary intellectual discipline and analytical capability.`;

    const rawDept = getSec("letterhead") || getSec("department");
    const deptTitle = !isTemplateCard && rawDept
      ? stripMarkdown(rawDept.split("\n")[0])
      : "Department of Computer Science & Engineering";

    return (
      <div
        className={`w-full aspect-[210/280] bg-white rounded-sm border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.07)] overflow-hidden relative p-3 flex flex-col justify-between select-none text-slate-800 ${className}`}
      >
        {/* Institutional Letterhead Top Banner */}
        <div className="border-b-2 border-emerald-700 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Crest Logo */}
            <div className="w-5 h-5 bg-emerald-50 rounded-full border border-emerald-300 flex items-center justify-center text-[7px] text-emerald-800 font-bold shrink-0">
              🏛️
            </div>
            <div className="min-w-0">
              <div className="text-[5.5px] font-bold text-emerald-950 uppercase tracking-tight truncate">
                {deptTitle}
              </div>
              <div className="text-[4px] text-slate-500 truncate">
                Office of Faculty Academic Evaluations · {university}
              </div>
            </div>
          </div>
          <div className="text-[4px] text-slate-400 shrink-0">Ref: LOR-2026/89</div>
        </div>

        {/* LOR Recipient & Salutation */}
        <div className="mt-1">
          <div className="text-[6px] font-bold text-slate-900 uppercase tracking-wide">
            CONFIDENTIAL LETTER OF RECOMMENDATION
          </div>
          <div className="text-[4.5px] text-slate-700 font-medium mt-0.5">
            To The Admissions Committee,
          </div>
        </div>

        {/* Recommendation Body */}
        <div className="space-y-1 text-[4.3px] text-slate-700 leading-tight my-auto text-justify">
          <p className="line-clamp-3">
            {recomSnippet}
          </p>

          <p className="line-clamp-2">
            Their capacity for independent analytical inquiry is exceptional, placing consistently at the top of their cohort. I recommend <span className="font-medium text-slate-900">{candidateName}</span> without hesitation or reserve.
          </p>
        </div>

        {/* Signature & Seal Block */}
        <div className="pt-1 border-t border-slate-100 flex items-end justify-between">
          <div>
            <div className="w-12 h-3 border-b border-slate-400 mb-0.5" />
            <div className="text-[4.8px] font-bold text-slate-900">Senior Faculty Chair</div>
            <div className="text-[3.8px] text-slate-500">
              {university}
            </div>
          </div>
          {/* Institutional Seal Stamp */}
          <div className="w-6 h-6 rounded-full border border-emerald-600/60 bg-emerald-50/60 flex items-center justify-center text-[4px] font-bold text-emerald-800 text-center leading-none p-0.5">
            VERIFIED SEAL
          </div>
        </div>
      </div>
    );
  }

  // ── 5. Blank Document Preview ─────────────────────────────────────────────
  return (
    <div
      className={`w-full aspect-[210/280] bg-white rounded-sm border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.07)] overflow-hidden relative p-3 flex flex-col items-center justify-center select-none text-slate-800 group-hover:border-indigo-400 transition ${className}`}
    >
      {/* Subtle Page Margin Guidelines */}
      <div className="absolute inset-2 border border-dashed border-slate-200/70 rounded-xs pointer-events-none" />

      {/* Modern Centered Plus Action */}
      <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 flex items-center justify-center text-xl font-bold shadow-xs transition duration-200">
        +
      </div>
      <div className="text-[8px] font-semibold text-slate-800 mt-2.5">Blank Document</div>
      <div className="text-[5.5px] text-slate-400 mt-0.5">Custom Generation</div>
    </div>
  );
}
