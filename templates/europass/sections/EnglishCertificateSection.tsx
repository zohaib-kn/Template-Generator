import { memo } from "react";
import type { EnglishCertificate } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";

interface EnglishCertificateSectionProps {
  cert?: EnglishCertificate;
  title?: string;
  isInteractive?: boolean;
  onUpdate?: (patch: Partial<EnglishCertificate>) => void;
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
  isInteractive = false,
  onUpdate,
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
  
  const defaultTitles = ["ENGLISH LANGUAGE CERTIFICATE", "ENGLISH PROFICIENCY TEST", "IELTS"];
  const isDefaultTitle = !title || defaultTitles.includes(title.trim().toUpperCase());
  const sectionHeading = !isDefaultTitle ? title : (isIelts ? "IELTS" : examUpper);
  const formattedDate = formatDateDMY(cert.dateTaken);

  const subtitle = isIelts
    ? "International English Language Testing System"
    : cert.examName && cert.examName !== sectionHeading
    ? cert.examName
    : null;

  const formTitle = isIelts ? "Test Report Form" : null;

  const extraBullets = (cert.issuingBody ?? "")
    .split("\n")
    .map((b) => b.trim())
    .filter((b) => Boolean(b) && !b.toLowerCase().includes("test report form"));

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && <EuropassSectionTitle title={sectionHeading} />}

      {subtitle && (
        <div className={styles.certificateSubtitle}>
          {subtitle}
        </div>
      )}

      {formTitle && (
        <div className={styles.certificateFormName}>
          {formTitle}
        </div>
      )}

      <div className={styles.bulletList}>
        {(isInteractive || cert.listening) && (
          <div className={styles.bulletItem}>
            <span className={styles.bulletDot} aria-hidden="true">•</span>
            <span className={styles.bulletText}>
              Listening -{" "}
              {isInteractive && onUpdate ? (
                <EditableText
                  value={cleanValue(cert.listening, /^Listening\s*[-:]?\s*/i)}
                  onChange={(v) => onUpdate({ listening: v })}
                  isInteractive={isInteractive}
                  placeholder="8.5"
                />
              ) : (
                cleanValue(cert.listening, /^Listening\s*[-:]?\s*/i)
              )}
            </span>
          </div>
        )}

        {(isInteractive || cert.reading) && (
          <div className={styles.bulletItem}>
            <span className={styles.bulletDot} aria-hidden="true">•</span>
            <span className={styles.bulletText}>
              Reading -{" "}
              {isInteractive && onUpdate ? (
                <EditableText
                  value={cleanValue(cert.reading, /^Reading\s*[-:]?\s*/i)}
                  onChange={(v) => onUpdate({ reading: v })}
                  isInteractive={isInteractive}
                  placeholder="6.5"
                />
              ) : (
                cleanValue(cert.reading, /^Reading\s*[-:]?\s*/i)
              )}
            </span>
          </div>
        )}

        {(isInteractive || cert.writing) && (
          <div className={styles.bulletItem}>
            <span className={styles.bulletDot} aria-hidden="true">•</span>
            <span className={styles.bulletText}>
              Writing -{" "}
              {isInteractive && onUpdate ? (
                <EditableText
                  value={cleanValue(cert.writing, /^Writing\s*[-:]?\s*/i)}
                  onChange={(v) => onUpdate({ writing: v })}
                  isInteractive={isInteractive}
                  placeholder="7.5"
                />
              ) : (
                cleanValue(cert.writing, /^Writing\s*[-:]?\s*/i)
              )}
            </span>
          </div>
        )}

        {(isInteractive || cert.speaking) && (
          <div className={styles.bulletItem}>
            <span className={styles.bulletDot} aria-hidden="true">•</span>
            <span className={styles.bulletText}>
              Speaking -{" "}
              {isInteractive && onUpdate ? (
                <EditableText
                  value={cleanValue(cert.speaking, /^Speaking\s*[-:]?\s*/i)}
                  onChange={(v) => onUpdate({ speaking: v })}
                  isInteractive={isInteractive}
                  placeholder="7.0"
                />
              ) : (
                cleanValue(cert.speaking, /^Speaking\s*[-:]?\s*/i)
              )}
            </span>
          </div>
        )}

        {(isInteractive || cert.score) && (
          <div className={styles.bulletItem}>
            <span className={styles.bulletDot} aria-hidden="true">•</span>
            <span className={styles.bulletText}>
              Overall Band Score -{" "}
              {isInteractive && onUpdate ? (
                <EditableText
                  value={cleanValue(cert.score, /^(?:Overall\s*(?:Band)?\s*(?:Score)?|Band)\s*[-:]?\s*/i)}
                  onChange={(v) => onUpdate({ score: v })}
                  isInteractive={isInteractive}
                  placeholder="7.5"
                />
              ) : (
                cleanValue(cert.score, /^(?:Overall\s*(?:Band)?\s*(?:Score)?|Band)\s*[-:]?\s*/i)
              )}
            </span>
          </div>
        )}

        {formattedDate && (
          <div className={styles.bulletItem}>
            <span className={styles.bulletDot} aria-hidden="true">•</span>
            <span className={styles.bulletText}>
              Issue Date - {formattedDate}
            </span>
          </div>
        )}

        {(isInteractive || cert.trfNumber) && (
          <div className={styles.bulletItem}>
            <span className={styles.bulletDot} aria-hidden="true">•</span>
            <span className={styles.bulletText}>
              Test Report Form Number -{" "}
              {isInteractive && onUpdate ? (
                <EditableText
                  value={cleanValue(cert.trfNumber, /^(?:Test\s*Report\s*(?:Form)?\s*(?:Number)?|TRF\s*(?:No\.?|Number)?)\s*[-:]?\s*/i)}
                  onChange={(v) => onUpdate({ trfNumber: v })}
                  isInteractive={isInteractive}
                  placeholder="TRF Number"
                />
              ) : (
                cleanValue(cert.trfNumber, /^(?:Test\s*Report\s*(?:Form)?\s*(?:Number)?|TRF\s*(?:No\.?|Number)?)\s*[-:]?\s*/i)
              )}
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
