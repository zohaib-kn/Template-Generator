import { memo } from "react";
import type { VolunteeringEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";

interface VolunteeringSectionProps {
  entries?: VolunteeringEntry[];
  title?: string;
  isInteractive?: boolean;
  onUpdate?: (id: string, patch: Partial<VolunteeringEntry>) => void;
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
  isInteractive = false,
  onUpdate,
}: VolunteeringSectionProps) {
  if (!entries || entries.length === 0) return null;

  const visible = entries.filter(
    (e) => isInteractive || e.organization || e.role || e.description
  );
  if (visible.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle title={title || "VOLUNTEERING / COMMUNITY ENGAGEMENT"} />
      )}
      {visible.map((vol) => {
        const dateRange = formatDateRange(vol.startDate, vol.endDate);
        return (
          <div key={vol.id} className={styles.educationEntry}>
            {isInteractive && onUpdate ? (
              <EditableText
                value={vol.organization ?? ""}
                onChange={(v) => onUpdate(vol.id, { organization: v })}
                isInteractive={isInteractive}
                className={styles.qualificationTitle}
                placeholder="Organization"
                as="h3"
              />
            ) : (
              vol.organization && (
                <h3 className={styles.qualificationTitle}>{vol.organization}</h3>
              )
            )}

            {(isInteractive || vol.role || dateRange) && (
              <div className={styles.institutionRow}>
                {isInteractive && onUpdate ? (
                  <EditableText
                    value={vol.role ?? ""}
                    onChange={(v) => onUpdate(vol.id, { role: v })}
                    isInteractive={isInteractive}
                    className={styles.institutionName}
                    placeholder="Role / Title"
                  />
                ) : (
                  vol.role && (
                    <span className={styles.institutionName}>{vol.role}</span>
                  )
                )}
                {dateRange && (
                  <span className={styles.datesBadge}>[ {dateRange} ]</span>
                )}
              </div>
            )}

            {isInteractive && onUpdate ? (
              <EditableText
                value={vol.description ?? ""}
                onChange={(v) => onUpdate(vol.id, { description: v })}
                isInteractive={isInteractive}
                multiline
                className={styles.educationDetails}
                placeholder="Volunteering responsibilities and community impact..."
              />
            ) : (
              vol.description && (
                <div className={styles.educationDetails}>{vol.description}</div>
              )
            )}
          </div>
        );
      })}
    </section>
  );
});
