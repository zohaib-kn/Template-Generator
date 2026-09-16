import { memo } from "react";
import type { VolunteeringEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface VolunteeringSectionProps {
  entries?: VolunteeringEntry[];
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

function formatDateRange(start?: string, end?: string): string {
  const fStart = formatDateDMY(start);
  const fEnd = formatDateDMY(end);
  if (!fStart && !fEnd) return "";
  if (fStart && fEnd) return `${fStart} – ${fEnd}`;
  return fStart || fEnd;
}

export const VolunteeringSection = memo(function VolunteeringSection({
  entries,
  title,
}: VolunteeringSectionProps) {
  if (!entries || entries.length === 0) return null;

  const visible = entries.filter(
    (e) => e.organization || e.role || e.description
  );
  if (visible.length === 0) return null;

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title={title ?? "VOLUNTEERING / COMMUNITY ENGAGEMENT"} />
      {visible.map((vol) => {
        const dateRange = formatDateRange(vol.startDate, vol.endDate);
        return (
          <div key={vol.id} className={styles.educationEntry}>
            {vol.organization && (
              <h3 className={styles.qualificationTitle}>{vol.organization}</h3>
            )}

            {(vol.role || dateRange) && (
              <div className={styles.institutionRow}>
                {vol.role && (
                  <span className={styles.institutionName}>{vol.role}</span>
                )}
                {dateRange && (
                  <span className={styles.datesBadge}>[{dateRange}]</span>
                )}
              </div>
            )}

            {vol.description && (
              <div className={styles.educationDetails}>{vol.description}</div>
            )}
          </div>
        );
      })}
    </section>
  );
});
