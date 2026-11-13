import { memo, useState } from "react";
import type { AcademicInterest } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";
import { AcademicInterestInlineForm } from "../components/EuropassSectionEditors";

interface AcademicInterestsSectionProps {
  entries?: AcademicInterest[];
  title?: string;
  isInteractive?: boolean;
  onAdd?: (entry: Omit<AcademicInterest, "id">) => void;
  onUpdate?: (id: string, patch: Partial<AcademicInterest>) => void;
  onRemove?: (id: string) => void;
  onDeleteSection?: () => void;
}

export const AcademicInterestsSection = memo(function AcademicInterestsSection({
  entries = [],
  title,
  isInteractive = false,
  onAdd,
  onUpdate,
  onRemove,
  onDeleteSection,
}: AcademicInterestsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  
  if (!entries || entries.length === 0) return null;

  const visible = entries.filter((e) => Boolean(e.name && e.name.trim()));
  if (visible.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle
          title={title || "ACADEMIC INTERESTS"}
          isInteractive={isInteractive}
          onAddEntry={onAdd ? () => setIsAdding(true) : undefined}
          addLabel="Add Academic Interest"
          onDeleteSection={onDeleteSection}
        />
      )}

      {/* Inline entry editor for adding new academic interest */}
      {isInteractive && isAdding && onAdd && (
        <AcademicInterestInlineForm
          onSave={(data) => {
            onAdd(data);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      <div className={styles.hobbiesBulletList}>
        {visible.map((interest, idx) => (
          <div key={interest.id || idx} className={styles.hobbiesBulletItem}>
            <span className={styles.hobbiesBulletDot} aria-hidden="true">
              •
            </span>
            <span className={styles.bulletText}>
              {isInteractive && onUpdate ? (
                <EditableText
                  value={interest.name ?? ""}
                  onChange={(v) => onUpdate(interest.id, { name: v })}
                  isInteractive={isInteractive}
                  placeholder="Academic interest"
                />
              ) : (
                interest.name
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
});
