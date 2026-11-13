import { memo, useState } from "react";
import type { HobbyEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";
import { HobbyInlineForm } from "../components/EuropassSectionEditors";

interface HobbiesSectionProps {
  entries?: HobbyEntry[];
  title?: string;
  isInteractive?: boolean;
  onAdd?: (entry: Omit<HobbyEntry, "id">) => void;
  onUpdate?: (id: string, patch: Partial<HobbyEntry>) => void;
  onRemove?: (id: string) => void;
  onDeleteSection?: () => void;
}

interface FlattenedHobbyItem {
  id: string;
  name: string;
  description?: string;
  originalId: string;
}

export const HobbiesSection = memo(function HobbiesSection({
  entries = [],
  title,
  isInteractive = false,
  onAdd,
  onUpdate,
  onRemove,
  onDeleteSection,
}: HobbiesSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  
  if (!entries || entries.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  const isSectionHeading = (text: string) => {
    const norm = text.toLowerCase().replace(/[^a-z]/g, "");
    return (
      norm === "hobbiesandinterests" ||
      norm === "hobbiesinterests" ||
      norm === "hobbies" ||
      norm === "interests"
    );
  };

  // Flatten any entries that contain comma, semicolon, newline, or bullet separated hobbies
  const visibleHobbies: FlattenedHobbyItem[] = [];
  entries.forEach((hobby, entryIdx) => {
    if (!hobby.name || !hobby.name.trim()) return;

    const parts = hobby.name
      .split(/[\n,;•·]+/g)
      .map((item) => item.replace(/^[•*\-\s]+/, "").trim())
      .filter((item) => item.length > 0 && !isSectionHeading(item));

    if (parts.length > 1) {
      parts.forEach((p, partIdx) => {
        visibleHobbies.push({
          id: `${hobby.id || entryIdx}-${partIdx}`,
          name: p,
          description: hobby.description?.trim(),
          originalId: hobby.id || `hobby-${entryIdx}`,
        });
      });
    } else {
      visibleHobbies.push({
        id: hobby.id || `hobby-${entryIdx}`,
        name: parts[0] || hobby.name.trim(),
        description: hobby.description?.trim(),
        originalId: hobby.id || `hobby-${entryIdx}`,
      });
    }
  });

  const displayList =
    visibleHobbies.length > 0
      ? visibleHobbies
      : entries.map((h, i) => ({
          id: h.id || `hobby-${i}`,
          name: h.name || "",
          description: h.description,
          originalId: h.id || `hobby-${i}`,
        }));

  if (displayList.length === 0) return null;

  return (
    <section className={`${styles.sectionWrapper} ${!showTitle ? styles.sectionContinuation : ""}`.trim()}>
      {showTitle && (
        <EuropassSectionTitle
          title={title || "HOBBIES AND INTERESTS"}
          isInteractive={isInteractive}
          onAddEntry={onAdd ? () => setIsAdding(true) : undefined}
          addLabel="Add Hobby / Interest"
          onDeleteSection={onDeleteSection}
        />
      )}

      {/* Inline entry editor for adding new hobby */}
      {isInteractive && isAdding && onAdd && (
        <HobbyInlineForm
          onSave={(data) => {
            onAdd(data);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      <div className={styles.hobbiesBulletList}>
        {displayList.map((hobby) => (
          <div key={hobby.id} className={styles.hobbiesBulletItem}>
            <span className={styles.hobbiesBulletDot} aria-hidden="true">
              •
            </span>
            <span className={styles.bulletText}>
              {isInteractive && onUpdate ? (
                <EditableText
                  value={hobby.name ?? ""}
                  onChange={(v) => onUpdate(hobby.originalId, { name: v })}
                  isInteractive={isInteractive}
                  placeholder="Hobby or interest"
                />
              ) : (
                hobby.name
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
});
