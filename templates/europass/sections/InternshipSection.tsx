import { memo } from "react";
import type { InternshipEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { parseDescriptionToBullets } from "../utils/descriptionParser";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";

interface InternshipSectionProps {
  entries?: InternshipEntry[];
  title?: string;
  isInteractive?: boolean;
  onUpdate?: (id: string, patch: Partial<InternshipEntry>) => void;
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

export const InternshipSection = memo(function InternshipSection({
  entries,
  title,
  isInteractive = false,
  onUpdate,
}: InternshipSectionProps) {
  if (!entries || entries.length === 0) return null;

  const visible = entries.filter(
    (e) => isInteractive || e.role || e.company || e.description || e.location
  );
  if (visible.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle title={title || "WORK EXPERIENCE / INTERNSHIPS"} />
      )}
      {visible.map((item) => {
        const start = formatDateDMY(item.startDate);
        const end = formatDateDMY(item.endDate);
        const hasDate = start || end;

        const bullets = parseDescriptionToBullets(item.description || "");

        return (
          <div key={item.id} className={styles.educationEntry}>
            {!item.hideHeader && (
              isInteractive && onUpdate ? (
                <EditableText
                  value={item.role ?? ""}
                  onChange={(v) => onUpdate(item.id, { role: v })}
                  isInteractive={isInteractive}
                  className={styles.qualificationTitle}
                  placeholder="Role / Job Title"
                  as="h3"
                />
              ) : (
                item.role && <h3 className={styles.qualificationTitle}>{item.role}</h3>
              )
            )}

            {!item.hideHeader && (isInteractive || item.company || item.location || hasDate) && (
              <div className={styles.institutionRow}>
                {isInteractive && onUpdate ? (
                  <>
                    <EditableText
                      value={item.company ?? ""}
                      onChange={(v) => onUpdate(item.id, { company: v })}
                      isInteractive={isInteractive}
                      className={styles.institutionName}
                      placeholder="Company / Organization"
                    />
                    <span className={styles.pipeDivider}> | </span>
                    <EditableText
                      value={item.location ?? ""}
                      onChange={(v) => onUpdate(item.id, { location: v })}
                      isInteractive={isInteractive}
                      className={styles.identityValue}
                      placeholder="Location"
                    />
                  </>
                ) : (
                  <>
                    {item.company && (
                      <span className={styles.institutionName}>{item.company}</span>
                    )}
                    {item.location && (
                      <>
                        {item.company && <span className={styles.pipeDivider}> | </span>}
                        <span className={styles.identityValue}>{item.location}</span>
                      </>
                    )}
                  </>
                )}
                {hasDate && (
                  <span className={styles.datesBadge}>
                    [ {start}{end ? ` – ${end}` : ""} ]
                  </span>
                )}
              </div>
            )}

            {isInteractive && onUpdate ? (
              bullets.length === 0 ? (
                <div className={styles.bulletItem}>
                  <span className={styles.bulletDot} aria-hidden="true">•</span>
                  <EditableText
                    value=""
                    onChange={(newVal) => onUpdate(item.id, { description: newVal })}
                    isInteractive={isInteractive}
                    multiline
                    className={styles.bulletText}
                    placeholder="Add responsibilities / key contributions..."
                  />
                </div>
              ) : (
                <div className={styles.bulletList}>
                  {bullets.map((point, i) => (
                    <div key={i} className={styles.bulletItem}>
                      <span className={styles.bulletDot} aria-hidden="true">•</span>
                      <EditableText
                        value={point}
                        onChange={(newPoint) => {
                          const newBullets = [...bullets];
                          newBullets[i] = newPoint;
                          onUpdate(item.id, {
                            description: newBullets.map((b) => `• ${b}`).join("\n"),
                          });
                        }}
                        isInteractive={isInteractive}
                        multiline
                        className={styles.bulletText}
                        placeholder="Bullet contribution..."
                      />
                    </div>
                  ))}
                </div>
              )
            ) : (
              item.description && (() => {
                return bullets.length === 1 && !item.hideHeader ? (
                  <div className={styles.educationDetails}>{bullets[0]}</div>
                ) : (
                  <div className={styles.bulletList}>
                    {bullets.map((point, i) => (
                      <div key={i} className={styles.bulletItem}>
                        <span className={styles.bulletDot} aria-hidden="true">•</span>
                        <span className={styles.bulletText}>{point}</span>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        );
      })}
    </section>
  );
});
