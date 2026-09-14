import styles from "./europass.module.css";

/**
 * Renders the authoritative light-blue (#82acd9) corner decorations
 * and top/bottom borders matching the Cairo-generated Europass PDF.
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
    </>
  );
}
