import { memo, useState } from "react";
import type { EducationEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { getOrderedEducationParts } from "@/features/document-generator/utils/educationSequence";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";
import { EditableDateRange } from "@/features/document-generator/components/inline/EditableDateRange";
import { normalizePdfUrl } from "@/features/document-generator/utils/linkUtils";
import { EducationInlineForm } from "../components/EuropassSectionEditors";

interface EducationSectionProps {
  entries?: EducationEntry[];
  title?: string;
  isInteractive?: boolean;
  onAdd?: (entry: Omit<EducationEntry, "id">) => void;
  onUpdate?: (id: string, patch: Partial<EducationEntry>) => void;
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

function removeWebsiteFromDescription(desc?: string): string {
  if (!desc) return "";
  return desc
    .split("|")
    .map((p) => p.trim())
    .filter((p) => p && !/^website\s*:\s*/i.test(p))
    .join(" | ");
}

function updateWebsiteInDescription(desc: string | undefined, newUrl: string): string {
  const clean = removeWebsiteFromDescription(desc);
  const trimmed = newUrl.trim();
  if (!trimmed) return clean;
  return clean ? `${clean} | Website: ${trimmed}` : `Website: ${trimmed}`;
}

function renderEducationDetails(
  entry: EducationEntry,
  isInteractive = false,
  onUpdate?: (id: string, patch: Partial<EducationEntry>) => void
) {
  const parts = getOrderedEducationParts(entry);
  const hasWebsite = parts.some((p) => /^website\s*:\s*/i.test(p.trim()));

  if (parts.length === 0 && (!isInteractive || !onUpdate)) return null;

  const handleRemoveWebsite = () => {
    if (!onUpdate) return;
    onUpdate(entry.id, {
      website: "",
      description: removeWebsiteFromDescription(entry.description),
    });
  };

  const handleAddWebsite = () => {
    if (!onUpdate) return;
    const initialUrl = "https://";
    onUpdate(entry.id, {
      website: initialUrl,
      description: updateWebsiteInDescription(entry.description, initialUrl),
    });
  };

  return (
    <div className={styles.educationDetails}>
      {parts.map((part, pIdx) => {
        const trimmed = part.trim();
        const websiteMatch = trimmed.match(/^Website:\s*(.*)$/i);

        if (websiteMatch) {
          const rawUrl = websiteMatch[1].trim();
          const href = normalizePdfUrl(rawUrl);

          if (!rawUrl && !isInteractive) {
            return null;
          }

          return (
            <span key={pIdx} className={styles.websiteItemWrapper}>
              {pIdx > 0 && <span className={styles.pipeDivider}> | </span>}
              <span>Website: </span>
              {isInteractive && onUpdate ? (
                <>
                  <EditableText
                    value={rawUrl}
                    href={href}
                    onChange={(newUrl) => {
                      const trimmedUrl = newUrl.trim();
                      if (!trimmedUrl) {
                        handleRemoveWebsite();
                        return;
                      }
                      onUpdate(entry.id, {
                        website: trimmedUrl,
                        description: updateWebsiteInDescription(entry.description, trimmedUrl),
                      });
                    }}
                    isInteractive={isInteractive}
                    className={styles.blueLink}
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRemoveWebsite();
                    }}
                    className={styles.removeWebsiteBtn}
                    title="Remove website link"
                    aria-label="Remove website link"
                    data-pdf-ignore="true"
                    data-no-print="true"
                  >
                    ×
                  </button>
                </>
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

      {isInteractive && onUpdate && !hasWebsite && (
        <span
          className={styles.addWebsiteWrapper}
          data-pdf-ignore="true"
          data-no-print="true"
        >
          {parts.length > 0 && <span className={styles.pipeDivider}> | </span>}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleAddWebsite();
            }}
            className={styles.addWebsiteBtn}
            title="Add school website link"
          >
            + Add website
          </button>
        </span>
      )}
    </div>
  );
}

export const EducationSection = memo(function EducationSection({
  entries = [],
  title,
  isInteractive = false,
  onAdd,
  onUpdate,
  onRemove,
}: EducationSectionProps) {
  const [isAdding, setIsAdding] = useState(false);

  if (!entries || entries.length === 0) return null;

  // Suppress invalid empty display blocks (phantom entries with no institution and no score)
  const validEntries = entries.filter((e) => {
    const hasInst = Boolean(e.institution && e.institution.trim());
    const hasQual = Boolean(e.qualification && e.qualification.trim());
    const hasGrade = Boolean(e.finalGrade && e.finalGrade.trim());
    const hasDesc = Boolean(e.description && e.description.trim());
    return hasInst || (hasQual && (hasGrade || hasDesc));
  });

  if (validEntries.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle
          title={title || "EDUCATION AND TRAINING"}
          isInteractive={isInteractive}
          onAddEntry={onAdd ? () => setIsAdding(true) : undefined}
          addLabel="Add Education & Training entry"
        />
      )}

      {/* Inline entry editor for adding new item */}
      {isInteractive && isAdding && onAdd && (
        <EducationInlineForm
          onSave={(data) => {
            onAdd(data);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {validEntries.map((entry) => {
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

            {(isInteractive || entry.institution || hasDate) && (
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
                {(hasDate || isInteractive) && (
                  <EditableDateRange
                    startDate={entry.startDate}
                    endDate={entry.endDate}
                    onUpdate={(patch) => onUpdate?.(entry.id, patch)}
                    isInteractive={isInteractive}
                    className={styles.datesBadge}
                  />
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
