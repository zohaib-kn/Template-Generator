import { memo } from "react";
import type { HobbyEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";

interface HobbiesSectionProps {
  entries?: HobbyEntry[];
  title?: string;
  isInteractive?: boolean;
  onUpdate?: (id: string, patch: Partial<HobbyEntry>) => void;
}

interface FlattenedHobbyItem {
  id: string;
  name: string;
  description?: string;
}

export const HobbiesSection = memo(function HobbiesSection({
  entries,
  title,
  isInteractive = false,
  onUpdate,
}: HobbiesSectionProps) {
  if (!entries || entries.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  if (isInteractive && onUpdate) {
    return (
      <section className={styles.sectionWrapper}>
        {showTitle && (
          <EuropassSectionTitle title={title || "HOBBIES AND INTERESTS"} />
        )}
        <div className={styles.hobbiesBulletList}>
          {entries.map((hobby) => (
            <div key={hobby.id} className={styles.hobbiesBulletItem}>
              <span className={styles.hobbiesBulletDot} aria-hidden="true">
                •
              </span>
              <span className={styles.bulletText}>
                <EditableText
                  value={hobby.name ?? ""}
                  onChange={(v) => onUpdate(hobby.id, { name: v })}
                  isInteractive={isInteractive}
                  placeholder="Hobby or interest"
                />
                {(isInteractive || hobby.description) && (
                  <span className={styles.educationDetails}>
                    {" — "}
                    <EditableText
                      value={hobby.description ?? ""}
                      onChange={(v) => onUpdate(hobby.id, { description: v })}
                      isInteractive={isInteractive}
                      placeholder="Optional details..."
                    />
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Flatten any entries that contain comma, semicolon, newline, or bullet separated hobbies
  const visibleHobbies: FlattenedHobbyItem[] = [];
  entries.forEach((hobby, entryIdx) => {
    if (!hobby.name || !hobby.name.trim()) return;

    const parts = hobby.name
      .split(/[\n,;•·]+/g)
      .map((item) => item.replace(/^[•*\-\s]+/, "").trim())
      .filter((item) => item.length > 0);

    if (parts.length > 1) {
      parts.forEach((p, partIdx) => {
        visibleHobbies.push({
          id: `${hobby.id || entryIdx}-${partIdx}`,
          name: p,
        });
      });
    } else {
      visibleHobbies.push({
        id: hobby.id || `hobby-${entryIdx}`,
        name: parts[0] || hobby.name.trim(),
        description: hobby.description?.trim(),
      });
    }
  });

  if (visibleHobbies.length === 0) return null;

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle title={title || "HOBBIES AND INTERESTS"} />
      )}
      <div className={styles.hobbiesBulletList}>
        {visibleHobbies.map((hobby) => (
          <div key={hobby.id} className={styles.hobbiesBulletItem}>
            <span className={styles.hobbiesBulletDot} aria-hidden="true">
              •
            </span>
            <span className={styles.bulletText}>
              {hobby.name}
              {hobby.description && (
                <span className={styles.educationDetails}>
                  {" — "}
                  {hobby.description}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
});
