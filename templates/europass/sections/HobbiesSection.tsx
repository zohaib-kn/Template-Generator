import { memo } from "react";
import type { HobbyEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface HobbiesSectionProps {
  entries?: HobbyEntry[];
}

export const HobbiesSection = memo(function HobbiesSection({
  entries,
}: HobbiesSectionProps) {
  if (!entries || entries.length === 0) return null;

  const visible = entries.filter((e) => e.name);
  if (visible.length === 0) return null;

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title="HOBBIES AND INTERESTS" />
      <ol className={styles.numberedList}>
        {visible.map((hobby) => (
          <li key={hobby.id}>
            <span>{hobby.name}</span>
            {hobby.description && (
              <span className={styles.educationDetails}>
                {" — "}
                {hobby.description}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
});
