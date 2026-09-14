import type { ReactNode } from "react";

interface SectionTitleProps {
  children: ReactNode;
}

/**
 * Renders a section heading for use inside document templates.
 * Visual style is template-agnostic — each template overrides
 * via its own CSS module.
 */
export function SectionTitle({ children }: SectionTitleProps) {
  return (
    <div className="section-title-wrapper" style={{ marginBottom: "8px" }}>
      <h2
        style={{
          fontFamily: "inherit",
          fontSize: "10.5px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#1a2e4a",
          borderBottom: "2px solid #1a2e4a",
          paddingBottom: "3px",
          margin: 0,
        }}
      >
        {children}
      </h2>
    </div>
  );
}
