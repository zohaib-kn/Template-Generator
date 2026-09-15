import { memo } from "react";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface DeclarationSectionProps {
  text?: string;
}

export const DeclarationSection = memo(function DeclarationSection({
  text,
}: DeclarationSectionProps) {
  if (!text) return null;

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title="DECLERATION" />
      <div className={styles.subheadingGray}>Declaration</div>
      <p className={styles.declarationText}>{text}</p>
    </section>
  );
});
