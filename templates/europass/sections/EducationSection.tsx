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
  onDeleteSection?: () => void;
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

const ADDRESS_PART_PATTERN = /^(?:address|city|location)\s*:\s*/i;
const WEBSITE_PART_PATTERN = /^(?:website\s*:|https?:\/\/|www\.)/i;
const GRADE_PART_PATTERN = /^(?:final\s*grade|score)\s*:\s*/i;

function removePartFromDescription(desc: string | undefined, pattern: RegExp): string {
  if (!desc) return "";
  return desc
    .split("|")
    .map((p) => p.trim())
    .filter((p) => p && !pattern.test(p))
    .join(" | ");
}

function updatePartInDescription(
  desc: string | undefined,
  pattern: RegExp,
  label: string,
  newValue: string,
  prepend = false
): string {
  const clean = removePartFromDescription(desc, pattern);
  const trimmed = newValue.trim();
  if (!trimmed) return clean;
  const formatted = `${label}: ${trimmed}`;
  if (!clean) return formatted;
  return prepend ? `${formatted} | ${clean}` : `${clean} | ${formatted}`;
}

interface EducationDetailsLineProps {
  entry: EducationEntry;
  isInteractive?: boolean;
  onUpdate?: (id: string, patch: Partial<EducationEntry>) => void;
}

function EducationDetailsLine({
  entry,
  isInteractive = false,
  onUpdate,
}: EducationDetailsLineProps) {
  const [editingField, setEditingField] = useState<"website" | "finalGrade" | null>(null);

  const orderedParts = getOrderedEducationParts(entry);
  const hasAddress = orderedParts.some((p) => /^address\s*:\s*/i.test(p.trim()));
  const hasWebsite = orderedParts.some((p) => /^website\s*:\s*/i.test(p.trim()));
  const hasFinalGrade = orderedParts.some((p) => /^final\s*grade\s*:\s*/i.test(p.trim()));

  // Keep the Address slot always present in interactive mode, and keep active optional fields mounted while cleared
  const parts = [...orderedParts];
  if (isInteractive && onUpdate && !hasAddress) {
    parts.unshift("Address: ");
  }
  if (editingField === "website" && !hasWebsite) {
    const addrIdx = parts.findIndex((p) => /^address\s*:\s*/i.test(p.trim()));
    parts.splice(addrIdx >= 0 ? addrIdx + 1 : 0, 0, "Website: ");
  } else if (editingField === "finalGrade" && !hasFinalGrade) {
    parts.push("Final grade: ");
  }

  if (parts.length === 0 && (!isInteractive || !onUpdate)) return null;

  const handleRemoveWebsite = () => {
    if (!onUpdate) return;
    setEditingField((prev) => (prev === "website" ? null : prev));
    onUpdate(entry.id, {
      website: "",
      description: removePartFromDescription(entry.description, WEBSITE_PART_PATTERN),
    });
  };

  const handleAddWebsite = () => {
    if (!onUpdate) return;
    const initialUrl = "https://";
    onUpdate(entry.id, {
      website: initialUrl,
      description: updatePartInDescription(entry.description, WEBSITE_PART_PATTERN, "Website", initialUrl),
    });
  };

  return (
    <div className={styles.educationDetails}>
      {parts.map((part, pIdx) => {
        const trimmed = part.trim();
        const addressMatch = trimmed.match(/^Address:\s*(.*)$/i);
        const websiteMatch = trimmed.match(/^Website:\s*(.*)$/i);
        const gradeMatch = trimmed.match(/^Final\s*grade:\s*(.*)$/i);

        if (addressMatch) {
          const rawAddress = addressMatch[1].trim();
          if (!rawAddress && (!isInteractive || !onUpdate)) {
            return null;
          }

          return (
            <span key="address">
              {pIdx > 0 && <span className={styles.pipeDivider}> | </span>}
              <span>Address: </span>
              {isInteractive && onUpdate ? (
                <EditableText
                  value={rawAddress}
                  multiline
                  submitOnEnter
                  onChange={(newVal) => {
                    const cleanAddress = newVal
                      .replace(/^(?:address|city|location)\s*:\s*/i, "")
                      .replace(/[\r\n]+/g, ", ")
                      .replace(/\|/g, ",")
                      .trim();
                    onUpdate(entry.id, {
                      address: cleanAddress,
                      description: updatePartInDescription(
                        entry.description,
                        ADDRESS_PART_PATTERN,
                        "Address",
                        cleanAddress,
                        true
                      ),
                    });
                  }}
                  isInteractive={isInteractive}
                  placeholder="Street, City, Country"
                />
              ) : (
                rawAddress
              )}
            </span>
          );
        }

        if (websiteMatch) {
          const rawUrl = websiteMatch[1].trim();
          const href = normalizePdfUrl(rawUrl);

          if (!rawUrl && (!isInteractive || editingField !== "website")) {
            return null;
          }

          return (
            <span key="website" className={styles.websiteItemWrapper}>
              {pIdx > 0 && <span className={styles.pipeDivider}> | </span>}
              <span>Website: </span>
              {isInteractive && onUpdate ? (
                <>
                  <EditableText
                    value={rawUrl}
                    href={href}
                    onEditingChange={(editing) =>
                      setEditingField(editing ? "website" : null)
                    }
                    onChange={(newUrl) => {
                      const trimmedUrl = newUrl.trim();
                      onUpdate(entry.id, {
                        website: trimmedUrl,
                        description: updatePartInDescription(
                          entry.description,
                          WEBSITE_PART_PATTERN,
                          "Website",
                          trimmedUrl
                        ),
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

        if (gradeMatch) {
          const rawGrade = gradeMatch[1].trim();
          if (!rawGrade && (!isInteractive || editingField !== "finalGrade")) {
            return null;
          }

          return (
            <span key="finalGrade">
              {pIdx > 0 && <span className={styles.pipeDivider}> | </span>}
              <span>Final grade: </span>
              {isInteractive && onUpdate ? (
                <EditableText
                  value={rawGrade}
                  onEditingChange={(editing) =>
                    setEditingField(editing ? "finalGrade" : null)
                  }
                  onChange={(newGrade) => {
                    const cleanGrade = newGrade
                      .replace(/^(?:final\s*grade|score)\s*:\s*/i, "")
                      .replace(/\|/g, ",")
                      .trim();
                    onUpdate(entry.id, {
                      finalGrade: cleanGrade,
                      description: updatePartInDescription(
                        entry.description,
                        GRADE_PART_PATTERN,
                        "Final grade",
                        cleanGrade
                      ),
                    });
                  }}
                  isInteractive={isInteractive}
                  placeholder="95/100"
                />
              ) : (
                rawGrade
              )}
            </span>
          );
        }

        return (
          <span key={`other-${pIdx}`}>
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
  onDeleteSection,
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
          onDeleteSection={onDeleteSection}
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

            <EducationDetailsLine
              entry={entry}
              isInteractive={isInteractive}
              onUpdate={onUpdate}
            />
          </div>
        );
      })}
    </section>
  );
});
