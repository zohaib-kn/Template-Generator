import styles from "./europass.module.css";

export interface EuropassSectionTitleProps {
  title: string;
  isInteractive?: boolean;
  onAddEntry?: () => void;
  addLabel?: string;
  onDeleteSection?: () => void;
  deleteLabel?: string;
}

/**
 * Standard reusable section title component for the Europass template.
 * Matches uppercase blue typography with a 0.75pt gray divider line.
 * When in interactive edit mode, renders minimal '+' and delete controls
 * aligned to the right side of the section heading.
 */
export function EuropassSectionTitle({
  title,
  isInteractive = false,
  onAddEntry,
  addLabel,
  onDeleteSection,
  deleteLabel,
}: EuropassSectionTitleProps) {
  if (!title) return null;
  const showActions = isInteractive && (Boolean(onAddEntry) || Boolean(onDeleteSection));
  return (
    <div className={styles.sectionHeadingRow}>
      <div className={styles.sectionTitleBar}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {showActions && (
          <div
            className={styles.sectionHeaderActions}
            data-html2canvas-ignore="true"
            data-pdf-ignore="true"
            data-no-print="true"
          >
            {onAddEntry && (
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
            {onDeleteSection && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSection();
                }}
                className={styles.deleteSectionBtn}
                title={deleteLabel || `Delete ${title} section`}
                data-html2canvas-ignore="true"
                data-pdf-ignore="true"
                data-no-print="true"
                aria-label={deleteLabel || `Delete ${title} section`}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
      <div className={styles.sectionDivider} />
    </div>
  );
}
