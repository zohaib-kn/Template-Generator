import type { VolunteeringEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface VolunteeringSectionProps {
  entries?: VolunteeringEntry[];
}

export function VolunteeringSection({ entries }: VolunteeringSectionProps) {
  if (!entries || entries.length === 0) return null;

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title="VOLUNTEERING" />
      {entries.map((vol) => (
        <div key={vol.id} className={styles.volunteeringInline}>
          {vol.role && <span className={styles.volunteeringRole}>{vol.role}</span>}
          {vol.description && <span>{vol.description}</span>}
        </div>
      ))}
    </section>
  );
}
