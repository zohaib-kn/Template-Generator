import { memo } from "react";
import type { Achievement } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface AchievementsSectionProps {
  entries?: Achievement[];
  title?: string;
}

export const AchievementsSection = memo(function AchievementsSection({
  entries,
  title,
}: AchievementsSectionProps) {
  if (!entries || entries.length === 0) return null;

  const visible = entries.filter((e) => e.title || e.description);
  if (visible.length === 0) return null;

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title={title ?? "ACHIEVEMENTS & AWARDS"} />
      {visible.map((achievement) => (
        <div key={achievement.id} className={styles.educationEntry}>
          {achievement.title && (
            <h3 className={styles.qualificationTitle}>{achievement.title}</h3>
          )}

          {(achievement.organisation || achievement.dateYear) && (
            <div className={styles.institutionRow}>
              {achievement.organisation && (
                <span className={styles.institutionName}>
                  {achievement.organisation}
                </span>
              )}
              {achievement.dateYear && (
                <span className={styles.datesBadge}>
                  [{achievement.dateYear}]
                </span>
              )}
            </div>
          )}

          {achievement.description && (
            <div className={styles.educationDetails}>
              {achievement.description}
            </div>
          )}
        </div>
      ))}
    </section>
  );
});
