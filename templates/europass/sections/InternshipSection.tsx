import { memo } from "react";
import type { InternshipEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface InternshipSectionProps {
  entries?: InternshipEntry[];
  title?: string;
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
}: InternshipSectionProps) {
  if (!entries || entries.length === 0) return null;

  const visible = entries.filter(
    (e) => e.role || e.company || e.description || e.location
  );
  if (visible.length === 0) return null;

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title={title ?? "WORK EXPERIENCE / INTERNSHIPS"} />
      {visible.map((item) => {
        const start = formatDateDMY(item.startDate);
        const end = formatDateDMY(item.endDate);
        const hasDate = start || end;

        return (
          <div key={item.id} className={styles.educationEntry}>
            {item.role && (
              <h3 className={styles.qualificationTitle}>{item.role}</h3>
            )}

            {(item.company || item.location || hasDate) && (
              <div className={styles.institutionRow}>
                {item.company && (
                  <span className={styles.institutionName}>{item.company}</span>
                )}
                {item.location && (
                  <>
                    {item.company && <span className={styles.pipeDivider}>|</span>}
                    <span className={styles.identityValue}>{item.location}</span>
                  </>
                )}
                {hasDate && (
                  <span className={styles.datesBadge}>
                    [{start}{end ? ` – ${end}` : ""}]
                  </span>
                )}
              </div>
            )}

            {item.description && (
              <div className={styles.educationDetails}>{item.description}</div>
            )}
          </div>
        );
      })}
    </section>
  );
});
