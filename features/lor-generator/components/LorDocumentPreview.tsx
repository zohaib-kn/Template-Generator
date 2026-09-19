"use client";

import React, { forwardRef } from "react";
import Image from "next/image";
import { LorDocument } from "../types/lor-generator";

interface LorDocumentPreviewProps {
  document: LorDocument;
}

export const LorDocumentPreview = forwardRef<HTMLDivElement, LorDocumentPreviewProps>(
  function LorDocumentPreview({ document: doc }, ref) {
    const { metadata, institution, recommender, narrative } = doc;

    // Sanitize conclusion paragraph to prevent accidental duplicate "Regards,"
    const cleanConclusion = (narrative.conclusionParagraph || "").replace(
      /\s*(Regards|Sincerely)[\s,]*$/i,
      ""
    );

    return (
      <div className="flex justify-center w-full py-6 print:py-0 print:w-auto">
        <div
          ref={ref}
          id="lor-a4-preview-page"
          data-pdf-page="true"
          className="relative flex flex-col justify-between print:m-0 print:border-none print:shadow-none"
          style={{
            width: "794px",
            minHeight: "1123px",
            height: "1123px",
            padding: "38px 52px 32px 52px",
            boxSizing: "border-box",
            backgroundColor: "#ffffff",
            color: "#000000",
            fontFamily: "'Times New Roman', Times, serif",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
          }}
        >
          {/* ── Top Header / Letterhead ───────────────────────────────── */}
          <div>
            <header className="flex flex-col items-center">
              {institution.logoUrl ? (
                <div
                  style={{
                    width: "630px",
                    height: "155px",
                    position: "relative",
                    marginBottom: "2px",
                  }}
                >
                  <Image
                    src={institution.logoUrl}
                    alt={institution.name}
                    fill
                    className="object-contain object-center"
                    priority
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex items-center gap-4 text-center">
                  {institution.crestUrl && (
                    <div style={{ width: "64px", height: "64px", position: "relative", flexShrink: 0 }}>
                      <Image
                        src={institution.crestUrl}
                        alt="Logo Crest"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <h1
                      className="text-xl font-bold tracking-tight uppercase"
                      style={{ color: "#1b2f6b" }}
                    >
                      {institution.name}
                    </h1>
                    <p
                      className="text-[10px] font-sans tracking-wide mt-0.5 max-w-[540px]"
                      style={{ color: "#475569" }}
                    >
                      {institution.affiliation}
                    </p>
                  </div>
                </div>
              )}
            </header>

            {/* ── Reference Number & Date Line (Bold Serif) ─────────────── */}
            <div
              className="flex justify-between items-center mt-2 text-[14.5px] font-bold tracking-wide"
              style={{
                color: "#000000",
                fontFamily: "'Times New Roman', Times, serif",
              }}
            >
              <span>{metadata.referenceNumber}</span>
              <span>{metadata.issueDate}</span>
            </div>

            {/* ── Document Title (Bold Serif Underlined) ────────────────── */}
            <div className="text-center my-3">
              <h2
                className="text-[18.5px] font-bold underline tracking-wide inline-block"
                style={{
                  color: "#000000",
                  fontFamily: "'Times New Roman', Times, serif",
                }}
              >
                {metadata.documentTitle}
              </h2>
            </div>

            {/* ── Letter Narrative / Body (14.5px, 1.62 line-height) ───── */}
            <div
              className="flex flex-col gap-3 text-[14.5px] leading-[1.62] text-justify"
              style={{
                color: "#000000",
                fontFamily: "'Times New Roman', Times, serif",
              }}
            >
              {narrative.introParagraph && (
                <p className="indent-0 m-0">{narrative.introParagraph}</p>
              )}
              {narrative.academicsParagraph && (
                <p className="indent-0 m-0">{narrative.academicsParagraph}</p>
              )}
              {narrative.projectParagraph && (
                <p className="indent-0 m-0">{narrative.projectParagraph}</p>
              )}
              {narrative.qualitiesParagraph && (
                <p className="indent-0 m-0">{narrative.qualitiesParagraph}</p>
              )}
              {cleanConclusion && (
                <p className="indent-0 m-0">{cleanConclusion}</p>
              )}
            </div>
          </div>

          {/* ── Bottom Section: Sign-off, Stamp, & Footer ─────────────── */}
          <div className="mt-4">
            <div
              className="text-[14.5px] mb-0.5"
              style={{
                color: "#000000",
                fontFamily: "'Times New Roman', Times, serif",
              }}
            >
              Regards,
            </div>

            <div className="flex items-center justify-between relative mt-0.5">
              {/* Left Column: Signature directly over Authority Details */}
              <div
                className="flex flex-col relative z-10"
                style={{
                  color: "#000000",
                  fontFamily: "'Times New Roman', Times, serif",
                }}
              >
                {recommender.showSignature && recommender.signatureUrl ? (
                  <div
                    style={{
                      width: "165px",
                      height: "64px",
                      position: "relative",
                      marginBottom: "-16px",
                      marginLeft: "-6px",
                      pointerEvents: "none",
                    }}
                  >
                    <Image
                      src={recommender.signatureUrl}
                      alt="Signature"
                      fill
                      className="object-contain object-left"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div style={{ height: "36px" }} />
                )}

                <div
                  className="font-bold text-[15px] leading-tight"
                  style={{ color: "#000000" }}
                >
                  {recommender.prefix ? `${recommender.prefix} ` : ""}
                  {recommender.fullName}
                </div>
                <div
                  className="font-bold text-[13.5px] leading-tight mt-0.5"
                  style={{ color: "#000000" }}
                >
                  {recommender.designation}
                </div>
                {recommender.role && (
                  <div
                    className="font-bold text-[13.5px] leading-tight"
                    style={{ color: "#000000" }}
                  >
                    {recommender.role}
                  </div>
                )}
                <div
                  className="font-bold text-[13.5px] leading-tight"
                  style={{ color: "#000000" }}
                >
                  {recommender.department}
                </div>
                {recommender.email && (
                  <div
                    className="font-bold text-[13px] leading-tight mt-0.5"
                    style={{ color: "#000000" }}
                  >
                    Email Id – {recommender.email}
                  </div>
                )}
                {recommender.phone && (
                  <div className="text-[12.5px] leading-tight">
                    Phone – {recommender.phone}
                  </div>
                )}
              </div>

              {/* Mid-Right: Official Institutional Stamp (flanking designation block) */}
              {recommender.showStamp && recommender.stampUrl && (
                <div
                  style={{
                    width: "140px",
                    height: "140px",
                    position: "relative",
                    marginRight: "90px",
                    flexShrink: 0,
                    opacity: 0.95,
                    pointerEvents: "none",
                  }}
                >
                  <Image
                    src={recommender.stampUrl}
                    alt="Official Stamp"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}
            </div>

            {/* ── Official Institutional Footer (Clean, No Top Border) ──── */}
            <footer
              className="mt-5 text-center text-[11px] leading-tight font-sans"
              style={{ color: "#1e293b" }}
            >
              <p className="font-normal" style={{ color: "#1e293b" }}>
                {institution.address}
              </p>
              <p className="mt-1" style={{ color: "#475569" }}>
                {institution.phone && `Phone : ${institution.phone}`}
                {institution.phone && institution.email && " • "}
                {institution.email && `E-mail : ${institution.email}`}
                {(institution.phone || institution.email) && institution.website && " • "}
                {institution.website && `Website : ${institution.website}`}
              </p>
            </footer>
          </div>
        </div>
      </div>
    );
  }
);
