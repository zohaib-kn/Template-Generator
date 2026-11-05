import type { ReactNode } from "react";
import styles from "./europass.module.css";
import { EuropassPageDecoration } from "./EuropassPageDecoration";

interface EuropassPageProps {
  pageNumber: number;
  totalPages?: number;
  isInteractive?: boolean;
  children: ReactNode;
}

/**
 * A single physical A4 page container (210mm × 297mm).
 * Renders its own isolated page decoration and white paper surface.
 */
export function EuropassPage({
  pageNumber,
  totalPages,
  isInteractive = false,
  children,
}: EuropassPageProps) {
  return (
    <article
      className={`${styles.page} ${isInteractive ? styles.pageInteractive : ""}`}
      data-page-number={pageNumber}
      data-pdf-page="true"
      data-interactive={isInteractive ? "true" : undefined}
      aria-label={`Document Page ${pageNumber}`}
    >
      <EuropassPageDecoration />
      <div className={styles.pageContent}>{children}</div>
      {totalPages && totalPages > 1 && (
        <div className={styles.pageNumberFooter} aria-hidden="true">
          Page {pageNumber} / {totalPages}
        </div>
      )}
    </article>
  );
}
