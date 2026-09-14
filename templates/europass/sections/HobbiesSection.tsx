import type { HobbyEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface HobbiesSectionProps {
  entries?: HobbyEntry[];
}

export function HobbiesSection({ entries }: HobbiesSectionProps) {
  if (!entries || entries.length === 0) return null;

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title="HOBBIES AND INTERESTS" />
      <div className={styles.subheadingGray}>Hobbies</div>
      <ol className={styles.numberedList}>
        {entries.map((hobby) => (
          <li key={hobby.id}>{hobby.name}</li>
        ))}
      </ol>
    </section>
  );
}
