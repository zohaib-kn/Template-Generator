import { memo } from "react";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";

interface DeclarationSectionProps {
  text?: string;
  title?: string;
  isInteractive?: boolean;
  onUpdate?: (text: string) => void;
}

export const DeclarationSection = memo(function DeclarationSection({
  text,
  title,
  isInteractive = false,
  onUpdate,
}: DeclarationSectionProps) {
  if (!text && !isInteractive) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle title={title || "DECLARATION"} />
      )}
      <div className={styles.declarationSubheading}>Declaration</div>
      {isInteractive && onUpdate ? (
        <EditableText
          value={text ?? ""}
          onChange={onUpdate}
          isInteractive={isInteractive}
          multiline
          className={styles.declarationText}
          placeholder="I hereby declare that the above furnished details are true to the best of my knowledge and belief."
          as="p"
        />
      ) : (
        <p className={styles.declarationText}>{text}</p>
      )}
    </section>
  );
});
