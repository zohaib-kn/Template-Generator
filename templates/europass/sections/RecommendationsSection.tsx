import { memo } from "react";
import type { RecommendationEntry } from "@/types";
import styles from "../europass.module.css";
import { EuropassSectionTitle } from "../EuropassSectionTitle";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";

interface RecommendationsSectionProps {
  entries?: RecommendationEntry[];
  part?: 1 | 2;
  title?: string;
  isInteractive?: boolean;
  onUpdate?: (id: string, patch: Partial<RecommendationEntry>) => void;
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
            <a href={`mailto:${emailMatch[1]}`} className={styles.blueLink}>
              {emailMatch[1]}
            </a>
          </>
        ) : linkMatch ? (
          <>
            <strong>Link:</strong>{" "}
            <a
              href={linkMatch[1]}
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
  entries,
  part,
  title,
  isInteractive = false,
  onUpdate,
}: RecommendationsSectionProps) {
  if (!entries || entries.length === 0) return null;

  const entry = entries[0];
  const fullText = entry.text ?? "";

  // Split content between Page 1 and Page 2
  let p1Text = fullText;
  let p2Text = "";

  if (fullText.includes("To conclude,")) {
    const splitIndex = fullText.indexOf("To conclude,");
    p1Text = fullText.slice(0, splitIndex).trim();
    p2Text = fullText.slice(splitIndex).trim();
  } else {
    const paragraphs = fullText.split("\n\n").filter(Boolean);
    if (paragraphs.length > 2) {
      const splitAt = Math.ceil(paragraphs.length * 0.65);
      p1Text = paragraphs.slice(0, splitAt).join("\n\n");
      p2Text = paragraphs.slice(splitAt).join("\n\n");
    }
  }

  // --- Page 1 Rendering ---
  if (part === 1) {
    const paragraphs = p1Text.split("\n\n").filter(Boolean);
    return (
      <section className={styles.sectionWrapper}>
        <EuropassSectionTitle title="RECOMMENDATIONS" />

        {(entry.recommenderName || entry.recommenderTitle) && (
          <div className={styles.recommenderMeta}>
            <span className={styles.recommenderNameLabel}>Name:</span>{" "}
            {isInteractive && onUpdate ? (
              <EditableText
                value={entry.recommenderName ?? ""}
                onChange={(v) => onUpdate(entry.id, { recommenderName: v })}
                isInteractive={isInteractive}
                className={styles.recommenderName}
                placeholder="Recommender Name"
              />
            ) : (
              <span className={styles.recommenderName}>
                {entry.recommenderName}
              </span>
            )}
            {(isInteractive || entry.recommenderTitle) && (
              <>
                <span className={styles.pipeDivider}>|</span>
                {isInteractive && onUpdate ? (
                  <EditableText
                    value={entry.recommenderTitle ?? ""}
                    onChange={(v) => onUpdate(entry.id, { recommenderTitle: v })}
                    isInteractive={isInteractive}
                    className={styles.recommenderTitle}
                    placeholder="Title / Position"
                  />
                ) : (
                  <span className={styles.recommenderTitle}>
                    {entry.recommenderTitle}
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {isInteractive && onUpdate ? (
          <EditableText
            value={p1Text}
            onChange={(v) => onUpdate(entry.id, { text: p2Text ? `${v}\n\n${p2Text}` : v })}
            isInteractive={isInteractive}
            multiline
            className={styles.recommendationParagraph}
            placeholder="Recommendation text..."
          />
        ) : (
          paragraphs.map((p, idx) => (
            <p key={idx} className={styles.recommendationParagraph}>
              {p}
            </p>
          ))
        )}
      </section>
    );
  }

  // --- Page 2 Rendering (Continuation) ---
  if (part === 2) {
    if (!p2Text) return null;
    const lines = p2Text.split("\n").filter((l) => l.trim().length > 0);
    const concludingParagraphs: string[] = [];
    const contactLines: string[] = [];

    lines.forEach((line) => {
      if (
        line.startsWith("Email:") ||
        line.startsWith("Link:") ||
        line.startsWith("Phone number:")
      ) {
        contactLines.push(line);
      } else {
        concludingParagraphs.push(line);
      }
    });

    return (
      <div style={{ marginBottom: "2.5mm" }}>
        {isInteractive && onUpdate ? (
          <EditableText
            value={concludingParagraphs.join("\n\n")}
            onChange={(v) => onUpdate(entry.id, { text: `${p1Text}\n\n${v}${contactLines.length ? `\n${contactLines.join("\n")}` : ""}` })}
            isInteractive={isInteractive}
            multiline
            className={styles.recommendationParagraph}
            placeholder="Concluding paragraph..."
          />
        ) : (
          concludingParagraphs.map((cp, idx) => (
            <p key={idx} className={styles.recommendationParagraph}>
              {cp}
            </p>
          ))
        )}

        {contactLines.map((cl, idx) => (
          <div key={idx} className={styles.recommendationContactRow}>
            {renderContactLine(cl)}
          </div>
        ))}
      </div>
    );
  }

  // --- Default (Render all recommendation entries) ---
  const showTitle = title === undefined ? true : Boolean(title);

  return (
    <section className={styles.sectionWrapper}>
      {showTitle && <EuropassSectionTitle title={title || "RECOMMENDATIONS"} />}
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
