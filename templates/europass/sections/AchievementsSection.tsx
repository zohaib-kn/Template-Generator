import { memo } from "react";
import type { Achievement } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";

interface AchievementsSectionProps {
  entries?: Achievement[];
  title?: string;
  isInteractive?: boolean;
  onUpdate?: (id: string, patch: Partial<Achievement>) => void;
}

export const AchievementsSection = memo(function AchievementsSection({
  entries,
  title,
  isInteractive = false,
  onUpdate,
}: AchievementsSectionProps) {
  if (!entries || entries.length === 0) return null;

  const visible = entries.filter((e) => isInteractive || e.title || e.description);
  if (visible.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle title={title || "ACHIEVEMENTS & AWARDS"} />
      )}
      <div className={styles.achievementList}>
        {visible.map((achievement) => {
          const hasYearInTitle = Boolean(
            achievement.dateYear &&
              achievement.title?.toLowerCase().includes(achievement.dateYear.toLowerCase())
          );
          const yearPrefix =
            achievement.dateYear && !hasYearInTitle
              ? `${achievement.dateYear} — `
              : "";
          const orgText = achievement.organisation
            ? `, ${achievement.organisation}`
            : "";
          const descText = achievement.description
            ? `: ${achievement.description}`
            : "";

          return (
            <div key={achievement.id} className={styles.achievementBulletItem}>
              <span className={styles.achievementBulletDot} aria-hidden="true">
                ●
              </span>
              <span className={styles.achievementBulletText}>
                {yearPrefix && (
                  <span className={styles.achievementYear}>{yearPrefix}</span>
                )}
                {isInteractive && onUpdate ? (
                  <>
                    <EditableText
                      value={achievement.title ?? ""}
                      onChange={(v) => onUpdate(achievement.id, { title: v })}
                      isInteractive={isInteractive}
                      className={styles.achievementTitle}
                      placeholder="Achievement / Award Title"
                    />
                    <span className={styles.achievementOrg}>, </span>
                    <EditableText
                      value={achievement.organisation ?? ""}
                      onChange={(v) => onUpdate(achievement.id, { organisation: v })}
                      isInteractive={isInteractive}
                      className={styles.achievementOrg}
                      placeholder="Organisation"
                    />
                    <span className={styles.achievementDesc}>: </span>
                    <EditableText
                      value={achievement.description ?? ""}
                      onChange={(v) => onUpdate(achievement.id, { description: v })}
                      isInteractive={isInteractive}
                      multiline
                      className={styles.achievementDesc}
                      placeholder="Description / Context"
                    />
                  </>
                ) : (
                  <>
                    <span className={styles.achievementTitle}>
                      {achievement.title}
                    </span>
                    {orgText && (
                      <span className={styles.achievementOrg}>{orgText}</span>
                    )}
                    {descText && (
                      <span className={styles.achievementDesc}>{descText}</span>
                    )}
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
});
