"use client";

import type { StudentDocumentContext } from "../types/sop-generator";

interface StudentDetailsModalProps {
  ctx: StudentDocumentContext;
  isOpen: boolean;
  onClose: () => void;
}

export function StudentDetailsModal({ ctx, isOpen, onClose }: StudentDetailsModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-details-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 w-full max-w-xl overflow-hidden my-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-medium text-xs flex items-center justify-center">
                {ctx.student.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "ST"}
              </div>
              <div>
                <h3 id="student-details-title" className="text-sm font-semibold text-slate-900 leading-snug">
                  {ctx.student.fullName || "Student Profile"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {ctx.student.city}, {ctx.student.country} · {ctx.student.nationality}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close dialog"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body Content */}
          <div className="px-6 py-5 max-h-[65vh] overflow-y-auto space-y-6">
            {/* Identity & Contact */}
            <div>
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Identity & Contact Information
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-[10px] text-slate-400 font-medium">Passport Number</span>
                  <span className="font-mono font-medium text-slate-800">{ctx.student.passportNumber || "Not recorded"}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-[10px] text-slate-400 font-medium">Date of Birth</span>
                  <span className="font-medium text-slate-800">{ctx.student.dateOfBirth || "Not recorded"}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-[10px] text-slate-400 font-medium">Email Address</span>
                  <span className="font-medium text-slate-800 truncate block">{ctx.student.email || "Not recorded"}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-[10px] text-slate-400 font-medium">Contact Phone</span>
                  <span className="font-medium text-slate-800">{ctx.student.phone || "Not recorded"}</span>
                </div>
                <div className="col-span-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-[10px] text-slate-400 font-medium">Residential Address</span>
                  <span className="font-medium text-slate-800">{ctx.student.address || "Not recorded"}</span>
                </div>
              </div>
            </div>

            {/* Academic Background */}
            <div>
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Prior Academic Credentials
              </h4>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="font-medium text-slate-900">{ctx.academics.latestQualification}</span>
                  <span className="font-semibold text-slate-900">{ctx.academics.percentage}</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  <span>{ctx.academics.institution}</span> · <span>{ctx.academics.board} ({ctx.academics.completionYear})</span>
                </div>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                  <span className="font-medium text-slate-600">Subjects: </span>
                  <span>{ctx.academics.subjects}</span>
                </div>
              </div>
            </div>

            {/* Language Proficiency */}
            <div>
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Language Examination (IELTS)
              </h4>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-900 text-white">
                  <span className="block text-[10px] text-slate-400">Overall</span>
                  <span className="text-sm font-bold">{ctx.tests.ielts.overall}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-[10px] text-slate-400">Listening</span>
                  <span className="font-semibold text-slate-800">{ctx.tests.ielts.listening}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-[10px] text-slate-400">Reading</span>
                  <span className="font-semibold text-slate-800">{ctx.tests.ielts.reading}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-[10px] text-slate-400">Writing</span>
                  <span className="font-semibold text-slate-800">{ctx.tests.ielts.writing}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-[10px] text-slate-400">Speaking</span>
                  <span className="font-semibold text-slate-800">{ctx.tests.ielts.speaking}</span>
                </div>
              </div>
              {ctx.tests.ielts.dateTaken && (
                <p className="text-[11px] text-slate-400 mt-1.5 text-right">
                  Exam date: {ctx.tests.ielts.dateTaken}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-slate-100 flex justify-end bg-slate-50/50">
            <button
              onClick={onClose}
              className="h-8 px-4 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
