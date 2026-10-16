import { memo } from "react";
import type { PersonalDetails } from "@/types";
import styles from "./europass.module.css";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";

interface EuropassHeaderProps {
  personal?: PersonalDetails;
  isInteractive?: boolean;
  onUpdatePersonal?: (patch: Partial<PersonalDetails>) => void;
}

function formatPhone(phone?: string): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  if (trimmed.startsWith("(+")) return trimmed;
  const match = trimmed.match(/^(\+\d{1,3})\s*(.*)/);
  if (match) {
    return `(${match[1]}) ${match[2]}`.trim();
  }
  return trimmed;
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

export const EuropassHeader = memo(function EuropassHeader({
  personal,
  isInteractive = false,
  onUpdatePersonal,
}: EuropassHeaderProps) {
  if (!personal) return null;

  const rawName = personal.fullName || "";
  const displayName = rawName.replace(/\s*[-–—]\s*$/, "").trim() || rawName;

  const hasIdentityLine1 =
    isInteractive || personal.passportNumber || personal.nationality || personal.dateOfBirth;
  const hasIdentityLine2 = isInteractive || personal.placeOfBirth || personal.gender;
  const hasPhone = isInteractive || Boolean(personal.phone);
  const hasEmail = isInteractive || Boolean(personal.email);
  const hasAddress = isInteractive || Boolean(personal.address);

  return (
    <header className={styles.headerContainer}>
      <div className={styles.headerTopRow}>
        {/* ── Main Header Block: Photo on Left, Name & Details Adjacent ────────── */}
        <div className={styles.headerBody}>

          {/* ── Profile Photo with silver ring frame ─── */}
          <div className={styles.photoWrapper}>
            <div className={styles.photoInner}>
              {personal.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={personal.photoUrl}
                  alt={displayName ? `${displayName}'s portrait` : "Profile"}
                  className={styles.profilePhoto}
                />
              ) : (
                <span className={styles.photoPlaceholder} aria-hidden="true">
                  👤
                </span>
              )}
            </div>
          </div>

          {/* ── Identity Block: Name + Personal Details ─── */}
          <div className={styles.identityBlock}>
            {isInteractive && onUpdatePersonal ? (
              <EditableText
                value={displayName}
                onChange={(v) => onUpdatePersonal({ fullName: v })}
                isInteractive={isInteractive}
                className={styles.subjectName}
                placeholder="Full Name"
                as="h1"
              />
            ) : (
              displayName && (
                <h1 className={styles.subjectName}>{displayName}</h1>
              )
            )}

            <div className={styles.identityLines}>

              {/* Row 1: Passport · Nationality · Date of birth */}
              {hasIdentityLine1 && (
                <div className={styles.identityRow}>
                  {(isInteractive || personal.passportNumber) && (
                    <span className={styles.identityItem}>
                      <span className={styles.identityLabel}>Passport:</span>{" "}
                      {isInteractive && onUpdatePersonal ? (
                        <EditableText
                          value={personal.passportNumber ?? ""}
                          onChange={(v) => onUpdatePersonal({ passportNumber: v })}
                          isInteractive={isInteractive}
                          className={styles.identityValue}
                          placeholder="Passport No."
                        />
                      ) : (
                        <span className={styles.identityValue}>
                          {personal.passportNumber}
                        </span>
                      )}
                    </span>
                  )}
                  {(isInteractive || personal.nationality) && (
                    <span className={styles.identityItem}>
                      <span className={styles.identityLabel}>Nationality:</span>{" "}
                      {isInteractive && onUpdatePersonal ? (
                        <EditableText
                          value={personal.nationality ?? ""}
                          onChange={(v) => onUpdatePersonal({ nationality: v })}
                          isInteractive={isInteractive}
                          className={styles.identityValue}
                          placeholder="Nationality"
                        />
                      ) : (
                        <span className={styles.identityValue}>
                          {personal.nationality}
                        </span>
                      )}
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

              {/* Row 2: Place of birth · Gender */}
              {hasIdentityLine2 && (
                <div className={styles.identityRow}>
                  {(isInteractive || personal.placeOfBirth) && (
                    <span className={styles.identityItem}>
                      <span className={styles.identityLabel}>Place of birth:</span>{" "}
                      {isInteractive && onUpdatePersonal ? (
                        <EditableText
                          value={personal.placeOfBirth ?? ""}
                          onChange={(v) => onUpdatePersonal({ placeOfBirth: v })}
                          isInteractive={isInteractive}
                          className={styles.identityValue}
                          placeholder="City, Country"
                        />
                      ) : (
                        <span className={styles.identityValue}>
                          {personal.placeOfBirth}
                        </span>
                      )}
                    </span>
                  )}
                  {(isInteractive || personal.gender) && (
                    <span className={styles.identityItem}>
                      <span className={styles.identityLabel}>Gender:</span>{" "}
                      {isInteractive && onUpdatePersonal ? (
                        <EditableText
                          value={personal.gender ?? ""}
                          onChange={(v) => onUpdatePersonal({ gender: v })}
                          isInteractive={isInteractive}
                          className={styles.identityValue}
                          placeholder="Gender"
                        />
                      ) : (
                        <span className={styles.identityValue}>{personal.gender}</span>
                      )}
                    </span>
                  )}
                </div>
              )}

              {/* Row 3: Phone number (with icon) */}
              {hasPhone && (
                <div className={styles.identityIconRow}>
                  <span className={styles.iconBox} aria-hidden="true">
                    <svg
                      className={styles.identityIcon}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                  </span>
                  <div className={styles.identityTextGroup}>
                    <span className={styles.identityLabel}>Phone number:</span>{" "}
                    {isInteractive && onUpdatePersonal ? (
                      <EditableText
                        value={personal.phone ?? ""}
                        onChange={(v) => onUpdatePersonal({ phone: v })}
                        isInteractive={isInteractive}
                        className={styles.identityValueNoWrap}
                        placeholder="Phone number"
                      />
                    ) : (
                      <span className={styles.identityValueNoWrap}>{formatPhone(personal.phone)}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Row 4: Email address (with icon) */}
              {hasEmail && (
                <div className={styles.identityIconRow}>
                  <span className={styles.iconBox} aria-hidden="true">
                    <svg
                      className={styles.identityIcon}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                  </span>
                  <div className={styles.identityTextGroup}>
                    <span className={styles.identityLabel}>Email address:</span>{" "}
                    {isInteractive && onUpdatePersonal ? (
                      <EditableText
                        value={personal.email ?? ""}
                        href={personal.email ? `mailto:${personal.email}` : undefined}
                        onChange={(v) => onUpdatePersonal({ email: v })}
                        isInteractive={isInteractive}
                        className={styles.blueLink}
                        placeholder="Email address"
                        as="a"
                      />
                    ) : (
                      <a
                        href={`mailto:${personal.email}`}
                        data-pdf-link={`mailto:${personal.email}`}
                        className={styles.blueLink}
                        aria-label={`Send email to ${personal.email}`}
                      >
                        {personal.email}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Row 5: Home address (with icon) */}
              {hasAddress && (
                <div className={styles.identityIconRow}>
                  <span className={styles.iconBox} aria-hidden="true">
                    <svg
                      className={styles.identityIcon}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                  </span>
                  <div className={styles.identityTextGroup}>
                    <span className={styles.identityLabel}>Home:</span>{" "}
                    {isInteractive && onUpdatePersonal ? (
                      <EditableText
                        value={personal.address ?? ""}
                        onChange={(v) => onUpdatePersonal({ address: v })}
                        isInteractive={isInteractive}
                        className={styles.identityValue}
                        placeholder="Home address"
                      />
                    ) : (
                      <span className={styles.identityValue}>{personal.address}</span>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ── Europass Logo at Top Right ─────────────────────────────────────── */}
        <div className={styles.logoWrapper}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/europass-logo.png"
            alt="Europass logo"
            className={styles.europassLogo}
          />
        </div>
      </div>
    </header>
  );
});
