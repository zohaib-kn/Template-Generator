import { memo } from "react";
import type { LanguageEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface LanguageSkillsSectionProps {
  motherTongue?: string;
  entries?: LanguageEntry[];
}

export const LanguageSkillsSection = memo(function LanguageSkillsSection({
  motherTongue,
  entries,
}: LanguageSkillsSectionProps) {
  // Determine effective mother tongue:
  // 1. Dedicated motherTongue prop
  // 2. Fallback to entry with level containing "mother" or "native"
  const entryMother = entries?.find(
    (e) =>
      e.level?.toLowerCase().includes("mother") ||
      e.level?.toLowerCase().includes("native")
  );

  const effectiveMotherTongue =
    motherTongue?.trim() || entryMother?.language?.trim() || "";

  // Other languages: filter out the mother tongue entry and any blank entries
  const otherLanguages = (entries ?? []).filter(
    (e) =>
      e !== entryMother &&
      Boolean(e.language?.trim()) &&
      !e.level?.toLowerCase().includes("mother") &&
      !e.level?.toLowerCase().includes("native")
  );

  if (!effectiveMotherTongue && otherLanguages.length === 0) return null;

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title="LANGUAGE SKILLS" />

      {/* Mother tongue */}
      {effectiveMotherTongue && (
        <div className={styles.motherTongueRow}>
          <span className={styles.identityLabel}>Mother tongue(s):</span>{" "}
          <span className={styles.identityValue}>{effectiveMotherTongue}</span>
        </div>
      )}

      {/* Other languages (compact, space-saving format) */}
      {otherLanguages.length > 0 && (
        <div className={styles.otherLanguagesRow}>
          <span className={styles.identityLabel}>Other language(s):</span>{" "}
          <span className={styles.identityValue}>
            {otherLanguages
              .map((lang) =>
                lang.level ? `${lang.language} (${lang.level})` : lang.language
              )
              .join(", ")}
          </span>
        </div>
      )}
    </section>
  );
});
