import styles from "./europass.module.css";

/**
 * Renders the authoritative light-blue (#82acd9) corner decorations
 * with 45-degree miter seams matching the Cairo-generated Europass PDF.
 * Positioned absolute, sits behind the content, repeats on each physical page.
 */
export function EuropassPageDecoration() {
  return (
    <>
      {/* Top 6mm horizontal bar + left/right 24mm ears */}
      <div className={styles.decorationTopBar} aria-hidden="true" />
      <div className={styles.decorationTopLeftEar} aria-hidden="true" />
      <div className={styles.decorationTopRightEar} aria-hidden="true" />

      {/* Bottom 6mm horizontal bar + left/right 24mm ears */}
      <div className={styles.decorationBottomBar} aria-hidden="true" />
      <div className={styles.decorationBottomLeftEar} aria-hidden="true" />
      <div className={styles.decorationBottomRightEar} aria-hidden="true" />

      {/* 45-degree corner miter seams matching authentic Europass layout */}
      <svg
        className={styles.decorationCornerSeams}
        aria-hidden="true"
        viewBox="0 0 210 297"
        preserveAspectRatio="none"
      >
        {/* Top-left miter seam */}
        <line x1="0" y1="0" x2="6" y2="6" stroke="#ffffff" strokeWidth="0.35" strokeOpacity="0.8" />
        {/* Top-right miter seam */}
        <line x1="210" y1="0" x2="204" y2="6" stroke="#ffffff" strokeWidth="0.35" strokeOpacity="0.8" />
        {/* Bottom-left miter seam */}
        <line x1="0" y1="297" x2="6" y2="291" stroke="#ffffff" strokeWidth="0.35" strokeOpacity="0.8" />
        {/* Bottom-right miter seam */}
        <line x1="210" y1="297" x2="204" y2="291" stroke="#ffffff" strokeWidth="0.35" strokeOpacity="0.8" />
      </svg>
    </>
  );
}
