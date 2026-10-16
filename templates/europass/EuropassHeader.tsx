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

function formatUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
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
  const hasPortfolio = Boolean(personal.portfolioUrl && personal.portfolioUrl.trim().length > 0);

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
                  {(isInteractive || personal.dateOfBirth) && (
                    <span className={styles.identityItem}>
                      <span className={styles.identityLabel}>Date of birth:</span>{" "}
                      {isInteractive && onUpdatePersonal ? (
                        <EditableText
                          value={formatDateDMY(personal.dateOfBirth)}
                          onChange={(v) => onUpdatePersonal({ dateOfBirth: v })}
                          isInteractive={isInteractive}
                          className={styles.identityValue}
                          placeholder="DD/MM/YYYY"
                        />
                      ) : (
                        <span className={styles.identityValue}>
                          {formatDateDMY(personal.dateOfBirth)}
                        </span>
                      )}
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
                  <span className={styles.identityTextGroup}>
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
                  </span>
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
                  <span className={styles.identityTextGroup}>
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
                  </span>
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
                  <span className={styles.identityTextGroup}>
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
                  </span>
                </div>
              )}

              {/* Row 6: Portfolio link (with icon) */}
              {hasPortfolio && (
                <div className={styles.identityIconRow}>
                  <span className={styles.iconBox} aria-hidden="true">
                    <svg
                      className={styles.identityIcon}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 00-1.38-3.56c1.84.63 3.37 1.9 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.66-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" />
                    </svg>
                  </span>
                  <span className={styles.identityTextGroup}>
                    <span className={styles.identityLabel}>Portfolio:</span>{" "}
                    {isInteractive && onUpdatePersonal ? (
                      <EditableText
                        value={personal.portfolioUrl ?? ""}
                        href={formatUrl(personal.portfolioUrl)}
                        onChange={(v) => onUpdatePersonal({ portfolioUrl: v })}
                        isInteractive={isInteractive}
                        className={styles.blueLink}
                        placeholder="https://portfolio.com"
                        as="a"
                      />
                    ) : (
                      <a
                        href={formatUrl(personal.portfolioUrl)}
                        data-pdf-link={formatUrl(personal.portfolioUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.blueLink}
                        aria-label={`Student portfolio: ${personal.portfolioUrl}`}
                      >
                        {personal.portfolioUrl}
                      </a>
                    )}
                  </span>
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
