import styles from "./europass.module.css";

export interface EuropassSectionTitleProps {
  title: string;
  isInteractive?: boolean;
  onAddEntry?: () => void;
  addLabel?: string;
}

/**
 * Standard reusable section title component for the Europass template.
 * Matches uppercase blue typography with a 0.75pt gray divider line.
 * When in interactive edit mode and onAddEntry is supplied, renders a minimal '+' button
 * aligned to the right side of the section heading.
 */
export function EuropassSectionTitle({
  title,
  isInteractive = false,
  onAddEntry,
  addLabel,
}: EuropassSectionTitleProps) {
  if (!title) return null;
  return (
    <div className={styles.sectionHeadingRow}>
      <div className={styles.sectionTitleBar}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {isInteractive && onAddEntry && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddEntry();
            }}
            className={styles.addSectionEntryBtn}
            title={addLabel || `Add new entry to ${title}`}
            data-html2canvas-ignore="true"
            data-pdf-ignore="true"
            data-no-print="true"
            aria-label={addLabel || `Add new entry to ${title}`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="8" y1="2" x2="8" y2="14" />
              <line x1="2" y1="8" x2="14" y2="8" />
            </svg>
          </button>
        )}
      </div>
      <div className={styles.sectionDivider} />
    </div>
  );
}
