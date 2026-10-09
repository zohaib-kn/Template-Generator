import { memo } from "react";
import type { EnglishCertificate } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface EnglishCertificateSectionProps {
  cert?: EnglishCertificate;
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

export const EnglishCertificateSection = memo(function EnglishCertificateSection({
  cert,
}: EnglishCertificateSectionProps) {
  if (
    !cert ||
    (!cert.examName &&
      !cert.score &&
      !cert.issuingBody &&
      !cert.listening &&
      !cert.reading &&
      !cert.writing &&
      !cert.speaking)
  ) {
    return null;
  }

  const hasSubscores = Boolean(
    cert.listening || cert.reading || cert.writing || cert.speaking
  );

  // Render bullets from issuingBody or custom text if lines exist
  const bullets = (cert.issuingBody ?? "")
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title="ENGLISH LANGUAGE CERTIFICATE" />

      {cert.examName && (
        <div className={styles.certificateTitle}>{cert.examName}</div>
      )}

      {(cert.score || cert.cefrLevel) && (
        <div className={styles.certificateScore}>
          {cert.score && (
            <span>
              {cert.score.includes(":") || cert.score.toLowerCase().includes("overall") ? (
                cert.score
              ) : (
                <>
                  <strong>Overall Band:</strong> {cert.score}
                </>
              )}
            </span>
          )}
          {cert.cefrLevel && (
            <span className={styles.cefrBadge}>
              {cert.score && <span className={styles.metaDivider}>·</span>}
              <strong>CEFR Level:</strong> {cert.cefrLevel}
            </span>
          )}
        </div>
      )}

      {hasSubscores && (
        <div className={styles.certificateSubscores}>
          {cert.listening && (
            <div className={styles.subscoreItem}>
              <span className={styles.subscoreLabel}>Listening:</span>
              <span className={styles.subscoreValue}>{cert.listening}</span>
            </div>
          )}
          {cert.reading && (
            <div className={styles.subscoreItem}>
              <span className={styles.subscoreLabel}>Reading:</span>
              <span className={styles.subscoreValue}>{cert.reading}</span>
            </div>
          )}
          {cert.writing && (
            <div className={styles.subscoreItem}>
              <span className={styles.subscoreLabel}>Writing:</span>
              <span className={styles.subscoreValue}>{cert.writing}</span>
            </div>
          )}
          {cert.speaking && (
            <div className={styles.subscoreItem}>
              <span className={styles.subscoreLabel}>Speaking:</span>
              <span className={styles.subscoreValue}>{cert.speaking}</span>
            </div>
          )}
        </div>
      )}

      {(cert.dateTaken || cert.trfNumber) && (
        <div className={styles.certificateMeta}>
          {cert.dateTaken && (
            <span>Date taken: {formatDateDMY(cert.dateTaken)}</span>
          )}
          {cert.dateTaken && cert.trfNumber && (
            <span className={styles.metaDivider}>·</span>
          )}
          {cert.trfNumber && (
            <span>TRF No: {cert.trfNumber}</span>
          )}
        </div>
      )}

      {bullets.length > 0 && (
        <ul className={styles.certificateBullets}>
          {bullets.map((bullet, idx) => (
            <li key={idx}>
              {bullet.startsWith("•") ? bullet : `• ${bullet}`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});
