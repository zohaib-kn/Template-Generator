"use client";

import React from "react";
import { useLorState } from "../hooks/useLorState";

export function LorContentEditor() {
  const { document, updateNarrative } = useLorState();
  const { narrative, student, recommender, institution } = document;

  // Auto-compose helper to generate narrative from student data
  const handleRegenerateFromFields = () => {
    const studentTitle = student.prefix ? `${student.prefix} ` : "";
    const name = student.fullName || "the candidate";
    const studentWithTitle = `${studentTitle}${name}`.trim();
    const dept = student.department || "Engineering";
    const college = student.institutionName || institution.name || "the college";
    const target = student.targetProgram || "higher education";
    const uni = student.targetUniversity || "your esteemed institution";
    const standing = student.academicStanding || "a student";
    const role = recommender.role || recommender.designation || "faculty member";
    const course = student.courseTaught || "Advanced Computer Science";
    const topics = student.keySubjects || "core technical and analytical concepts";
    const project = student.projectTitle || "Capstone Research Project";
    const tech = student.technologiesUsed || "modern software development tools";
    const summary = student.projectSummary || "a full-stack academic platform demonstrating practical application of theory";

    updateNarrative({
      introParagraph: `It is my pleasure to recommend ${studentWithTitle}, ${standing} of the ${dept} at ${college}, for pursuing ${target} at ${uni}.`,
      academicsParagraph: `As the ${role}, I have had the opportunity to observe ${name}'s academic and personal growth over the past several years. Additionally, I taught him ${course}, where he displayed excellent conceptual clarity in topics such as ${topics}. His performance in the subject was commendable, and he consistently contributed to classroom discussions with insightful ideas.`,
      projectParagraph: `Furthermore, I had the privilege of guiding ${name}'s final-year capstone project titled “${project}.” In this project, ${name} played a pivotal role in developing ${summary}. He demonstrated strong problem-solving skills, effective use of technologies such as ${tech}, and an ability to work collaboratively with his teammates. ${name} also exhibited excellent documentation and presentation skills, ensuring that the project met both technical and academic expectations.`,
      qualitiesParagraph: `${name} is a disciplined, motivated, and inquisitive student who consistently strives for excellence. His ability to link theoretical knowledge with practical solutions, coupled with his teamwork and communication skills, make him well-prepared for the demands of graduate-level education.`,
      conclusionParagraph: `I wholeheartedly recommend ${name} for admission to ${uni}. I am confident that he will continue to perform with the same dedication, curiosity, and technical competence, contributing positively to the academic community.`,
    });
  };

  return (
    <div className="flex flex-col gap-4 text-xs text-slate-700">
      {/* ── Action Toolbar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200 p-2.5 rounded-lg">
        <div>
          <span className="font-semibold text-blue-900 block text-[11.5px]">
            Dynamic Narrative Composer
          </span>
          <span className="text-[10.5px] text-blue-700">
            Edit text directly or re-compose using your current Student &amp; Recommender details.
          </span>
        </div>
        <button
          type="button"
          onClick={handleRegenerateFromFields}
          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow-xs text-[11px] flex items-center gap-1 cursor-pointer"
        >
          <span>⚡</span> Re-compose from Fields
        </button>
      </div>

      {/* ── Paragraph 1: Introduction ────────────────────────────────── */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between mb-1.5">
          <label className="font-semibold text-slate-900 text-[11.5px]">
            1. Introduction &amp; Recommendation Intent
          </label>
          <span className="text-[10px] text-slate-400 font-mono">
            {narrative.introParagraph?.split(/\s+/).filter(Boolean).length || 0} words
          </span>
        </div>
        <textarea
          rows={3}
          value={narrative.introParagraph}
          onChange={(e) => updateNarrative({ introParagraph: e.target.value })}
          className="w-full p-2.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed text-xs"
        />
      </div>

      {/* ── Paragraph 2: Coursework & Academics ──────────────────────── */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between mb-1.5">
          <label className="font-semibold text-slate-900 text-[11.5px]">
            2. Relationship Context &amp; Coursework Mastery
          </label>
          <span className="text-[10px] text-slate-400 font-mono">
            {narrative.academicsParagraph?.split(/\s+/).filter(Boolean).length || 0} words
          </span>
        </div>
        <textarea
          rows={4}
          value={narrative.academicsParagraph}
          onChange={(e) => updateNarrative({ academicsParagraph: e.target.value })}
          className="w-full p-2.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed text-xs"
        />
      </div>

      {/* ── Paragraph 3: Project Guidance & Technical Execution ──────── */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between mb-1.5">
          <label className="font-semibold text-slate-900 text-[11.5px]">
            3. Capstone Project Guidance &amp; Technical Execution
          </label>
          <span className="text-[10px] text-slate-400 font-mono">
            {narrative.projectParagraph?.split(/\s+/).filter(Boolean).length || 0} words
          </span>
        </div>
        <textarea
          rows={5}
          value={narrative.projectParagraph}
          onChange={(e) => updateNarrative({ projectParagraph: e.target.value })}
          className="w-full p-2.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed text-xs"
        />
      </div>

      {/* ── Paragraph 4: Personal Qualities & Character ──────────────── */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between mb-1.5">
          <label className="font-semibold text-slate-900 text-[11.5px]">
            4. Personal Qualities &amp; Graduate Readiness
          </label>
          <span className="text-[10px] text-slate-400 font-mono">
            {narrative.qualitiesParagraph?.split(/\s+/).filter(Boolean).length || 0} words
          </span>
        </div>
        <textarea
          rows={3}
          value={narrative.qualitiesParagraph}
          onChange={(e) => updateNarrative({ qualitiesParagraph: e.target.value })}
          className="w-full p-2.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed text-xs"
        />
      </div>

      {/* ── Paragraph 5: Concluding Recommendation ───────────────────── */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between mb-1.5">
          <label className="font-semibold text-slate-900 text-[11.5px]">
            5. Final Endorsement &amp; Recommendation
          </label>
          <span className="text-[10px] text-slate-400 font-mono">
            {narrative.conclusionParagraph?.split(/\s+/).filter(Boolean).length || 0} words
          </span>
        </div>
        <textarea
          rows={3}
          value={narrative.conclusionParagraph}
          onChange={(e) => updateNarrative({ conclusionParagraph: e.target.value })}
          className="w-full p-2.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed text-xs"
        />
      </div>
    </div>
  );
}
