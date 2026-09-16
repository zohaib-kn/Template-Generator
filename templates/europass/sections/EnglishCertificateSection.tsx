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
  if (!cert || (!cert.examName && !cert.score && !cert.issuingBody)) return null;

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

      {cert.score && (
        <div className={styles.certificateScore}>
          {cert.score.includes(":") || cert.score.toLowerCase().includes("overall") ? (
            cert.score
          ) : (
            <>
              <strong>Overall Band:</strong> {cert.score}
            </>
          )}
        </div>
      )}

      {cert.dateTaken && (
        <div className={styles.certificateScore} style={{ color: "#757575", fontSize: "9pt" }}>
          Date taken: {formatDateDMY(cert.dateTaken)}
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
