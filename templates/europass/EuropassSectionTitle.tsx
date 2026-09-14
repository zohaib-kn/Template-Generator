import styles from "./europass.module.css";

interface EuropassSectionTitleProps {
  title: string;
}

/**
 * Standard reusable section title component for the Europass template.
 * Matches uppercase blue typography with a 0.75pt gray divider line.
 */
export function EuropassSectionTitle({ title }: EuropassSectionTitleProps) {
  return (
    <div className={styles.sectionHeadingRow}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.sectionDivider} />
    </div>
  );
}
