import { memo } from "react";
import type { EnglishCertificate } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface EnglishCertificateSectionProps {
  cert?: EnglishCertificate;
  title?: string;
}

function formatDateDMY(iso?: string): string {
  if (!iso) return "";
  if (iso.includes("/")) return iso;
  const parts = iso.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return iso;
}

function cleanValue(val: string | undefined, prefixPattern: RegExp): string {
  if (!val) return "";
  const cleaned = val.replace(prefixPattern, "").trim();
  return cleaned || val.trim();
}

export const EnglishCertificateSection = memo(function EnglishCertificateSection({
  cert,
  title,
}: EnglishCertificateSectionProps) {
  if (
    !cert ||
    (!cert.examName &&
      !cert.score &&
      !cert.issuingBody &&
      !cert.listening &&
      !cert.reading &&
      !cert.writing &&
      !cert.speaking &&
      !cert.trfNumber)
  ) {
    return null;
  }

  const showTitle = title === undefined ? true : Boolean(title);
  const examUpper = (cert.examName || "IELTS").toUpperCase();
  const isIelts = examUpper.includes("IELTS");
  
  // If title was omitted or passed as generic "ENGLISH LANGUAGE CERTIFICATE", use "IELTS" (or exam name)
  const defaultTitles = ["ENGLISH LANGUAGE CERTIFICATE", "ENGLISH PROFICIENCY TEST", "IELTS"];
  const isDefaultTitle = !title || defaultTitles.includes(title.trim().toUpperCase());
  const sectionHeading = !isDefaultTitle ? title : (isIelts ? "IELTS" : examUpper);
  const formattedDate = formatDateDMY(cert.dateTaken);

  // Derive descriptive subtitle
  const subtitle = isIelts
    ? "International English Language Testing System"
    : cert.examName && cert.examName !== sectionHeading
    ? cert.examName
    : null;

  // Custom additional bullets from issuingBody
  const extraBullets = (cert.issuingBody ?? "")
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && <EuropassSectionTitle title={sectionHeading} />}

      {/* Date of Exam Badge (Matching Europass standard [ DD/MM/YYYY ]) */}
      {formattedDate && (
        <div className={styles.datesBadge} style={{ marginBottom: "1.5mm" }}>
          [ {formattedDate} ]
        </div>
      )}

      {/* Test Full Title / Subtitle */}
      {subtitle && (
        <h3 className={styles.qualificationTitle} style={{ marginBottom: "1.8mm" }}>
          {subtitle}
        </h3>
      )}

      {/* Perfect Vertical Column of Scores and Test Details */}
      <div className={styles.bulletList}>
        {cert.score && (
          <div className={styles.bulletItem}>
            <span className={styles.bulletDot} aria-hidden="true">•</span>
            <span className={styles.bulletText}>
              Overall Band Score - {cleanValue(cert.score, /^(?:Overall\s*(?:Band)?\s*(?:Score)?|Band)\s*[-:]?\s*/i)}
            </span>
          </div>
        )}

        {cert.listening && (
          <div className={styles.bulletItem}>
            <span className={styles.bulletDot} aria-hidden="true">•</span>
            <span className={styles.bulletText}>
              Listening - {cleanValue(cert.listening, /^Listening\s*[-:]?\s*/i)}
            </span>
          </div>
        )}

        {cert.reading && (
          <div className={styles.bulletItem}>
            <span className={styles.bulletDot} aria-hidden="true">•</span>
            <span className={styles.bulletText}>
              Reading - {cleanValue(cert.reading, /^Reading\s*[-:]?\s*/i)}
            </span>
          </div>
        )}

        {cert.writing && (
          <div className={styles.bulletItem}>
            <span className={styles.bulletDot} aria-hidden="true">•</span>
            <span className={styles.bulletText}>
              Writing - {cleanValue(cert.writing, /^Writing\s*[-:]?\s*/i)}
            </span>
          </div>
        )}

        {cert.speaking && (
          <div className={styles.bulletItem}>
            <span className={styles.bulletDot} aria-hidden="true">•</span>
            <span className={styles.bulletText}>
              Speaking - {cleanValue(cert.speaking, /^Speaking\s*[-:]?\s*/i)}
            </span>
          </div>
        )}

        {cert.cefrLevel && (
          <div className={styles.bulletItem}>
            <span className={styles.bulletDot} aria-hidden="true">•</span>
            <span className={styles.bulletText}>
              CEFR Level - {cleanValue(cert.cefrLevel, /^CEFR\s*(?:Level)?\s*[-:]?\s*/i)}
            </span>
          </div>
        )}

        {cert.trfNumber && (
          <div className={styles.bulletItem}>
            <span className={styles.bulletDot} aria-hidden="true">•</span>
            <span className={styles.bulletText}>
              Test Report Form Number - {cleanValue(cert.trfNumber, /^(?:Test\s*Report\s*(?:Form)?\s*(?:Number)?|TRF\s*(?:No\.?|Number)?)\s*[-:]?\s*/i)}
            </span>
          </div>
        )}

        {extraBullets.map((bullet, idx) => (
          <div key={idx} className={styles.bulletItem}>
            <span className={styles.bulletDot} aria-hidden="true">•</span>
            <span className={styles.bulletText}>
              {bullet.replace(/^[•*\-\s]+/, "")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
});
