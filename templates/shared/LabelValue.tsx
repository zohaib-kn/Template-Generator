interface LabelValueProps {
  label: string;
  value?: string;
}

/**
 * Renders a "Label: value" row used in personal info tables and
 * sidebar contact blocks inside document templates.
 */
export function LabelValue({ label, value }: LabelValueProps) {
  if (!value) return null;
  return (
    <div style={{ display: "contents" }}>
      <span
        style={{
          fontFamily: "inherit",
          fontSize: "9px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#777",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "inherit",
          fontSize: "10px",
          color: "#1a1a1a",
        }}
      >
        {value}
      </span>
    </div>
  );
}
