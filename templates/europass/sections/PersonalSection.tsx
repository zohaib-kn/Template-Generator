import type { PersonalDetails } from "@/types";
import styles from "../europass.module.css";

interface PersonalSectionProps {
  personal: PersonalDetails | undefined;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Personal information table in the main area (passport, nationality, DOB, etc.)
 * Only rows with actual values are rendered.
 */
export function PersonalSection({ personal }: PersonalSectionProps) {
  const p = personal ?? {};

  const rows: { label: string; value?: string }[] = [
    { label: "Passport No.", value: p.passportNumber },
    { label: "Nationality", value: p.nationality },
    { label: "Date of Birth", value: formatDate(p.dateOfBirth) },
    { label: "Place of Birth", value: p.placeOfBirth },
    { label: "Gender", value: p.gender },
    { label: "Phone", value: p.phone },
    { label: "Email", value: p.email },
    { label: "Address", value: p.address },
  ].filter((r) => Boolean(r.value));

  if (rows.length === 0) return null;

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitleText}>Personal Information</div>
      <div className={styles.personalGrid} style={{ marginTop: "8px" }}>
        {rows.map(({ label, value }) => (
          <>
            <span key={`lbl-${label}`} className={styles.personalLabel}>{label}</span>
            <span key={`val-${label}`} className={styles.personalValue}>{value}</span>
          </>
        ))}
      </div>
    </div>
  );
}
