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

  const names = entries.map((e) => e.name).filter(Boolean).join(", ");
  if (!names) return null;

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

      <p className={styles.aboutMeText}>
        {isInteractive && onUpdate ? (
          entries.map((interest, idx) => (
            <span key={interest.id || idx}>
              {idx > 0 && ", "}
              <EditableText
                value={interest.name ?? ""}
                onChange={(v) => onUpdate(interest.id, { name: v })}
                isInteractive={isInteractive}
                placeholder="Academic interest"
              />
            </span>
          ))
        ) : (
          names
        )}
      </p>
    </section>
  );
});
