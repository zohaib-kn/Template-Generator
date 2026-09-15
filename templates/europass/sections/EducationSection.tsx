import { memo } from "react";
import type { EducationEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface EducationSectionProps {
  entries?: EducationEntry[];
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

function renderDescriptionWithLinks(desc: string) {
  // Splits by pipe "|" so we can color pipe separators with #d3d3d3
  const parts = desc.split("|");
  return parts.map((part, pIdx) => {
    const trimmed = part.trim();
    // Check if contains a URL
    const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/);
    return (
      <span key={pIdx}>
        {pIdx > 0 && <span className={styles.pipeDivider}>|</span>}
        {urlMatch ? (
          <>
            {trimmed.slice(0, urlMatch.index)}
            <a
              href={urlMatch[0]}
              target="_blank"
              rel="noreferrer"
              className={styles.blueLink}
            >
              {urlMatch[0]}
            </a>
            {trimmed.slice((urlMatch.index ?? 0) + urlMatch[0].length)}
          </>
        ) : (
          trimmed
        )}
      </span>
    );
  });
}

export const EducationSection = memo(function EducationSection({
  entries,
}: EducationSectionProps) {
  if (!entries || entries.length === 0) return null;

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title="EDUCATION AND TRAINING" />
      {entries.map((entry) => {
        const start = formatDateDMY(entry.startDate);
        const end = formatDateDMY(entry.endDate);
        const hasDate = start || end;

        return (
          <div key={entry.id} className={styles.educationEntry}>
            {entry.qualification && (
              <h3 className={styles.qualificationTitle}>{entry.qualification}</h3>
            )}
            {(entry.institution || hasDate) && (
              <div className={styles.institutionRow}>
                {entry.institution && (
                  <span className={styles.institutionName}>
                    {entry.institution}
                  </span>
                )}
                {hasDate && (
                  <span className={styles.datesBadge}>
                    [ {start} {end ? `– ${end}` : ""} ]
                  </span>
                )}
              </div>
            )}
            {entry.description && (
              <div className={styles.educationDetails}>
                {renderDescriptionWithLinks(entry.description)}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
});
