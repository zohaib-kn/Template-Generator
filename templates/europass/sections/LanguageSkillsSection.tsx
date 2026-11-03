import { memo, useState } from "react";
import type { LanguageEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";
import { LanguageInlineForm } from "../components/EuropassSectionEditors";

interface LanguageSkillsSectionProps {
  motherTongue?: string;
  entries?: LanguageEntry[];
  title?: string;
  isInteractive?: boolean;
  onAdd?: (entry: Omit<LanguageEntry, "id">) => void;
  onUpdateMotherTongue?: (value: string) => void;
  onUpdateEntry?: (id: string, patch: Partial<LanguageEntry>) => void;
  onRemoveEntry?: (id: string) => void;
}

export const LanguageSkillsSection = memo(function LanguageSkillsSection({
  motherTongue,
  entries = [],
  title,
  isInteractive = false,
  onAdd,
  onUpdateMotherTongue,
  onUpdateEntry,
  onRemoveEntry,
}: LanguageSkillsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);

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
      Boolean(e.language?.trim()) &&
      !e.level?.toLowerCase().includes("mother") &&
      !e.level?.toLowerCase().includes("native")
  );

  if (!effectiveMotherTongue && otherLanguages.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle
          title={title || "LANGUAGE SKILLS"}
          isInteractive={isInteractive}
          onAddEntry={onAdd ? () => setIsAdding(true) : undefined}
          addLabel="Add Language entry"
        />
      )}

      {/* Mother tongue */}
      {effectiveMotherTongue && (
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

      {/* Inline entry editor for adding new language */}
      {isInteractive && isAdding && onAdd && (
        <LanguageInlineForm
          onSave={(data) => {
            onAdd(data);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {/* Other languages */}
      {otherLanguages.length > 0 && (() => {
        const hasAnyCefr = otherLanguages.some((lang) =>
          Boolean(
            lang.listening ||
            lang.reading ||
            lang.writing ||
            lang.spokenProduction ||
            lang.spokenInteraction
          )
        );

        if (!hasAnyCefr) {
          return (
            <div className={styles.otherLanguagesRow}>
              <span className={styles.identityLabel}>Other language(s):</span>{" "}
              <span className={styles.identityValue}>
                {otherLanguages.map((lang, idx) => (
                  <span key={lang.id || idx}>
                    {idx > 0 && ", "}
                    {isInteractive && onUpdateEntry ? (
                      <EditableText
                        value={lang.language ?? ""}
                        onChange={(v) => onUpdateEntry(lang.id, { language: v })}
                        isInteractive={isInteractive}
                        placeholder="Language"
                      />
                    ) : (
                      lang.language
                    )}
                    {lang.level ? ` (${lang.level})` : ""}
                  </span>
                ))}
              </span>
            </div>
          );
        }

        return (
          <div className={styles.otherLanguagesRow}>
            <div className={styles.identityLabel} style={{ marginBottom: "1.5mm" }}>
              Other language(s):
            </div>
            {otherLanguages.map((lang, idx) => {
              const hasCefr = Boolean(
                lang.listening ||
                lang.reading ||
                lang.writing ||
                lang.spokenProduction ||
                lang.spokenInteraction
              );

              if (hasCefr) {
                return (
                  <div key={lang.id || idx} className={styles.cefrLanguageBlock}>
                    {isInteractive && onUpdateEntry ? (
                      <EditableText
                        value={lang.language ?? ""}
                        onChange={(v) => onUpdateEntry(lang.id, { language: v })}
                        isInteractive={isInteractive}
                        className={styles.cefrLanguageTitle}
                        placeholder="Language (e.g. English)"
                        as="h4"
                      />
                    ) : (
                      <h4 className={styles.cefrLanguageTitle}>{lang.language}</h4>
                    )}

                    <div className={styles.cefrGrid}>
                      <div className={styles.cefrRow}>
                        <span className={styles.cefrItem}>
                          <span className={styles.cefrSkillLabel}>LISTENING</span>
                          {isInteractive && onUpdateEntry ? (
                            <EditableText
                              value={lang.listening ?? ""}
                              onChange={(v) => onUpdateEntry(lang.id, { listening: v })}
                              isInteractive={isInteractive}
                              className={styles.cefrSkillBadge}
                              placeholder="C1"
                            />
                          ) : (
                            <span className={styles.cefrSkillBadge}>{lang.listening || "–"}</span>
                          )}
                        </span>

                        <span className={styles.cefrItem}>
                          <span className={styles.cefrSkillLabel}>READING</span>
                          {isInteractive && onUpdateEntry ? (
                            <EditableText
                              value={lang.reading ?? ""}
                              onChange={(v) => onUpdateEntry(lang.id, { reading: v })}
                              isInteractive={isInteractive}
                              className={styles.cefrSkillBadge}
                              placeholder="C1"
                            />
                          ) : (
                            <span className={styles.cefrSkillBadge}>{lang.reading || "–"}</span>
                          )}
                        </span>

                        <span className={styles.cefrItem}>
                          <span className={styles.cefrSkillLabel}>WRITING</span>
                          {isInteractive && onUpdateEntry ? (
                            <EditableText
                              value={lang.writing ?? ""}
                              onChange={(v) => onUpdateEntry(lang.id, { writing: v })}
                              isInteractive={isInteractive}
                              className={styles.cefrSkillBadge}
                              placeholder="C1"
                            />
                          ) : (
                            <span className={styles.cefrSkillBadge}>{lang.writing || "–"}</span>
                          )}
                        </span>
                      </div>

                      <div className={styles.cefrRow}>
                        <span className={styles.cefrItem}>
                          <span className={styles.cefrSkillLabel}>SPOKEN PRODUCTION</span>
                          {isInteractive && onUpdateEntry ? (
                            <EditableText
                              value={lang.spokenProduction ?? ""}
                              onChange={(v) => onUpdateEntry(lang.id, { spokenProduction: v })}
                              isInteractive={isInteractive}
                              className={styles.cefrSkillBadge}
                              placeholder="B2"
                            />
                          ) : (
                            <span className={styles.cefrSkillBadge}>{lang.spokenProduction || "–"}</span>
                          )}
                        </span>

                        <span className={styles.cefrItem}>
                          <span className={styles.cefrSkillLabel}>SPOKEN INTERACTION</span>
                          {isInteractive && onUpdateEntry ? (
                            <EditableText
                              value={lang.spokenInteraction ?? ""}
                              onChange={(v) => onUpdateEntry(lang.id, { spokenInteraction: v })}
                              isInteractive={isInteractive}
                              className={styles.cefrSkillBadge}
                              placeholder="C1"
                            />
                          ) : (
                            <span className={styles.cefrSkillBadge}>{lang.spokenInteraction || "–"}</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className={styles.cefrLegend}>
                      Levels: A1 and A2: Basic user; B1 and B2: Independent user; C1 and C2: Proficient user
                    </div>
                  </div>
                );
              }

              return (
                <div key={lang.id || idx} style={{ marginTop: "1mm" }}>
                  <span className={styles.identityValue}>
                    {isInteractive && onUpdateEntry ? (
                      <EditableText
                        value={lang.language ?? ""}
                        onChange={(v) => onUpdateEntry(lang.id, { language: v })}
                        isInteractive={isInteractive}
                        placeholder="Language"
                      />
                    ) : (
                      lang.language
                    )}
                    {lang.level ? ` (${lang.level})` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })()}
    </section>
  );
});
