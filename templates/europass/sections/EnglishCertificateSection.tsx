import type { EnglishCertificate } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface EnglishCertificateSectionProps {
  cert?: EnglishCertificate;
}

export function EnglishCertificateSection({
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
          {cert.score.includes(":") ? (
            cert.score
          ) : (
            <>
              <strong>Overall Band:</strong> {cert.score}
            </>
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
}
