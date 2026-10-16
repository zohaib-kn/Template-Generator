import { memo } from "react";
import type { Certification } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";

interface CertificationsSectionProps {
  entries?: Certification[];
  title?: string;
  isInteractive?: boolean;
  onUpdate?: (id: string, patch: Partial<Certification>) => void;
}

export const CertificationsSection = memo(function CertificationsSection({
  entries,
  title,
  isInteractive = false,
  onUpdate,
}: CertificationsSectionProps) {
  if (!entries || entries.length === 0) return null;

  const visible = entries.filter((e) => isInteractive || e.name || e.provider);
  if (visible.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle title={title || "CERTIFICATIONS"} />
      )}
      {visible.map((cert) => (
        <div key={cert.id} className={styles.educationEntry}>
          {isInteractive && onUpdate ? (
            <EditableText
              value={cert.name ?? ""}
              onChange={(v) => onUpdate(cert.id, { name: v })}
              isInteractive={isInteractive}
              className={styles.qualificationTitle}
              placeholder="Certification Name"
              as="h3"
            />
          ) : (
            cert.name && (
              <h3 className={styles.qualificationTitle}>{cert.name}</h3>
            )
          )}

          {(isInteractive || cert.provider || cert.completionDate) && (
            <div className={styles.institutionRow}>
              {isInteractive && onUpdate ? (
                <EditableText
                  value={cert.provider ?? ""}
                  onChange={(v) => onUpdate(cert.id, { provider: v })}
                  isInteractive={isInteractive}
                  className={styles.institutionName}
                  placeholder="Issuing Provider / Authority"
                />
              ) : (
                cert.provider && (
                  <span className={styles.institutionName}>{cert.provider}</span>
                )
              )}
              {cert.completionDate && (
                <span className={styles.datesBadge}>[ {cert.completionDate} ]</span>
              )}
            </div>
          )}

          {isInteractive && onUpdate ? (
            <EditableText
              value={cert.description ?? ""}
              onChange={(v) => onUpdate(cert.id, { description: v })}
              isInteractive={isInteractive}
              multiline
              className={styles.educationDetails}
              placeholder="Key skills learned / certification details..."
            />
          ) : (
            cert.description && (
              <div className={styles.educationDetails}>{cert.description}</div>
            )
          )}

          {(isInteractive || cert.credentialLink) && (
            <div className={styles.entryLinkRow}>
              {isInteractive && onUpdate ? (
                <EditableText
                  value={cert.credentialLink ?? ""}
                  onChange={(v) => onUpdate(cert.id, { credentialLink: v })}
                  isInteractive={isInteractive}
                  className={styles.blueLink}
                  placeholder="Credential URL"
                />
              ) : (
                cert.credentialLink && (
                  <a
                    href={cert.credentialLink}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.blueLink}
                  >
                    {cert.credentialLink}
                  </a>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </section>
  );
});
