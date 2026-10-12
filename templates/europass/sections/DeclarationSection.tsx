import { memo } from "react";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface DeclarationSectionProps {
  text?: string;
  title?: string;
}

export const DeclarationSection = memo(function DeclarationSection({
  text,
  title,
}: DeclarationSectionProps) {
  if (!text) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle title={title || "DECLARATION"} />
      )}
      <div className={styles.subheadingGray}>Declaration</div>
      <p className={styles.declarationText}>{text}</p>
    </section>
  );
});
