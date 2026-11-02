import { memo, useState } from "react";
import type { RecommendationEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";
import { RecommendationInlineForm } from "../components/EuropassSectionEditors";

interface RecommendationsSectionProps {
  entries?: RecommendationEntry[];
  part?: 1 | 2;
  title?: string;
  isInteractive?: boolean;
  onAdd?: (entry: Omit<RecommendationEntry, "id">) => void;
  onUpdate?: (id: string, patch: Partial<RecommendationEntry>) => void;
  onRemove?: (id: string) => void;
}

function renderContactLine(line: string) {
  const parts = line.split("|");
  return parts.map((part, idx) => {
    const trimmed = part.trim();
    const emailMatch = trimmed.match(/Email:\s*([^\s]+)/);
    const linkMatch = trimmed.match(/Link:\s*(https?:\/\/[^\s]+)/);
    const phoneMatch = trimmed.match(/Phone number:\s*(.+)/);

    return (
      <span key={idx}>
        {idx > 0 && <span className={styles.pipeDivider}>|</span>}
        {emailMatch ? (
          <>
            <strong>Email:</strong>{" "}
            <a
              href={`mailto:${emailMatch[1]}`}
              data-pdf-link={`mailto:${emailMatch[1]}`}
              className={styles.blueLink}
            >
              {emailMatch[1]}
            </a>
          </>
        ) : linkMatch ? (
          <>
            <strong>Link:</strong>{" "}
            <a
              href={linkMatch[1]}
              data-pdf-link={linkMatch[1]}
              target="_blank"
              rel="noreferrer"
              className={styles.blueLink}
            >
              {linkMatch[1]}
            </a>
          </>
        ) : phoneMatch ? (
          <>
            <strong>Phone number:</strong> {phoneMatch[1]}
          </>
        ) : (
          trimmed
        )}
      </span>
    );
  });
}

export const RecommendationsSection = memo(function RecommendationsSection({
  entries = [],
  part,
  title,
  isInteractive = false,
  onAdd,
  onUpdate,
  onRemove,
}: RecommendationsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  
  if (!entries || entries.length === 0) return null;

  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && (
        <EuropassSectionTitle
          title={title || "RECOMMENDATIONS"}
          isInteractive={isInteractive}
          onAddEntry={onAdd ? () => setIsAdding(true) : undefined}
          addLabel="Add Recommendation entry"
        />
      )}

      {/* Inline entry editor for adding new recommendation */}
      {isInteractive && isAdding && onAdd && (
        <RecommendationInlineForm
          onSave={(data) => {
            onAdd(data);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {entries.map((recEntry, recIdx) => {
          const lines = (recEntry.text ?? "")
          .split("\n")
          .filter((l) => l.trim().length > 0);
        const regularParagraphs: string[] = [];
        const contactLines: string[] = [];

        lines.forEach((line) => {
          if (
            line.startsWith("Email:") ||
            line.startsWith("Link:") ||
            line.startsWith("Phone number:")
          ) {
            contactLines.push(line);
          } else {
            regularParagraphs.push(line);
          }
        });

        return (
          <div
            key={recEntry.id || recIdx}
            
            style={{ marginBottom: recIdx < entries.length - 1 ? "4.5mm" : "0" }}
            
          >
            

            {(isInteractive || recEntry.recommenderName || recEntry.recommenderTitle) && (
              <div className={styles.recommenderMeta}>
                <span className={styles.recommenderNameLabel}>Name:</span>{" "}
                {isInteractive && onUpdate ? (
                  <EditableText
                    value={recEntry.recommenderName ?? ""}
                    onChange={(v) => onUpdate(recEntry.id, { recommenderName: v })}
                    isInteractive={isInteractive}
                    className={styles.recommenderName}
                    placeholder="Recommender Name"
                  />
                ) : (
                  <span className={styles.recommenderName}>
                    {recEntry.recommenderName}
                  </span>
                )}
                {(isInteractive || recEntry.recommenderTitle) && (
                  <>
                    <span className={styles.pipeDivider}>|</span>
                    {isInteractive && onUpdate ? (
                      <EditableText
                        value={recEntry.recommenderTitle ?? ""}
                        onChange={(v) => onUpdate(recEntry.id, { recommenderTitle: v })}
                        isInteractive={isInteractive}
                        className={styles.recommenderTitle}
                        placeholder="Recommender Title"
                      />
                    ) : (
                      <span className={styles.recommenderTitle}>
                        {recEntry.recommenderTitle}
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
            {isInteractive && onUpdate ? (
              <EditableText
                value={recEntry.text ?? ""}
                onChange={(v) => onUpdate(recEntry.id, { text: v })}
                isInteractive={isInteractive}
                multiline
                className={styles.recommendationParagraph}
                placeholder="Recommendation letter content..."
              />
            ) : (
              <>
                {regularParagraphs.map((p, idx) => (
                  <p key={idx} className={styles.recommendationParagraph}>
                    {p}
                  </p>
                ))}
                {contactLines.map((cl, idx) => (
                  <div key={idx} className={styles.recommendationContactRow}>
                    {renderContactLine(cl)}
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })}
    </section>
  );
});
