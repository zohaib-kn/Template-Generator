import { memo } from "react";
import type { InternshipEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { parseDescriptionToBullets, stripLeadingMarkers } from "../utils/descriptionParser";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";
import { EditableDateRange } from "@/features/document-generator/components/inline/EditableDateRange";

interface InternshipSectionProps {
  entries?: InternshipEntry[];
  title?: string;
  isInteractive?: boolean;
  onUpdate?: (id: string, patch: Partial<InternshipEntry>) => void;
  onRemove?: (id: string) => void;
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
  onRemove,
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
                <div className="flex items-center justify-between group">
                  <EditableText
                    value={item.role ?? ""}
                    onChange={(v) => onUpdate(item.id, { role: v })}
                    isInteractive={isInteractive}
                    className={styles.qualificationTitle}
                    placeholder="Role / Job Title"
                    as="h3"
                  />
                  {onRemove && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-600 p-0.5 rounded text-xs transition cursor-pointer leading-none shrink-0 ml-2"
                      title="Remove this work experience entry"
                    >
                      ✕
                    </button>
                  )}
                </div>
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
                    <span
                      className={styles.pipeDivider}
                      data-html2canvas-ignore={!item.location?.trim() || !item.company?.trim() ? "true" : undefined}
                      data-pdf-ignore={!item.location?.trim() || !item.company?.trim() ? "true" : undefined}
                    >
                      {" | "}
                    </span>
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
                {(hasDate || isInteractive) && (
                  <EditableDateRange
                    startDate={item.startDate}
                    endDate={item.endDate}
                    onUpdate={(patch) => onUpdate?.(item.id, patch)}
                    isInteractive={isInteractive}
                    className={styles.datesBadge}
                  />
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
                  {bullets.map((point, i) => {
                    const cleanPoint = stripLeadingMarkers(point);
                    return (
                      <div key={i} className={styles.bulletItem}>
                        <span className={styles.bulletDot} aria-hidden="true">•</span>
                        <EditableText
                          value={cleanPoint}
                          onChange={(newPoint) => {
                            const cleaned = stripLeadingMarkers(newPoint);
                            const newBullets = [...bullets.map(stripLeadingMarkers)];
                            newBullets[i] = cleaned;
                            const filtered = newBullets.filter(Boolean);
                            onUpdate(item.id, {
                              description: filtered.length > 0
                                ? filtered.map((b) => `• ${b}`).join("\n")
                                : "",
                            });
                          }}
                          isInteractive={isInteractive}
                          multiline
                          className={styles.bulletText}
                          placeholder="Bullet contribution..."
                        />
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              item.description && (() => {
                return (
                  <div className={styles.bulletList}>
                    {bullets.map((point, i) => {
                      const cleanPoint = stripLeadingMarkers(point);
                      if (!cleanPoint) return null;
                      return (
                        <div key={i} className={styles.bulletItem}>
                          <span className={styles.bulletDot} aria-hidden="true">•</span>
                          <span className={styles.bulletText}>{cleanPoint}</span>
                        </div>
                      );
                    })}
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
