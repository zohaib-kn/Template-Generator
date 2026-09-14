import type { PersonalDetails } from "@/types";
import styles from "./europass.module.css";

interface EuropassHeaderProps {
  personal?: PersonalDetails;
}

function formatDateDMY(iso?: string): string {
  if (!iso) return "";
  if (iso.includes("/")) return iso;
  const parts = iso.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return iso;
}

export function EuropassHeader({ personal }: EuropassHeaderProps) {
  if (!personal) return null;

  const hasIdentityLine1 =
    personal.passportNumber || personal.nationality || personal.dateOfBirth;
  const hasIdentityLine2 = personal.placeOfBirth || personal.gender;
  const hasIdentityLine3 = personal.phone || personal.email;
  const hasIdentityLine4 = Boolean(personal.address);

  return (
    <header className={styles.headerContainer}>
      {/* ── Europass Logo at the Top Right ────────────────────────────────── */}
      <div className={styles.logoWrapper}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/europass-logo.png"
          alt="Europass logo"
          className={styles.europassLogo}
        />
      </div>

      {/* ── Main Header Row: Photo on Left, Name & Details on Right ────────── */}
      <div className={styles.headerBody}>
        <div className={styles.photoWrapper}>
          {personal.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={personal.photoUrl}
              alt={personal.fullName ? `${personal.fullName}'s portrait` : "Profile"}
              className={styles.profilePhoto}
            />
          ) : (
            <span className={styles.photoPlaceholder} aria-hidden="true">
              👤
            </span>
          )}
        </div>

        {/* ── Unified Identity Block (Name directly above Personal Details) ─── */}
        <div className={styles.identityBlock}>
          {personal.fullName && (
            <h1 className={styles.subjectName}>{personal.fullName}</h1>
          )}

          <div className={styles.identityLines}>
          {/* Row 1: Passport, Nationality, Date of birth */}
          {hasIdentityLine1 && (
            <div className={styles.identityRow}>
              {personal.passportNumber && (
                <span className={styles.identityItem}>
                  <span className={styles.identityLabel}>Passport:</span>{" "}
                  <span className={styles.identityValue}>
                    {personal.passportNumber}
                  </span>
                </span>
              )}
              {personal.nationality && (
                <span className={styles.identityItem}>
                  <span className={styles.identityLabel}>Nationality:</span>{" "}
                  <span className={styles.identityValue}>
                    {personal.nationality}
                  </span>
                </span>
              )}
              {personal.dateOfBirth && (
                <span className={styles.identityItem}>
                  <span className={styles.identityLabel}>Date of birth:</span>{" "}
                  <span className={styles.identityValue}>
                    {formatDateDMY(personal.dateOfBirth)}
                  </span>
                </span>
              )}
            </div>
          )}

          {/* Row 2: Place of birth, Gender */}
          {hasIdentityLine2 && (
            <div className={styles.identityRow}>
              {personal.placeOfBirth && (
                <span className={styles.identityItem}>
                  <span className={styles.identityLabel}>Place of birth:</span>{" "}
                  <span className={styles.identityValue}>
                    {personal.placeOfBirth}
                  </span>
                </span>
              )}
              {personal.gender && (
                <span className={styles.identityItem}>
                  <span className={styles.identityLabel}>Gender:</span>{" "}
                  <span className={styles.identityValue}>{personal.gender}</span>
                </span>
              )}
            </div>
          )}

          {/* Row 3: Phone number, Email address */}
          {hasIdentityLine3 && (
            <div className={styles.identityRow}>
              {personal.phone && (
                <span className={styles.identityItem}>
                  <svg
                    className={styles.identityIcon}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                  <span className={styles.identityLabel}>Phone number:</span>{" "}
                  <span className={styles.identityValue}>{personal.phone}</span>
                </span>
              )}
              {personal.email && (
                <span className={styles.identityItem}>
                  <svg
                    className={styles.identityIcon}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                  <span className={styles.identityLabel}>Email address:</span>{" "}
                  <a
                    href={`mailto:${personal.email}`}
                    className={styles.blueLink}
                  >
                    {personal.email}
                  </a>
                </span>
              )}
            </div>
          )}

          {/* Row 4: Home Address */}
          {hasIdentityLine4 && (
            <div className={styles.identityRow}>
              <span className={styles.identityItem}>
                <svg
                  className={styles.identityIcon}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <span className={styles.identityLabel}>Home:</span>{" "}
                <span className={styles.identityValue}>{personal.address}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  </header>
);
}
