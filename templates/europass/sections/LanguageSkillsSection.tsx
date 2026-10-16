import { memo } from "react";
import type { LanguageEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";

interface LanguageSkillsSectionProps {
  motherTongue?: string;
  entries?: LanguageEntry[];
  title?: string;
  isInteractive?: boolean;
  onUpdateMotherTongue?: (value: string) => void;
  onUpdateEntry?: (id: string, patch: Partial<LanguageEntry>) => void;
}

export const LanguageSkillsSection = memo(function LanguageSkillsSection({
  motherTongue,
  entries,
  title,
  isInteractive = false,
  onUpdateMotherTongue,
  onUpdateEntry,
}: LanguageSkillsSectionProps) {
  const entryMother = entries?.find(
    (e) =>
      e.level?.toLowerCase().includes("mother") ||
      e.level?.toLowerCase().includes("native")
  );

  const effectiveMotherTongue =
    motherTongue?.trim() || entryMother?.language?.trim() || "";

  const otherLanguages = (entries ?? []).filter(
    (e) =>
      e !== entryMother &&
      (isInteractive || Boolean(e.language?.trim())) &&
      !e.level?.toLowerCase().includes("mother") &&
      !e.level?.toLowerCase().includes("native")
  );

  if (!isInteractive && !effectiveMotherTongue && otherLanguages.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle title={title || "LANGUAGE SKILLS"} />
      )}

      {/* Mother tongue */}
      {(isInteractive || effectiveMotherTongue) && (
        <div className={styles.motherTongueRow}>
          <span className={styles.identityLabel}>Mother tongue(s):</span>{" "}
          {isInteractive && onUpdateMotherTongue ? (
            <EditableText
              value={effectiveMotherTongue}
              onChange={onUpdateMotherTongue}
              isInteractive={isInteractive}
              className={styles.identityValue}
              placeholder="e.g. Hindi, English"
            />
          ) : (
            <span className={styles.identityValue}>{effectiveMotherTongue}</span>
          )}
        </div>
      )}

      {/* Other languages */}
      {(isInteractive || otherLanguages.length > 0) && (
        <div className={styles.otherLanguagesRow}>
          <span className={styles.identityLabel}>Other language(s):</span>{" "}
          <span className={styles.identityValue}>
            {isInteractive && onUpdateEntry ? (
              otherLanguages.map((lang, idx) => (
                <span key={lang.id || idx}>
                  {idx > 0 && ", "}
                  <EditableText
                    value={lang.language ?? ""}
                    onChange={(v) => onUpdateEntry(lang.id, { language: v })}
                    isInteractive={isInteractive}
                    placeholder="Language"
                  />
                  <span> (</span>
                  <EditableText
                    value={lang.level ?? ""}
                    onChange={(v) => onUpdateEntry(lang.id, { level: v })}
                    isInteractive={isInteractive}
                    placeholder="Level e.g. B2"
                  />
                  <span>)</span>
                </span>
              ))
            ) : (
              otherLanguages
                .map((lang) =>
                  lang.level ? `${lang.language} (${lang.level})` : lang.language
                )
                .join(", ")
            )}
          </span>
        </div>
      )}
    </section>
  );
});
