import { memo } from "react";
import type { Certification } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface CertificationsSectionProps {
  entries?: Certification[];
  title?: string;
}

export const CertificationsSection = memo(function CertificationsSection({
  entries,
  title,
}: CertificationsSectionProps) {
  if (!entries || entries.length === 0) return null;

  const visible = entries.filter((e) => e.name || e.provider);
  if (visible.length === 0) return null;

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title={title ?? "CERTIFICATIONS"} />
      {visible.map((cert) => (
        <div key={cert.id} className={styles.educationEntry}>
          {cert.name && (
            <h3 className={styles.qualificationTitle}>{cert.name}</h3>
          )}

          {(cert.provider || cert.completionDate) && (
            <div className={styles.institutionRow}>
              {cert.provider && (
                <span className={styles.institutionName}>{cert.provider}</span>
              )}
              {cert.completionDate && (
                <span className={styles.datesBadge}>[{cert.completionDate}]</span>
              )}
            </div>
          )}

          {cert.description && (
            <div className={styles.educationDetails}>{cert.description}</div>
          )}

          {cert.credentialLink && (
            <div className={styles.educationDetails}>
              <a
                href={cert.credentialLink}
                target="_blank"
                rel="noreferrer"
                className={styles.blueLink}
              >
                {cert.credentialLink}
              </a>
            </div>
          )}
        </div>
      ))}
    </section>
  );
});
