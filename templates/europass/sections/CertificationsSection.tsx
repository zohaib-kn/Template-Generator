import { memo } from "react";
import type { Certification } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";
import { normalizePdfUrl } from "@/features/document-generator/utils/linkUtils";

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
      <div className={styles.certList}>
        {visible.map((cert) => (
          <div key={cert.id} className={styles.certItem}>
            <div className={styles.certTitleRow}>
              <span className={styles.hobbiesBulletDot}>•</span>
              {isInteractive && onUpdate ? (
                <EditableText
                  value={cert.name ?? ""}
                  onChange={(v) => onUpdate(cert.id, { name: v })}
                  isInteractive={isInteractive}
                  className={styles.certTitleText}
                  placeholder="Certification Name"
                />
              ) : (
                <span className={styles.certTitleText}>{cert.name}</span>
              )}
              {Boolean(cert.completionDate && cert.completionDate.trim()) && (
                <span
                  className={styles.datesBadge}
                  data-html2canvas-ignore={!cert.completionDate?.trim() ? "true" : undefined}
                  data-pdf-ignore={!cert.completionDate?.trim() ? "true" : undefined}
                >
                  [{" "}
                  {isInteractive && onUpdate ? (
                    <EditableText
                      value={cert.completionDate ?? ""}
                      onChange={(v) => onUpdate(cert.id, { completionDate: v })}
                      isInteractive={isInteractive}
                      placeholder="Date"
                    />
                  ) : (
                    cert.completionDate
                  )}{" "}
                  ]
                </span>
              )}
            </div>

            {Boolean(
              cert.provider &&
              cert.provider.trim() &&
              cert.provider.toLowerCase() !== "online course provider"
            ) && (
              <div className={styles.certProviderText}>
                {isInteractive && onUpdate ? (
                  <EditableText
                    value={cert.provider ?? ""}
                    onChange={(v) => onUpdate(cert.id, { provider: v })}
                    isInteractive={isInteractive}
                    placeholder="Issuing Provider (e.g. Coursera)"
                  />
                ) : (
                  <span>{cert.provider}</span>
                )}
              </div>
            )}

            {cert.description && (
              <div className={styles.educationDetails} style={{ paddingLeft: "3.5mm" }}>
                {cert.description}
              </div>
            )}

            {cert.credentialLink && (
              <div className={styles.entryLinkRow} style={{ paddingLeft: "3.5mm" }}>
                <a
                  href={normalizePdfUrl(cert.credentialLink)}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.blueLink}
                  data-pdf-link={normalizePdfUrl(cert.credentialLink)}
                >
                  {cert.credentialLink}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
});
