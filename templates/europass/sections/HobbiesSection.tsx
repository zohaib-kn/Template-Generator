import { memo } from "react";
import type { HobbyEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface HobbiesSectionProps {
  entries?: HobbyEntry[];
  title?: string;
}

export const HobbiesSection = memo(function HobbiesSection({
  entries,
  title,
}: HobbiesSectionProps) {
  if (!entries || entries.length === 0) return null;

  const visible = entries.filter((e) => e.name);
  if (visible.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle title={title || "HOBBIES AND INTERESTS"} />
      )}
      <div className={styles.subheadingGray}>Hobbies</div>
      <div className={styles.bulletList}>
        {visible.map((hobby) => (
          <div key={hobby.id} className={styles.bulletItem}>
            <span className={styles.bulletDot} aria-hidden="true">•</span>
            <span className={styles.bulletText}>
              {hobby.name}
              {hobby.description && (
                <span className={styles.educationDetails}>
                  {" — "}
                  {hobby.description}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
});
