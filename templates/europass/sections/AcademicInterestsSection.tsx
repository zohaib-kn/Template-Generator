import { memo } from "react";
import type { AcademicInterest } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";

interface AcademicInterestsSectionProps {
  entries?: AcademicInterest[];
  isInteractive?: boolean;
  onUpdate?: (id: string, patch: Partial<AcademicInterest>) => void;
}

export const AcademicInterestsSection = memo(function AcademicInterestsSection({
  entries,
  isInteractive = false,
  onUpdate,
}: AcademicInterestsSectionProps) {
  if (!entries || entries.length === 0) return null;

  const names = entries.map((e) => e.name).filter(Boolean).join(", ");
  if (!names && !isInteractive) return null;

  return (
    <section className={styles.sectionWrapper}>
      <EuropassSectionTitle title="ACADEMIC INTERESTS" />
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
