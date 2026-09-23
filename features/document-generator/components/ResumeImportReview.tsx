/**
 * features/document-generator/components/ResumeImportReview.tsx
 *
 * Interactive Import Review Workstation.
 *
 * Capabilities:
 * 1. Direct inline editing of candidate personal facts and entries.
 * 2. Adding missing details (e.g. + Add Certification, + Add Skill).
 * 3. Resolving CRM conflicts side-by-side.
 * 4. Reclassifying ambiguous items via section dropdown.
 * 5. Committing confirmed DocumentData to the Resume Builder workspace.
 */

"use client";

import React, { useState, useRef } from "react";
import type { DocumentData, EducationEntry, InternshipEntry } from "@/types";
import type {
  ResumeImportResult,
  CrmConflictItem,
  AmbiguousItem,
} from "../types/import";
import { generateId } from "@/lib/generateId";
import { PhotoCropModal } from "../photo/PhotoCropModal";

interface ResumeImportReviewProps {
  importResult: ResumeImportResult;
  onApply: (finalData: DocumentData) => void;
  onCancel: () => void;
}

export function ResumeImportReview({
  importResult,
  onApply,
  onCancel,
}: ResumeImportReviewProps) {
  const [data, setData] = useState<DocumentData>(() => ({
    ...importResult.data,
    personal: { ...(importResult.data.personal || {}) },
    education: [...(importResult.data.education || [])],
    internships: [...(importResult.data.internships || [])],
    academicProjects: [...(importResult.data.academicProjects || [])],
    certifications: [...(importResult.data.certifications || [])],
    skills: [...(importResult.data.skills || [])],
    languages: [...(importResult.data.languages || [])],
  }));

  const [crmConflicts, setCrmConflicts] = useState<CrmConflictItem[]>(
    importResult.crmConflicts || []
  );

  const [cropOpen, setCropOpen] = useState(false);
  const [cropImg, setCropImg] = useState<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleOpenCropModal() {
    if (!data.personal?.photoUrl) return;
    const img = new Image();
    img.onload = () => {
      setCropImg(img);
      setCropOpen(true);
    };
    img.src = data.personal.photoUrl;
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;
      const img = new Image();
      img.onload = () => {
        setCropImg(img);
        setCropOpen(true);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleCropApply(dataUri: string) {
    setData((p) => ({
      ...p,
      personal: { ...p.personal, photoUrl: dataUri },
    }));
    setCropOpen(false);
    setCropImg(null);
  }

  function handleCropCancel() {
    setCropOpen(false);
    setCropImg(null);
  }
  const [ambiguousItems, setAmbiguousItems] = useState<AmbiguousItem[]>(
    importResult.ambiguousItems || []
  );

  const [activeTab, setActiveTab] = useState<"overview" | "conflicts" | "sections">("overview");
  const [editingSection, setEditingSection] = useState<string | null>("personal");

  // CRM Conflict toggle handler
  function handleConflictToggle(
    field: string,
    resolution: "USE_CRM" | "USE_UPLOADED" | "CUSTOM",
    customVal?: string
  ) {
    setCrmConflicts((prev) =>
      prev.map((c) => (c.field === field ? { ...c, resolution, customValue: customVal } : c))
    );

    // Apply immediately to working DocumentData
    const conflict = crmConflicts.find((c) => c.field === field);
    if (!conflict) return;

    const valueToUse =
      resolution === "USE_CRM"
        ? conflict.crmValue
        : resolution === "USE_UPLOADED"
        ? conflict.uploadedValue
        : customVal || "";

    if (field === "fullName" || field === "email" || field === "phone" || field === "nationality" || field === "passportNumber") {
      setData((prev) => ({
        ...prev,
        personal: {
          ...prev.personal,
          [field]: valueToUse,
        },
      }));
    } else if (field === "englishScore") {
      setData((prev) => ({
        ...prev,
        englishCertificate: {
          ...prev.englishCertificate,
          score: valueToUse,
        },
      }));
    }
  }

  // Ambiguity reclassification handler
  function handleReclassifyAmbiguous(id: string, newSection: keyof DocumentData) {
    const item = ambiguousItems.find((a) => a.id === id);
    if (!item) return;

    setAmbiguousItems((prev) =>
      prev.map((a) => (a.id === id ? { ...a, suggestedSection: newSection } : a))
    );

    // Add entry into target list section if not present
    if (newSection === "leadershipActivities") {
      setData((prev) => ({
        ...prev,
        leadershipActivities: [
          ...(prev.leadershipActivities || []),
          { id: generateId(), activity: item.originalText },
        ],
      }));
    } else if (newSection === "volunteering") {
      setData((prev) => ({
        ...prev,
        volunteering: [
          ...(prev.volunteering || []),
          { id: generateId(), role: item.originalText },
        ],
      }));
    } else if (newSection === "academicProjects") {
      setData((prev) => ({
        ...prev,
        academicProjects: [
          ...(prev.academicProjects || []),
          { id: generateId(), title: item.originalText },
        ],
      }));
    }
  }

  // Adding missing details directly
  function handleAddEducation() {
    setData((prev) => ({
      ...prev,
      education: [
        ...(prev.education || []),
        { id: generateId(), qualification: "", institution: "" },
      ],
    }));
    setEditingSection("education");
  }

  function handleAddInternship() {
    setData((prev) => ({
      ...prev,
      internships: [
        ...(prev.internships || []),
        { id: generateId(), role: "", company: "" },
      ],
    }));
    setEditingSection("internships");
  }

  function handleAddCertification() {
    setData((prev) => ({
      ...prev,
      certifications: [
        ...(prev.certifications || []),
        { id: generateId(), name: "", provider: "" },
      ],
    }));
    setEditingSection("certifications");
  }

  function handleAddSkill() {
    setData((prev) => ({
      ...prev,
      skills: [...(prev.skills || []), { id: generateId(), name: "" }],
    }));
    setEditingSection("skills");
  }

  return (
    <div className="flex flex-col h-[650px] max-h-[85vh]">
      {/* Review Header Banner */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-900">
              Interactive Resume Review
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Extracted & Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            File: <strong>{importResult.fileName}</strong> ({(importResult.fileSizeBytes / 1024).toFixed(0)} KB) · Review and edit any field before applying
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === "overview"
                ? "bg-slate-900 text-white font-medium"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Overview
          </button>
          {crmConflicts.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("conflicts")}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === "conflicts"
                  ? "bg-amber-600 text-white font-medium"
                  : "text-amber-800 hover:bg-amber-50"
              }`}
            >
              <span>Conflicts</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                {crmConflicts.length}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("sections")}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === "sections"
                ? "bg-slate-900 text-white font-medium"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Direct Editor
          </button>
        </div>
      </div>

      {/* Main Review Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* CRM Conflict Alert if any */}
            {crmConflicts.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      {crmConflicts.length} CRM Data Conflict{crmConflicts.length > 1 ? "s" : ""} Detected
                    </h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Differences found between verified CRM profile and uploaded resume.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("conflicts")}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-2xs cursor-pointer"
                >
                  Review Conflicts
                </button>
              </div>
            )}

            {/* Ambiguous Items Section */}
            {ambiguousItems.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>❓</span>
                  <span>Ambiguous Items (Needs Classification)</span>
                </h4>
                <div className="space-y-2">
                  {ambiguousItems.map((amb) => (
                    <div
                      key={amb.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="font-medium text-slate-800 flex-1 truncate">
                        "{amb.originalText}"
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-slate-400">Assign to:</span>
                        <select
                          value={amb.suggestedSection}
                          onChange={(e) =>
                            handleReclassifyAmbiguous(amb.id, e.target.value as keyof DocumentData)
                          }
                          className="text-xs font-medium border border-slate-300 rounded px-2 py-1 bg-slate-50 cursor-pointer"
                        >
                          <option value="leadershipActivities">Leadership & Extracurricular</option>
                          <option value="volunteering">Volunteering</option>
                          <option value="academicProjects">Academic Projects</option>
                          <option value="achievements">Achievements & Awards</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detected Sections Summary Grid */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Resume Section</span>
                <span>Detected Content</span>
                <span>Action</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {/* Personal Details */}
                <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span className="font-semibold text-slate-800">Personal Details</span>
                  </div>
                  <div className="flex items-center gap-2.5 max-w-sm">
                    {data.personal?.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={data.personal.photoUrl}
                        alt="Profile"
                        className="w-6 h-6 rounded-full object-cover border border-slate-300 flex-shrink-0"
                      />
                    )}
                    <span className="text-slate-600 truncate">
                      {data.personal?.fullName || "Name not found"} · {data.personal?.email || "No email"} · {data.personal?.phone || "No phone"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSection("personal");
                      setActiveTab("sections");
                    }}
                    className="text-[#096491] hover:underline font-medium cursor-pointer"
                  >
                    Edit Details
                  </button>
                </div>

                {/* Education */}
                <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    {(data.education || []).length > 0 ? (
                      <span className="text-emerald-600 font-bold">✓</span>
                    ) : (
                      <span className="text-slate-300">○</span>
                    )}
                    <span className="font-semibold text-slate-800">Education & Training</span>
                  </div>
                  <span className="text-slate-600">
                    {(data.education || []).length} qualifications detected
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleAddEducation}
                      className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                    >
                      + Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSection("education");
                        setActiveTab("sections");
                      }}
                      className="text-[#096491] hover:underline font-medium cursor-pointer"
                    >
                      Review
                    </button>
                  </div>
                </div>

                {/* Internships & Work Experience */}
                <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    {(data.internships || []).length > 0 ? (
                      <span className="text-emerald-600 font-bold">✓</span>
                    ) : (
                      <span className="text-slate-300">○</span>
                    )}
                    <span className="font-semibold text-slate-800">Internships & Work Experience</span>
                  </div>
                  <span className="text-slate-600">
                    {(data.internships || []).length} experiences detected
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleAddInternship}
                      className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                    >
                      + Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSection("internships");
                        setActiveTab("sections");
                      }}
                      className="text-[#096491] hover:underline font-medium cursor-pointer"
                    >
                      Review
                    </button>
                  </div>
                </div>

                {/* Skills */}
                <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    {(data.skills || []).length > 0 ? (
                      <span className="text-emerald-600 font-bold">✓</span>
                    ) : (
                      <span className="text-slate-300">○</span>
                    )}
                    <span className="font-semibold text-slate-800">Skills</span>
                  </div>
                  <span className="text-slate-600">
                    {(data.skills || []).length} skills detected
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                    >
                      + Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSection("skills");
                        setActiveTab("sections");
                      }}
                      className="text-[#096491] hover:underline font-medium cursor-pointer"
                    >
                      Review
                    </button>
                  </div>
                </div>

                {/* Certifications */}
                <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    {(data.certifications || []).length > 0 ? (
                      <span className="text-emerald-600 font-bold">✓</span>
                    ) : (
                      <span className="text-slate-300">○</span>
                    )}
                    <span className="font-semibold text-slate-800">Certifications</span>
                  </div>
                  <span className="text-slate-500 italic">
                    {(data.certifications || []).length > 0
                      ? `${(data.certifications || []).length} detected`
                      : "Not found in resume"}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddCertification}
                    className="text-[#096491] hover:underline font-medium cursor-pointer"
                  >
                    + Add Certification
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CRM CONFLICTS */}
        {activeTab === "conflicts" && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
              For each conflicting item, choose whether to preserve verified CRM data or apply the uploaded resume value.
            </p>

            <div className="space-y-3">
              {crmConflicts.map((conf) => (
                <div
                  key={conf.field}
                  className="p-4 border border-slate-200 rounded-xl bg-white space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{conf.label}</span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      Discrepancy
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* CRM Choice */}
                    <button
                      type="button"
                      onClick={() => handleConflictToggle(conf.field, "USE_CRM")}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        conf.resolution === "USE_CRM"
                          ? "border-[#096491] bg-sky-50 ring-1 ring-[#096491]"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          Verified CRM Record
                        </span>
                        {conf.resolution === "USE_CRM" && (
                          <span className="text-[#096491] font-bold">✓ Selected</span>
                        )}
                      </div>
                      <span className="font-semibold text-slate-800 break-words">
                        {conf.crmValue}
                      </span>
                    </button>

                    {/* Uploaded Choice */}
                    <button
                      type="button"
                      onClick={() => handleConflictToggle(conf.field, "USE_UPLOADED")}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        conf.resolution === "USE_UPLOADED"
                          ? "border-[#096491] bg-sky-50 ring-1 ring-[#096491]"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          Uploaded Resume
                        </span>
                        {conf.resolution === "USE_UPLOADED" && (
                          <span className="text-[#096491] font-bold">✓ Selected</span>
                        )}
                      </div>
                      <span className="font-semibold text-slate-800 break-words">
                        {conf.uploadedValue}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: DIRECT SECTION EDITOR */}
        {activeTab === "sections" && (
          <div className="grid grid-cols-3 gap-4">
            {/* Section Picker Sidebar */}
            <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1 text-xs">
              <button
                type="button"
                onClick={() => setEditingSection("personal")}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium cursor-pointer ${
                  editingSection === "personal"
                    ? "bg-white shadow-2xs text-slate-900 border border-slate-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Personal Details
              </button>
              <button
                type="button"
                onClick={() => setEditingSection("education")}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium cursor-pointer ${
                  editingSection === "education"
                    ? "bg-white shadow-2xs text-slate-900 border border-slate-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Education ({(data.education || []).length})
              </button>
              <button
                type="button"
                onClick={() => setEditingSection("internships")}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium cursor-pointer ${
                  editingSection === "internships"
                    ? "bg-white shadow-2xs text-slate-900 border border-slate-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Internships ({(data.internships || []).length})
              </button>
              <button
                type="button"
                onClick={() => setEditingSection("skills")}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium cursor-pointer ${
                  editingSection === "skills"
                    ? "bg-white shadow-2xs text-slate-900 border border-slate-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Skills ({(data.skills || []).length})
              </button>
            </div>

            {/* Section Fields Editor Area */}
            <div className="col-span-2 border border-slate-200 rounded-xl p-4 bg-white space-y-3 text-xs">
              {editingSection === "personal" && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900">Personal Details</h4>

                  {/* Photo Management Card */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-12 h-12 rounded-full bg-white border border-slate-300 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {data.personal?.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={data.personal.photoUrl}
                          alt="Profile Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg opacity-60">👤</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">Profile Photo</span>
                        {data.personal?.photoUrl && (
                          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
                            Detected from resume
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {data.personal?.photoUrl && (
                          <>
                            <button
                              type="button"
                              onClick={handleOpenCropModal}
                              className="text-xs font-semibold text-[#096491] hover:underline cursor-pointer"
                            >
                              Crop to Circle
                            </button>
                            <span className="text-slate-300">·</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          {data.personal?.photoUrl ? "Change Photo" : "Upload Photo"}
                        </button>
                        {data.personal?.photoUrl && (
                          <>
                            <span className="text-slate-300">·</span>
                            <button
                              type="button"
                              onClick={() =>
                                setData((p) => ({
                                  ...p,
                                  personal: { ...p.personal, photoUrl: undefined },
                                }))
                              }
                              className="text-xs text-rose-600 hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={data.personal?.fullName || ""}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          personal: { ...p.personal, fullName: e.target.value },
                        }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:border-[#096491]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-600 block mb-1">Email</label>
                      <input
                        type="email"
                        value={data.personal?.email || ""}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            personal: { ...p.personal, email: e.target.value },
                          }))
                        }
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:border-[#096491]"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block mb-1">Phone</label>
                      <input
                        type="text"
                        value={data.personal?.phone || ""}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            personal: { ...p.personal, phone: e.target.value },
                          }))
                        }
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 focus:border-[#096491]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingSection === "education" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">Education Entries</h4>
                    <button
                      type="button"
                      onClick={handleAddEducation}
                      className="text-[#096491] hover:underline cursor-pointer"
                    >
                      + Add Entry
                    </button>
                  </div>
                  {(data.education || []).map((edu, idx) => (
                    <div key={edu.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">Entry #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setData((p) => ({
                              ...p,
                              education: (p.education || []).filter((e) => e.id !== edu.id),
                            }))
                          }
                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          ✕ Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Degree / Qualification"
                        value={edu.qualification || ""}
                        onChange={(e) => {
                          const updated = [...(data.education || [])];
                          updated[idx] = { ...updated[idx], qualification: e.target.value };
                          setData((p) => ({ ...p, education: updated }));
                        }}
                        className="w-full border border-slate-300 rounded px-2 py-1 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Institution / School"
                        value={edu.institution || ""}
                        onChange={(e) => {
                          const updated = [...(data.education || [])];
                          updated[idx] = { ...updated[idx], institution: e.target.value };
                          setData((p) => ({ ...p, education: updated }));
                        }}
                        className="w-full border border-slate-300 rounded px-2 py-1 bg-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {editingSection === "internships" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">Work Experience & Internships</h4>
                    <button
                      type="button"
                      onClick={handleAddInternship}
                      className="text-[#096491] hover:underline cursor-pointer"
                    >
                      + Add Entry
                    </button>
                  </div>
                  {(data.internships || []).map((intern, idx) => (
                    <div key={intern.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">Experience #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setData((p) => ({
                              ...p,
                              internships: (p.internships || []).filter((i) => i.id !== intern.id),
                            }))
                          }
                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          ✕ Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Job Title / Role"
                        value={intern.role || ""}
                        onChange={(e) => {
                          const updated = [...(data.internships || [])];
                          updated[idx] = { ...updated[idx], role: e.target.value };
                          setData((p) => ({ ...p, internships: updated }));
                        }}
                        className="w-full border border-slate-300 rounded px-2 py-1 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Company / Employer"
                        value={intern.company || ""}
                        onChange={(e) => {
                          const updated = [...(data.internships || [])];
                          updated[idx] = { ...updated[idx], company: e.target.value };
                          setData((p) => ({ ...p, internships: updated }));
                        }}
                        className="w-full border border-slate-300 rounded px-2 py-1 bg-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {editingSection === "skills" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">Skills List</h4>
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="text-[#096491] hover:underline cursor-pointer"
                    >
                      + Add Skill
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(data.skills || []).map((sk, idx) => (
                      <div
                        key={sk.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg"
                      >
                        <input
                          type="text"
                          value={sk.name || ""}
                          onChange={(e) => {
                            const updated = [...(data.skills || [])];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setData((p) => ({ ...p, skills: updated }));
                          }}
                          className="w-24 bg-transparent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setData((p) => ({
                              ...p,
                              skills: (p.skills || []).filter((s) => s.id !== sk.id),
                            }))
                          }
                          className="text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Review Footer Actions */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 text-xs font-medium transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => onApply(data)}
          className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <span>✓</span>
          <span>Apply to Resume Editor</span>
        </button>
      </div>

      {/* Circular Photo Crop Modal */}
      {cropOpen && cropImg && (
        <PhotoCropModal
          imgEl={cropImg}
          onApply={handleCropApply}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
