import { memo, type ReactNode } from "react";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface AboutSectionProps {
  text?: string;
}

const DEFAULT_HIGHLIGHTS = [
  "Class 12 education",
  "History, Economics, and Political Science",
  "social sciences",
  "Bhopal, Madhya Pradesh",
  "Avi",
];

function highlightText(text: string): ReactNode[] {
  // If text already has markdown **bold**, parse that
  if (text.includes("**")) {
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

  // Otherwise, automatically bold the reference highlights
  const escaped = DEFAULT_HIGHLIGHTS.map((h) =>
    h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const regex = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (DEFAULT_HIGHLIGHTS.includes(part)) {
      return (
        <strong key={i} className={styles.aboutMeHighlight}>
          {part}
        </strong>
      );
    }
    return part;
  });
}

export const AboutSection = memo(function AboutSection({
  text,
}: AboutSectionProps) {
  if (!text) return null;

  const paragraphs = text.split("\n").filter((p) => p.trim().length > 0);

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title="ABOUT ME" />
      {paragraphs.map((p, idx) => (
        <p key={idx} className={styles.aboutMeText}>
          {highlightText(p)}
        </p>
      ))}
    </section>
  );
});
