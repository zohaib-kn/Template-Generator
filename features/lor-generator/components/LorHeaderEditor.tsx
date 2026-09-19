"use client";

import React from "react";
import { useLorState } from "../hooks/useLorState";

export function LorHeaderEditor() {
  const { document, updateMetadata, updateInstitution } = useLorState();
  const { metadata, institution } = document;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          updateInstitution({ logoUrl: uploadEvent.target.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const generateNewRef = () => {
    const year = new Date().getFullYear();
    const nextYear = (year + 1).toString().slice(-2);
    const rand = Math.floor(100 + Math.random() * 900);
    updateMetadata({ referenceNumber: `PIET/ADMIN/${year}-${nextYear}/LOR/${rand}` });
  };

  return (
    <div className="flex flex-col gap-4 text-xs text-slate-700">
      {/* ── Document Metadata ────────────────────────────────────────── */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-2.5 flex items-center justify-between">
          <span>Document Reference &amp; Date</span>
          <button
            type="button"
            onClick={generateNewRef}
            className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
          >
            ↻ Generate Fresh Ref
          </button>
        </h4>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              value={metadata.referenceNumber}
              onChange={(e) => updateMetadata({ referenceNumber: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Issue Date
            </label>
            <input
              type="text"
              value={metadata.issueDate}
              onChange={(e) => updateMetadata({ issueDate: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-2.5">
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Document Title
          </label>
          <input
            type="text"
            value={metadata.documentTitle}
            onChange={(e) => updateMetadata({ documentTitle: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ── Institution Letterhead ───────────────────────────────────── */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-2.5">
          Institution Letterhead &amp; Branding
        </h4>

        <div className="flex flex-col gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Institution Name
            </label>
            <input
              type="text"
              value={institution.name}
              onChange={(e) => updateInstitution({ name: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Affiliation / Accreditation Subtitle
            </label>
            <input
              type="text"
              value={institution.affiliation}
              onChange={(e) => updateInstitution({ affiliation: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Letterhead Banner / Logo Image
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {institution.logoUrl && (
                <button
                  type="button"
                  onClick={() => updateInstitution({ logoUrl: undefined })}
                  className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Official Footer Contacts ─────────────────────────────────── */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <h4 className="font-semibold text-slate-900 mb-2.5">
          Footer Institutional Contacts
        </h4>

        <div className="flex flex-col gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Campus Address
            </label>
            <input
              type="text"
              value={institution.address}
              onChange={(e) => updateInstitution({ address: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={institution.phone}
                onChange={(e) => updateInstitution({ phone: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Official Email
              </label>
              <input
                type="text"
                value={institution.email}
                onChange={(e) => updateInstitution({ email: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Website
              </label>
              <input
                type="text"
                value={institution.website}
                onChange={(e) => updateInstitution({ website: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
