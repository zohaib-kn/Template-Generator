import { memo, type ReactNode } from "react";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface AboutSectionProps {
  text?: string;
  title?: string;
}

/**
 * Parses user-supplied **bold** markdown into <strong> elements.
 * No hardcoded highlights — only text the student explicitly marks.
 */
function highlightText(text: string): ReactNode[] {
  if (!text.includes("**")) return [text];

  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className={styles.aboutMeHighlight}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export const AboutSection = memo(function AboutSection({
  text,
  title,
}: AboutSectionProps) {
  if (!text) return null;

  const paragraphs = text.split("\n").filter((p) => p.trim().length > 0);
  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle title={title || "ABOUT ME"} />
      )}
      {paragraphs.map((p, idx) => (
        <p key={idx} className={styles.aboutMeText}>
          {highlightText(p)}
        </p>
      ))}
    </section>
  );
});
