"use client";

import React from "react";
import Image from "next/image";
import { useLorState } from "../hooks/useLorState";

export function LorRecommenderForm() {
  const { document, updateRecommender } = useLorState();
  const { recommender } = document;

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          updateRecommender({
            signatureUrl: ev.target.result as string,
            showSignature: true,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          updateRecommender({
            stampUrl: ev.target.result as string,
            showStamp: true,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-xs text-slate-700">
      {/* ── Recommender Profile ──────────────────────────────────────── */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-2.5">
          Recommender Authority Details
        </h4>

        <div className="grid grid-cols-4 gap-2 mb-2.5">
          <div className="col-span-1">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Prefix
            </label>
            <input
              type="text"
              value={recommender.prefix}
              onChange={(e) => updateRecommender({ prefix: e.target.value })}
              placeholder="Dr. / Prof."
              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={recommender.fullName}
              onChange={(e) => updateRecommender({ fullName: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Academic Designation
            </label>
            <input
              type="text"
              value={recommender.designation}
              onChange={(e) => updateRecommender({ designation: e.target.value })}
              placeholder="e.g. Professor"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Department Role
            </label>
            <input
              type="text"
              value={recommender.role}
              onChange={(e) => updateRecommender({ role: e.target.value })}
              placeholder="e.g. Head Of Department"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mb-2.5">
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Department / Division
          </label>
          <input
            type="text"
            value={recommender.department}
            onChange={(e) => updateRecommender({ department: e.target.value })}
            placeholder="e.g. Computer Science & Engineering"
            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Official Email
            </label>
            <input
              type="text"
              value={recommender.email}
              onChange={(e) => updateRecommender({ email: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Phone (Optional)
            </label>
            <input
              type="text"
              value={recommender.phone || ""}
              onChange={(e) => updateRecommender({ phone: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* ── Signature & Stamp Graphics ───────────────────────────────── */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-2.5">
          Official Signature &amp; College Stamp
        </h4>

        {/* Digital Signature */}
        <div className="p-2.5 bg-white rounded border border-slate-200 mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="font-medium text-slate-800 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recommender.showSignature}
                onChange={(e) => updateRecommender({ showSignature: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Display Digital Signature</span>
            </label>

            {recommender.signatureUrl && (
              <button
                type="button"
                onClick={() => updateRecommender({ signatureUrl: undefined })}
                className="text-[11px] text-red-500 hover:text-red-700"
              >
                Clear
              </button>
            )}
          </div>

          {recommender.signatureUrl && (
            <div className="relative w-36 h-12 bg-slate-50 border border-dashed border-slate-300 rounded p-1 mb-2">
              <Image
                src={recommender.signatureUrl}
                alt="Signature preview"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleSignatureUpload}
            className="text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>

        {/* Institutional Stamp / Seal */}
        <div className="p-2.5 bg-white rounded border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <label className="font-medium text-slate-800 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recommender.showStamp}
                onChange={(e) => updateRecommender({ showStamp: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Display Institutional Seal / Stamp</span>
            </label>

            {recommender.stampUrl && (
              <button
                type="button"
                onClick={() => updateRecommender({ stampUrl: undefined })}
                className="text-[11px] text-red-500 hover:text-red-700"
              >
                Clear
              </button>
            )}
          </div>

          {recommender.stampUrl && (
            <div className="relative w-20 h-20 bg-slate-50 border border-dashed border-slate-300 rounded p-1 mb-2">
              <Image
                src={recommender.stampUrl}
                alt="Stamp preview"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleStampUpload}
            className="text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
