import { memo } from "react";
import type { LeadershipActivity } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface LeadershipSectionProps {
  entries?: LeadershipActivity[];
  title?: string;
}

export const LeadershipSection = memo(function LeadershipSection({
  entries,
  title,
}: LeadershipSectionProps) {
  if (!entries || entries.length === 0) return null;

  const visible = entries.filter((e) => e.activity || e.description);
  if (visible.length === 0) return null;

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title={title ?? "LEADERSHIP & EXTRACURRICULAR"} />
      {visible.map((item) => (
        <div key={item.id} className={styles.educationEntry}>
          {item.activity && (
            <h3 className={styles.qualificationTitle}>{item.activity}</h3>
          )}

          {(item.organisation || item.duration) && (
            <div className={styles.institutionRow}>
              {item.organisation && (
                <span className={styles.institutionName}>
                  {item.organisation}
                </span>
              )}
              {item.duration && (
                <span className={styles.datesBadge}>[{item.duration}]</span>
              )}
            </div>
          )}

          {item.description && (
            <div className={styles.educationDetails}>{item.description}</div>
          )}

          {item.impact && (
            <div className={styles.educationDetails}>
              <span className={styles.institutionName}>Impact: </span>
              {item.impact}
            </div>
          )}
        </div>
      ))}
    </section>
  );
});
