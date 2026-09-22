"use client";

import type { CrmSnapshot } from "@/types/crmSnapshot";

interface ResumeStudentDetailsModalProps {
  snapshot: CrmSnapshot | null;
  isOpen: boolean;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-xs leading-relaxed py-0.5">
      <span className="text-slate-400 shrink-0 w-32 font-medium">{label}</span>
      <span className="text-slate-800 font-medium break-all">{value}</span>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 pt-2 border-t border-slate-100 first:pt-0 first:border-0">
      {title}
    </h4>
  );
}

export function ResumeStudentDetailsModal({
  snapshot,
  isOpen,
  onClose,
}: ResumeStudentDetailsModalProps) {
  if (!isOpen || !snapshot) return null;

  const s = snapshot.student ?? {};
  const pd = s.personalDetails ?? {};
  const nat = s.nationality ?? {};
  const bg = (s.backgroundInfo as Record<string, unknown>) ?? {};
  const passport = s.passportInfo ?? {};
  const mailing = s.mailingAddress ?? {};
  const permanent = s.permanentAddress ?? {};
  const parents = (s.parents as { father?: Record<string, string>; mother?: Record<string, string> }) ?? {};
  const emergency = (s.emergencyContact as Record<string, string>) ?? {};
  const fee = (s.consultancyFee as Record<string, unknown>) ?? {};
  const loan = ((s.loan as { overview?: Record<string, unknown> })?.overview) ?? {};

  const education = s.academicQualifications ?? [];
  const workExp = s.workExperience ?? [];
  const tests = s.tests ?? [];
  const docs = snapshot.documents ?? s.documents ?? [];
  const programs = snapshot.appliedPrograms ?? [];

  const fullName = [pd.firstName, pd.middleName, pd.lastName].filter(Boolean).join(" ") || "Student Profile";
  const initials =
    fullName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "ST";

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
        aria-labelledby="resume-raw-data-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-medium text-xs flex items-center justify-center">
                {initials}
              </div>
              <div>
                <h3 id="resume-raw-data-title" className="text-sm font-semibold text-slate-900 leading-snug">
                  {fullName}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Complete Raw Student Profile from CRM
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body Content */}
          <div className="px-6 py-5 overflow-y-auto space-y-4 flex-1">
            {/* Identity & Contact */}
            <div>
              <SectionHeading title="Identity & Contact Information" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <Row label="Full Name" value={fullName} />
                <Row label="DOB" value={pd.dob?.split("T")[0]} />
                <Row label="Email" value={pd.email} />
                <Row label="Mobile" value={pd.mobile} />
                <Row label="Gender" value={pd.gender} />
                <Row label="Marital Status" value={pd.maritalStatus} />
                <Row label="Passport No." value={passport.passportNumber} />
                <Row label="Nationality" value={nat.nationality} />
              </div>
            </div>

            {/* Addresses */}
            <div>
              <SectionHeading title="Addresses" />
              <div className="space-y-1 text-xs">
                <Row
                  label="Mailing"
                  value={[mailing.address1, mailing.address2, mailing.city, mailing.state, mailing.country, mailing.pincode].filter(Boolean).join(", ")}
                />
                <Row
                  label="Permanent"
                  value={[permanent.address1, permanent.city, permanent.state, permanent.country, permanent.pincode].filter(Boolean).join(", ")}
                />
              </div>
            </div>

            {/* Academic Qualifications */}
            <div>
              <SectionHeading title={`Academic Qualifications (${education.length})`} />
              {education.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No academic qualifications recorded.</p>
              ) : (
                <div className="space-y-2">
                  {education.map((q, i) => (
                    <div key={q._id ?? i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <p className="font-semibold text-slate-800">{q.qualification || q.levelOfStudy}</p>
                      <p className="text-slate-500 text-[11px]">{q.institution} | {q.boardOrUniversity}</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        {q.startDate?.split("T")[0]} → {q.endDate?.split("T")[0]}
                        {q.score && ` · Score: ${q.score}/${q.gradingSystem}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Work Experience */}
            <div>
              <SectionHeading title={`Work Experience (${workExp.length})`} />
              {workExp.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No work experience on record.</p>
              ) : (
                <div className="space-y-2">
                  {workExp.map((w, i) => (
                    <div key={w._id ?? i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <p className="font-semibold text-slate-800">{w.position} @ {w.organisation}</p>
                      <p className="text-slate-500 text-[11px]">{w.workingFrom?.split("T")[0]} → {w.workingUpto?.split("T")[0]}</p>
                      {w.jobProfile && <p className="text-slate-400 text-[11px] mt-1">{w.jobProfile}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tests */}
            <div>
              <SectionHeading title={`Test Scores (${tests.length})`} />
              {tests.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No test scores on record.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {tests.map((t, i) => (
                    <div key={t._id ?? i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <p className="font-semibold text-slate-800">Language Examination / Test</p>
                      <Row label="Overall Score" value={t.overallScore} />
                      <Row label="Test Date" value={t.testDate?.split("T")[0]} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Background Info */}
            <div>
              <SectionHeading title="Background & Immigration" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <Row label="Immigration Applied" value={bg.immigrationApplied ? `Yes (${String(bg.immigrationCountry ?? "")})` : "No"} />
                <Row label="Visa Refusal" value={bg.visaRefusal ? `Yes (${String(bg.refusalCountry ?? "")})` : "No"} />
                <Row label="Medical Condition" value={bg.medicalCondition ? "Yes" : "No"} />
                <Row label="Criminal Offence" value={bg.criminalOffence ? "Yes" : "No"} />
              </div>
            </div>

            {/* Parents & Emergency Contact */}
            {Boolean(parents.father || parents.mother || emergency.name) && (
              <div>
                <SectionHeading title="Parents & Emergency Contacts" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {parents.father?.name && <Row label="Father" value={`${parents.father.name} (${parents.father.phone ?? ""})`} />}
                  {parents.mother?.name && <Row label="Mother" value={`${parents.mother.name} (${parents.mother.phone ?? ""})`} />}
                  {emergency.name && <Row label="Emergency Contact" value={`${emergency.name} (${emergency.relation ?? ""}) · ${emergency.phone ?? ""}`} />}
                </div>
              </div>
            )}

            {/* Financial Details */}
            {Boolean(fee.amount || loan.bankName) && (
              <div>
                <SectionHeading title="Financial & Consultancy" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {fee.amount ? <Row label="Consultancy Fee" value={`₹${Number(fee.amount).toLocaleString("en-IN")}`} /> : null}
                  {loan.bankName ? <Row label="Loan Bank" value={String(loan.bankName)} /> : null}
                  {loan.status ? <Row label="Loan Status" value={String(loan.status)} /> : null}
                </div>
              </div>
            )}

            {/* Documents Uploaded */}
            {docs.length > 0 && (
              <div>
                <SectionHeading title={`Documents Uploaded (${docs.length})`} />
                <div className="space-y-1 text-xs">
                  {docs.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                      <span className="text-slate-800 font-medium">{doc.name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                        doc.approvalStatus === "Verified" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {doc.approvalStatus || "Uploaded"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Applied Programs */}
            <div>
              <SectionHeading title={`Applied Programs (${programs.length})`} />
              {programs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No applied programs.</p>
              ) : (
                <div className="space-y-2">
                  {programs.map((p, i) => (
                    <div key={p._id ?? i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <p className="font-semibold text-slate-800">{p.course?.title}</p>
                      <p className="text-slate-500 text-[11px]">{p.university?.name} — {p.country?.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-slate-100 flex justify-end bg-slate-50/50 flex-shrink-0">
            <button
              onClick={onClose}
              className="h-8 px-4 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
