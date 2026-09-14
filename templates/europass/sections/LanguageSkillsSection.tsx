import type { LanguageEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";

interface LanguageSkillsSectionProps {
  entries?: LanguageEntry[];
}

export function LanguageSkillsSection({ entries }: LanguageSkillsSectionProps) {
  if (!entries || entries.length === 0) return null;

  // Distinguish mother tongue vs other languages
  const motherTongue = entries.find(
    (e) =>
      e.level?.toLowerCase().includes("mother") ||
      e.level?.toLowerCase().includes("native")
  );
  const otherLanguages = entries.filter((e) => e !== motherTongue);

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title="LANGUAGE SKILLS" />

      {/* Mother tongue */}
      {motherTongue && (
        <div className={styles.motherTongueRow}>
          <strong>Mother tongue(s):</strong> {motherTongue.language}
        </div>
      )}

      {/* Other languages */}
      {otherLanguages.length > 0 && (
        <div>
          <div className={styles.otherLanguagesLabel}>Other language(s):</div>
          {otherLanguages.map((lang) => (
            <div key={lang.id} style={{ marginBottom: "2mm" }}>
              <h3 className={styles.languageNameTitle}>{lang.language}</h3>
              <div className={styles.cefrGrid}>
                <div className={styles.cefrItem}>
                  <span className={styles.cefrComponent}>LISTENING</span>
                  <span className={styles.cefrLevel}>{lang.level ?? "C1"}</span>
                </div>
                <div className={styles.cefrItem}>
                  <span className={styles.cefrComponent}>READING</span>
                  <span className={styles.cefrLevel}>{lang.level ?? "C1"}</span>
                </div>
                <div className={styles.cefrItem}>
                  <span className={styles.cefrComponent}>WRITING</span>
                  <span className={styles.cefrLevel}>{lang.level ?? "C1"}</span>
                </div>
                <div className={styles.cefrItem}>
                  <span className={styles.cefrComponent}>
                    SPOKEN PRODUCTION
                  </span>
                  <span className={styles.cefrLevel}>{lang.level ?? "C1"}</span>
                </div>
              </div>
            </div>
          ))}

          <div className={styles.cefrLegend}>
            Levels: A1 and A2: Basic user; B1 and B2: Independent user; C1 and
            C2: Proficient user
          </div>
        </div>
      )}
    </section>
  );
}
