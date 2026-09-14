import type { ReactNode } from "react";
import styles from "./europass.module.css";
import { EuropassPageDecoration } from "./EuropassPageDecoration";

interface EuropassPageProps {
  pageNumber: number;
  children: ReactNode;
}

/**
 * A single physical A4 page container (210mm × 297mm).
 * Renders its own isolated page decoration and white paper surface.
 */
export function EuropassPage({ pageNumber, children }: EuropassPageProps) {
  return (
    <article
      className={styles.page}
      data-page-number={pageNumber}
      aria-label={`Document Page ${pageNumber}`}
    >
      <EuropassPageDecoration />
      <div className={styles.pageContent}>{children}</div>
    </article>
  );
}
