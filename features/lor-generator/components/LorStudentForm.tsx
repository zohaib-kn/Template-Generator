"use client";

import React from "react";
import { useLorState } from "../hooks/useLorState";

export function LorStudentForm() {
  const { document, updateStudent } = useLorState();
  const { student } = document;

  return (
    <div className="flex flex-col gap-4 text-xs text-slate-700">
      {/* ── Student Profile ──────────────────────────────────────────── */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-2.5">
          Student Information
        </h4>

        <div className="grid grid-cols-4 gap-2 mb-2.5">
          <div className="col-span-1">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Prefix
            </label>
            <select
              value={student.prefix}
              onChange={(e) => updateStudent({ prefix: e.target.value })}
              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Mr.">Mr.</option>
              <option value="Ms.">Ms.</option>
              <option value="">(None)</option>
            </select>
          </div>

          <div className="col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={student.fullName}
              onChange={(e) => updateStudent({ fullName: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Department / Branch
            </label>
            <input
              type="text"
              value={student.department}
              onChange={(e) => updateStudent({ department: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Current Academic Standing
            </label>
            <input
              type="text"
              value={student.academicStanding}
              onChange={(e) => updateStudent({ academicStanding: e.target.value })}
              placeholder="e.g. a final-year student"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-2.5">
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Current University / College
          </label>
          <input
            type="text"
            value={student.institutionName}
            onChange={(e) => updateStudent({ institutionName: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ── Academics & Coursework ───────────────────────────────────── */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-2.5">
          Academics &amp; Coursework Evaluated
        </h4>

        <div className="flex flex-col gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Subject / Course Taught
            </label>
            <input
              type="text"
              value={student.courseTaught}
              onChange={(e) => updateStudent({ courseTaught: e.target.value })}
              placeholder="e.g. Information Security System"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Conceptual Topics Mastered
            </label>
            <textarea
              rows={2}
              value={student.keySubjects}
              onChange={(e) => updateStudent({ keySubjects: e.target.value })}
              placeholder="e.g. cryptography, network security models, and threat mitigation techniques"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* ── Capstone Project & Practical Work ────────────────────────── */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-2.5">
          Capstone Project / Research Guide Details
        </h4>

        <div className="flex flex-col gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Project Title
            </label>
            <input
              type="text"
              value={student.projectTitle}
              onChange={(e) => updateStudent({ projectTitle: e.target.value })}
              placeholder="e.g. Personalized News Aggregator with Sentiment Analysis"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Technologies / Tools Utilized
            </label>
            <input
              type="text"
              value={student.technologiesUsed}
              onChange={(e) => updateStudent({ technologiesUsed: e.target.value })}
              placeholder="e.g. Python, Django, and NLP libraries"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Project Summary &amp; Scope
            </label>
            <textarea
              rows={2}
              value={student.projectSummary}
              onChange={(e) => updateStudent({ projectSummary: e.target.value })}
              placeholder="e.g. a web-based news aggregation platform that uses machine learning techniques to analyze sentiment..."
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* ── Target Program / Higher Education ────────────────────────── */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-2.5">
          Target Higher Education
        </h4>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Target Program / Degree
            </label>
            <input
              type="text"
              value={student.targetProgram}
              onChange={(e) => updateStudent({ targetProgram: e.target.value })}
              placeholder="e.g. higher education / Master of Science"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Target University / Institution
            </label>
            <input
              type="text"
              value={student.targetUniversity}
              onChange={(e) => updateStudent({ targetUniversity: e.target.value })}
              placeholder="e.g. your esteemed institution"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
