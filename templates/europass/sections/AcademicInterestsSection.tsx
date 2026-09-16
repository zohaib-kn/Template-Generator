import { memo } from "react";
import type { AcademicInterest } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface AcademicInterestsSectionProps {
  entries?: AcademicInterest[];
}

export const AcademicInterestsSection = memo(function AcademicInterestsSection({
  entries,
}: AcademicInterestsSectionProps) {
  if (!entries || entries.length === 0) return null;

  const names = entries.map((e) => e.name).filter(Boolean).join(", ");
  if (!names) return null;

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title="ACADEMIC INTERESTS" />
      <p className={styles.aboutMeText}>{names}</p>
    </section>
  );
});
