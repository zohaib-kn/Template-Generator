"use client";

import { useState } from "react";
import type { CrmSnapshot } from "@/types/crmSnapshot";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawDataPanelProps {
  snapshot: CrmSnapshot | null;
  source: "crm-api" | "mock" | null;
}

// ---------------------------------------------------------------------------
// Small helper sub-components
// ---------------------------------------------------------------------------

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-1.5 text-[11px] leading-relaxed">
      <span className="text-slate-400 shrink-0 w-28">{label}</span>
      <span className="text-slate-700 font-medium break-all">{value}</span>
    </div>
  );
}

function SectionHeader({ icon, title, count }: { icon: string; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-1.5 mt-3 mb-1.5">
      <span className="text-[13px]">{icon}</span>
      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{title}</span>
      {count !== undefined && (
        <span className="text-[10px] font-semibold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-slate-200 my-2" />;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * RawDataPanel — Editor-only. NEVER appears in the PDF.
 *
 * Displays ALL fields received from the CRM API snapshot so the user can
 * verify the data and show their senior. After approval, sections not needed
 * in the resume can be removed.
 */
export function RawDataPanel({ snapshot, source }: RawDataPanelProps) {
  const [open, setOpen] = useState(false);

  if (!snapshot) return null;

  const s = snapshot.student ?? {};
  const pd = s.personalDetails ?? {};
  const nat = s.nationality ?? {};
  const bg = s.backgroundInfo as Record<string, unknown> ?? {};
  const passport = s.passportInfo ?? {};
  const mailing = s.mailingAddress ?? {};
  const permanent = s.permanentAddress ?? {};
  const parents = s.parents as { father?: Record<string, string>; mother?: Record<string, string> } ?? {};
  const emergency = s.emergencyContact as Record<string, string> ?? {};
  const fee = s.consultancyFee as Record<string, unknown> ?? {};
  const loan = (s.loan as { overview?: Record<string, unknown> })?.overview ?? {};

  const education = s.academicQualifications ?? [];
  const workExp = s.workExperience ?? [];
  const tests = s.tests ?? [];
  const docs = snapshot.documents ?? s.documents ?? [];
  const programs = snapshot.appliedPrograms ?? [];

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      {/* ── Header / Toggle ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5
                   hover:bg-amber-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px]">📋</span>
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
            Raw Student Data
          </span>
          {source === "crm-api" && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                             bg-violet-100 text-violet-700 border border-violet-200">
              Live CRM
            </span>
          )}
          {source === "mock" && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full
                             bg-slate-100 text-slate-500 border border-slate-200">
              Mock
            </span>
          )}
        </div>
        <span className="text-[11px] text-amber-600">{open ? "▲ Collapse" : "▼ Expand"}</span>
      </button>

      {/* ── Content ── */}
      {open && (
        <div className="px-3 pb-3 space-y-0.5 max-h-[600px] overflow-y-auto">

          {/* ── Personal Info ── */}
          <SectionHeader icon="👤" title="Personal Info" />
          <Row label="First Name" value={pd.firstName} />
          <Row label="Middle Name" value={pd.middleName} />
          <Row label="Last Name" value={pd.lastName} />
          <Row label="Email" value={pd.email} />
          <Row label="Personal Email" value={pd.personalEmail} />
          <Row label="Alternate Email" value={pd.alternateEmail} />
          <Row label="Mobile" value={pd.mobile} />
          <Row label="DOB" value={pd.dob?.split("T")[0]} />
          <Row label="Gender" value={pd.gender} />
          <Row label="Marital Status" value={pd.maritalStatus} />

          <Divider />

          {/* ── Nationality ── */}
          <SectionHeader icon="🌍" title="Nationality" />
          <Row label="Nationality" value={nat.nationality} />
          <Row label="Citizenship" value={nat.citizenship} />
          <Row
            label="Living Abroad"
            value={nat.livingInOtherCountry ? `Yes — ${nat.livingCountry ?? ""}` : "No"}
          />
          <Row label="Dual Citizenship" value={nat.dualCitizenship ? "Yes" : "No"} />

          <Divider />

          {/* ── Passport ── */}
          <SectionHeader icon="🛂" title="Passport" />
          <Row label="Passport No." value={passport.passportNumber} />
          <Row label="Issue Date" value={passport.issueDate?.split("T")[0]} />
          <Row label="Expiry Date" value={passport.expiryDate?.split("T")[0]} />
          <Row label="Issue Country" value={passport.issueCountry} />
          <Row label="City of Birth" value={passport.cityOfBirth} />
          <Row label="Country of Birth" value={passport.countryOfBirth} />

          <Divider />

          {/* ── Mailing Address ── */}
          <SectionHeader icon="🏠" title="Mailing Address" />
          <Row label="Address 1" value={mailing.address1} />
          <Row label="Address 2" value={mailing.address2} />
          <Row label="City" value={mailing.city} />
          <Row label="State" value={mailing.state} />
          <Row label="Country" value={mailing.country} />
          <Row label="Pincode" value={mailing.pincode} />

          <Divider />

          {/* ── Permanent Address ── */}
          <SectionHeader icon="🏡" title="Permanent Address" />
          <Row label="Address 1" value={permanent.address1} />
          <Row label="City" value={permanent.city} />
          <Row label="State" value={permanent.state} />
          <Row label="Country" value={permanent.country} />
          <Row label="Pincode" value={permanent.pincode} />

          <Divider />

          {/* ── Background Info ── */}
          <SectionHeader icon="🔍" title="Background Info" />
          <Row label="Immigration Applied" value={bg.immigrationApplied ? `Yes — ${String(bg.immigrationCountry ?? "")}` : "No"} />
          <Row label="Visa Refusal" value={bg.visaRefusal ? `Yes — ${String(bg.refusalCountry ?? "")}` : "No"} />
          <Row label="Medical Condition" value={bg.medicalCondition ? "Yes" : "No"} />
          <Row label="Criminal Offence" value={bg.criminalOffence ? "Yes" : "No"} />

          <Divider />

          {/* ── Education ── */}
          <SectionHeader icon="🎓" title="Education" count={education.length} />
          {education.map((q, i) => (
            <div key={q._id ?? i} className="mb-2 pl-1 border-l-2 border-amber-200">
              <p className="text-[11px] font-semibold text-slate-700">
                {q.qualification || q.levelOfStudy}
              </p>
              <p className="text-[10px] text-slate-500">
                {q.institution} | {q.boardOrUniversity}
              </p>
              <p className="text-[10px] text-slate-400">
                {q.startDate?.split("T")[0]} → {q.endDate?.split("T")[0]}
                {q.score && ` | Score: ${q.score}/${q.gradingSystem}`}
              </p>
            </div>
          ))}

          <Divider />

          {/* ── Work Experience ── */}
          <SectionHeader icon="💼" title="Work Experience" count={workExp.length} />
          {workExp.length === 0 && (
            <p className="text-[11px] text-slate-400 italic">No work experience on record.</p>
          )}
          {workExp.map((w, i) => (
            <div key={w._id ?? i} className="mb-2 pl-1 border-l-2 border-amber-200">
              <p className="text-[11px] font-semibold text-slate-700">
                {w.position} @ {w.organisation}
              </p>
              <p className="text-[10px] text-slate-500">
                {w.workingFrom?.split("T")[0]} → {w.workingUpto?.split("T")[0]}
              </p>
              {w.jobProfile && (
                <p className="text-[10px] text-slate-400 mt-0.5">{w.jobProfile}</p>
              )}
            </div>
          ))}

          <Divider />

          {/* ── Test Scores ── */}
          <SectionHeader icon="📝" title="Test Scores" count={tests.length} />
          {tests.length === 0 && (
            <p className="text-[11px] text-slate-400 italic">No test scores on record.</p>
          )}
          {tests.map((t, i) => (
            <div key={t._id ?? i} className="mb-2 pl-1 border-l-2 border-amber-200">
              <Row label="Overall Score" value={t.overallScore} />
              <Row label="Test Date" value={t.testDate?.split("T")[0]} />
              <Row label="Waiver" value={t.waiver ? "Yes" : "No"} />
              <Row label="12th English Mark" value={t.waiver12thEnglishMark} />
            </div>
          ))}

          <Divider />

          {/* ── Emergency Contact ── */}
          <SectionHeader icon="🚨" title="Emergency Contact" />
          {Object.keys(emergency).length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">No emergency contact on record.</p>
          ) : (
            <>
              <Row label="Name" value={emergency.name} />
              <Row label="Phone" value={emergency.phone} />
              <Row label="Email" value={emergency.email} />
              <Row label="Relation" value={emergency.relation} />
            </>
          )}

          <Divider />

          {/* ── Parents ── */}
          <SectionHeader icon="👨‍👩‍👦" title="Parents" />
          {parents.father && (
            <div className="mb-1">
              <p className="text-[10px] font-semibold text-slate-500 mb-0.5">Father</p>
              <Row label="Name" value={parents.father.name} />
              <Row label="Phone" value={parents.father.phone} />
              <Row label="Email" value={parents.father.email} />
            </div>
          )}
          {parents.mother && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 mb-0.5">Mother</p>
              <Row label="Name" value={parents.mother.name} />
              <Row label="Phone" value={parents.mother.phone} />
              <Row label="Email" value={parents.mother.email} />
            </div>
          )}

          <Divider />

          {/* ── Financial ── */}
          <SectionHeader icon="🏦" title="Financial" />
          <Row label="Consultancy Fee" value={fee.amount ? `₹${Number(fee.amount).toLocaleString("en-IN")}` : undefined} />
          <Row label="Loan Bank" value={String(loan.bankName ?? "")} />
          <Row label="Loan Status" value={String(loan.status ?? "")} />
          <Row label="Loan Type" value={String(loan.type ?? "")} />

          <Divider />

          {/* ── Documents Uploaded ── */}
          <SectionHeader icon="📄" title="Documents Uploaded" count={docs.length} />
          {docs.map((d, i) => (
            <div key={i} className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                d.approvalStatus === "Verified"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {d.approvalStatus === "Verified" ? "✅" : "⏳"}
              </span>
              <span className="text-[11px] text-slate-700">{d.name}</span>
            </div>
          ))}

          <Divider />

          {/* ── Applied Programs ── */}
          <SectionHeader icon="🎯" title="Applied Programs" count={programs.length} />
          {programs.map((p, i) => (
            <div key={p._id ?? i} className="mb-2 pl-1 border-l-2 border-amber-200">
              <p className="text-[11px] font-semibold text-slate-700">{p.course?.title}</p>
              <p className="text-[10px] text-slate-500">
                {p.university?.name} — {p.country?.name}
              </p>
              <p className="text-[10px] text-slate-400">{p.referenceNo}</p>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}
