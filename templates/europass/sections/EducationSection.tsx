import { memo } from "react";
import type { EducationEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { getOrderedEducationParts } from "@/features/document-generator/utils/educationSequence";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";
import { normalizePdfUrl } from "@/features/document-generator/utils/linkUtils";

interface EducationSectionProps {
  entries?: EducationEntry[];
  title?: string;
  isInteractive?: boolean;
  onUpdate?: (id: string, patch: Partial<EducationEntry>) => void;
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

function renderEducationDetails(
  entry: EducationEntry,
  isInteractive = false,
  onUpdate?: (id: string, patch: Partial<EducationEntry>) => void
) {
  const parts = getOrderedEducationParts(entry);
  if (parts.length === 0) return null;

  return (
    <div className={styles.educationDetails}>
      {parts.map((part, pIdx) => {
        const trimmed = part.trim();
        const websiteMatch = trimmed.match(/^Website:\s*(.+)$/i);

        if (websiteMatch) {
          const rawUrl = websiteMatch[1].trim();
          const href = normalizePdfUrl(rawUrl);

          return (
            <span key={pIdx}>
              {pIdx > 0 && <span className={styles.pipeDivider}> | </span>}
              <span>Website: </span>
              {isInteractive && onUpdate ? (
                <EditableText
                  value={rawUrl}
                  href={href}
                  onChange={(newUrl) => {
                    const newParts = [...parts];
                    newParts[pIdx] = `Website: ${newUrl.trim()}`;
                    onUpdate(entry.id, {
                      description: newParts.join(" | "),
                      website: newUrl.trim(),
                    });
                  }}
                  isInteractive={isInteractive}
                  className={styles.blueLink}
                  placeholder="https://..."
                />
              ) : (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.blueLink}
                  data-pdf-link={href}
                >
                  {rawUrl}
                </a>
              )}
            </span>
          );
        }

        return (
          <span key={pIdx}>
            {pIdx > 0 && <span className={styles.pipeDivider}> | </span>}
            {isInteractive && onUpdate ? (
              <EditableText
                value={trimmed}
                onChange={(newPart) => {
                  const newParts = [...parts];
                  newParts[pIdx] = newPart;
                  onUpdate(entry.id, { description: newParts.join(" | ") });
                }}
                isInteractive={isInteractive}
                placeholder="Detail..."
              />
            ) : (
              trimmed
            )}
          </span>
        );
      })}
    </div>
  );
}

export const EducationSection = memo(function EducationSection({
  entries,
  title,
  isInteractive = false,
  onUpdate,
}: EducationSectionProps) {
  if (!entries || entries.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle title={title || "EDUCATION AND TRAINING"} />
      )}
      {entries.map((entry) => {
        const start = formatDateDMY(entry.startDate);
        const end = formatDateDMY(entry.endDate);
        const hasDate = start || end;

        return (
          <div key={entry.id} className={styles.educationEntry}>
            {isInteractive && onUpdate ? (
              <EditableText
                value={entry.qualification ?? ""}
                onChange={(v) => onUpdate(entry.id, { qualification: v })}
                isInteractive={isInteractive}
                className={styles.qualificationTitle}
                placeholder="Qualification / Degree"
                as="h3"
              />
            ) : (
              entry.qualification && (
                <h3 className={styles.qualificationTitle}>{entry.qualification}</h3>
              )
            )}

            {(entry.institution || hasDate) && (
              <div className={styles.institutionRow}>
                {isInteractive && onUpdate ? (
                  <EditableText
                    value={entry.institution ?? ""}
                    onChange={(v) => onUpdate(entry.id, { institution: v })}
                    isInteractive={isInteractive}
                    className={styles.institutionName}
                    placeholder="Institution"
                  />
                ) : (
                  entry.institution && (
                    <span className={styles.institutionName}>
                      {entry.institution}{" "}
                    </span>
                  )
                )}
                {hasDate && (
                  <span className={styles.datesBadge}>
                    [ {start}{end ? ` – ${end}` : ""} ]
                  </span>
                )}
              </div>
            )}

            {renderEducationDetails(entry, isInteractive, onUpdate)}
          </div>
        );
      })}
    </section>
  );
});
