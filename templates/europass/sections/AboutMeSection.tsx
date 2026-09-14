import styles from "../europass.module.css";

interface AboutMeSectionProps {
  text: string | undefined;
}

export function AboutMeSection({ text }: AboutMeSectionProps) {
  if (!text) return null;

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitleText}>About Me</div>
      <p className={styles.bodyText} style={{ marginTop: "6px" }}>
        {text}
      </p>
    </div>
  );
}
