import { memo, useState, useEffect, useRef } from "react";
import type { PersonalDetails } from "@/types";
import styles from "./europass.module.css";
import { EditableText } from "@/features/document-generator/components/inline/EditableText";
import { PhotoRepositionModal } from "@/features/document-generator/components/PhotoRepositionModal";
import { DEFAULT_PHOTO_CROP } from "@/features/document-generator/utils/photoCrop";
import { cleanWebsiteUrl } from "@/features/document-generator/utils/linkUtils";

interface EuropassHeaderProps {
  personal?: PersonalDetails;
  isInteractive?: boolean;
  onUpdatePersonal?: (patch: Partial<PersonalDetails>) => void;
}

function formatPhone(phone?: string): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  if (trimmed.startsWith("(+")) return trimmed;
  if (trimmed.startsWith("+91")) {
    const rest = trimmed.slice(3).trim();
    return `(+91) ${rest}`;
  }
  const match = trimmed.match(/^(\+\d{1,4})\s*(.*)/);
  if (match) {
    return `(${match[1]}) ${match[2]}`.trim();
  }
  return trimmed;
}

function formatGender(gender?: string): string {
  if (!gender) return "";
  const trimmed = gender.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
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
  const cleaned = cleanWebsiteUrl(url);
  if (!cleaned) return undefined;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned}`;
}

function formatAddress(address?: string): string {
  if (!address) return "";
  const cleaned = address
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  const dedupedParts: string[] = [];
  for (const p of parts) {
    if (!dedupedParts.some((existing) => existing.toLowerCase() === p.toLowerCase())) {
      if (/^[A-Z0-9\s\-_]+$/.test(p) && p.length > 2) {
        const tc = p
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        dedupedParts.push(tc);
      } else {
        dedupedParts.push(p);
      }
    }
  }
  return dedupedParts.join(", ");
}

function cleanDisplayName(name: string): string {
  if (!name) return "";
  const cleaned = name.replace(/\s*[-–—]\s*$/, "").trim();
  const words = cleaned.split(/\s+/);
  const deduped: string[] = [];
  for (const w of words) {
    if (deduped.length === 0 || deduped[deduped.length - 1].toLowerCase() !== w.toLowerCase()) {
      deduped.push(w);
    }
  }
  const result = deduped.join(" ");
  // If ALL CAPS, convert to Title Case for elegant Europass presentation
  if (/^[A-Z\s]+$/.test(result) && result.length > 3) {
    return result.split(/\s+/).map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
  }
  return result;
}

function resizeAndEncodeImage(file: File, maxDim = 600): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (!src) return resolve("");
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.92));
        } else {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

export const EuropassHeader = memo(function EuropassHeader({
  personal,
  isInteractive = false,
  onUpdatePersonal,
}: EuropassHeaderProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isRepositionOpen, setIsRepositionOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasImageError(false);
  }, [personal?.photoUrl]);

  if (!personal) return null;

  const processSelectedFile = async (file: File) => {
    if (!file || !onUpdatePersonal) return;
    if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|avif|gif)$/i.test(file.name)) {
      return;
    }
    const dataUrl = await resizeAndEncodeImage(file, 900);
    if (dataUrl) {
      setHasImageError(false);
      onUpdatePersonal({
        photoUrl: dataUrl,
        photoSourceUrl: dataUrl,
        photoCrop: DEFAULT_PHOTO_CROP,
      });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isInteractive || !onUpdatePersonal) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isInteractive || !onUpdatePersonal) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isInteractive || !onUpdatePersonal) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const rawName = personal.fullName || "";
  const displayName = cleanDisplayName(rawName) || rawName;

  const hasIdentityLine1 =
    isInteractive || personal.passportNumber || personal.nationality || personal.dateOfBirth;
  const hasIdentityLine2 = isInteractive || personal.placeOfBirth || personal.gender;
  const hasPhone = isInteractive || Boolean(personal.phone);
  const hasEmail = isInteractive || Boolean(personal.email);
  const hasAddress = isInteractive || Boolean(personal.address);
  const hasPortfolio = Boolean(personal.portfolioUrl && personal.portfolioUrl.trim().length > 0);
  const hasLinkedIn = Boolean(personal.linkedinUrl && personal.linkedinUrl.trim().length > 0);
  const hasGitHub = Boolean(personal.githubUrl && personal.githubUrl.trim().length > 0);
  const hasDrivingLicence = Boolean(personal.drivingLicence && personal.drivingLicence.trim().length > 0);

  return (
    <header className={styles.headerContainer}>
      <div className={styles.headerTopRow}>
        {/* ── Main Header Block: Photo on Left, Name & Details Adjacent ────────── */}
        <div className={styles.headerBody}>

          {/* ── Profile Photo with silver ring frame ─── */}
          <div
            className={styles.photoWrapper}
            style={{
              cursor: isInteractive && onUpdatePersonal ? "pointer" : "default",
              boxShadow: isDragOver ? "0 0 0 3px #096491" : undefined,
            }}
            onClick={(e) => {
              if (isInteractive && onUpdatePersonal) {
                e.stopPropagation();
                if (personal.photoUrl && !hasImageError) {
                  setIsRepositionOpen(true);
                } else {
                  photoInputRef.current?.click();
                }
              }
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            title={
              isInteractive && onUpdatePersonal
                ? personal.photoUrl && !hasImageError
                  ? "Click to adjust / reposition photo, or drag & drop a new image"
                  : "Click or drag & drop an image (.jpg / .png) to set profile photo"
                : undefined
            }
          >
            <div className={styles.photoInner}>
              {personal.photoUrl && !hasImageError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={personal.photoUrl}
                  alt={displayName ? `${displayName}'s portrait` : "Profile"}
                  className={styles.profilePhoto}
                  style={
                    personal.photoCrop && personal.photoUrl === personal.photoSourceUrl
                      ? {
                          objectPosition: `${personal.photoCrop.x}% ${personal.photoCrop.y}%`,
                          transform: `scale(${personal.photoCrop.zoom})`,
                          transformOrigin: `${personal.photoCrop.x}% ${personal.photoCrop.y}%`,
                        }
                      : undefined
                  }
                  onError={() => setHasImageError(true)}
                />
              ) : (
                <span className={styles.photoPlaceholder} aria-hidden="true">
                  👤
                </span>
              )}

              {/* Interactive Hover / Drag Overlay */}
              {isInteractive && onUpdatePersonal && (isHovered || isDragOver) && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    backgroundColor: "rgba(15, 23, 42, 0.65)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    textAlign: "center",
                    padding: "4px",
                    zIndex: 10,
                  }}
                  data-html2canvas-ignore="true"
                  data-pdf-ignore="true"
                  data-no-print="true"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span style={{ fontSize: "6.5pt", fontWeight: 700, marginTop: "2px", lineHeight: 1.1, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {isDragOver ? "Drop" : personal.photoUrl && !hasImageError ? "Adjust" : "Upload"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Hidden File Input placed outside photoWrapper to avoid recursive bubbling */}
          {isInteractive && onUpdatePersonal && (
            <input
              type="file"
              ref={photoInputRef}
              onChange={handlePhotoUpload}
              onClick={(e) => e.stopPropagation()}
              accept="image/*,.jpg,.jpeg,.png,.webp,.avif"
              style={{ display: "none" }}
              aria-label="Upload profile photo"
            />
          )}

          {isInteractive && onUpdatePersonal && isRepositionOpen && (personal.photoSourceUrl || personal.photoUrl) && (
            <PhotoRepositionModal
              isOpen={isRepositionOpen}
              sourceUrl={personal.photoSourceUrl || personal.photoUrl || ""}
              initialCrop={personal.photoCrop ?? DEFAULT_PHOTO_CROP}
              onSave={({ photoUrl, photoSourceUrl, photoCrop }) => {
                setHasImageError(false);
                onUpdatePersonal({ photoUrl, photoSourceUrl, photoCrop });
                setIsRepositionOpen(false);
              }}
              onRemove={() => {
                setHasImageError(false);
                onUpdatePersonal({
                  photoUrl: "",
                  photoSourceUrl: "",
                  photoCrop: undefined,
                });
                setIsRepositionOpen(false);
              }}
              onClose={() => setIsRepositionOpen(false)}
            />
          )}

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
                          value={formatGender(personal.gender)}
                          onChange={(v) => onUpdatePersonal({ gender: v })}
                          isInteractive={isInteractive}
                          className={styles.identityValue}
                          placeholder="Gender"
                        />
                      ) : (
                        <span className={styles.identityValue}>{formatGender(personal.gender)}</span>
                      )}
                    </span>
                  )}
                </div>
              )}

              {/* Row 3: Phone number & Email address (combined inline matching official Europass) */}
              {(hasPhone || hasEmail) && (
                <div className={styles.identityContactCombinedRow}>
                  {hasPhone && (
                    <div className={styles.identityContactItem}>
                      <span className={styles.contactIconBox} aria-hidden="true">
                        <svg
                          className={styles.contactIconGlyph}
                          viewBox="0 0 576 512"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          {/* FontAwesome solid house glyph — the official Europass layout uses a house icon on the phone row */}
                          <path d="M280.37 148.26L96 300.11V464a16 16 0 0 0 16 16l112.06-.29a16 16 0 0 0 15.92-16V368a16 16 0 0 1 16-16h64a16 16 0 0 1 16 16v95.64a16 16 0 0 0 16 16.05L464 480a16 16 0 0 0 16-16V300L295.67 148.26a12.19 12.19 0 0 0-15.3 0zM571.6 251.47L488 182.56V44.05a12 12 0 0 0-12-12h-56a12 12 0 0 0-12 12v72.61L318.47 43a48 48 0 0 0-61 0L4.34 251.47a12 12 0 0 0-1.6 16.9l25.5 31A12 12 0 0 0 45.15 301l235.22-193.74a12.19 12.19 0 0 1 15.3 0L530.9 301a12 12 0 0 0 16.9-1.6l25.5-31a12 12 0 0 0-1.7-16.93z" />
                        </svg>
                      </span>
                      <span className={styles.identityLabel}>Phone number:</span>{" "}
                      {isInteractive && onUpdatePersonal ? (
                        <EditableText
                          value={personal.phone ? formatPhone(personal.phone) : ""}
                          onChange={(v) => onUpdatePersonal({ phone: v })}
                          isInteractive={isInteractive}
                          className={styles.identityValueNoWrap}
                          placeholder="Phone number"
                        />
                      ) : (
                        <span className={styles.identityValueNoWrap}>{formatPhone(personal.phone)}</span>
                      )}
                    </div>
                  )}

                  {hasEmail && (
                    <div className={styles.identityContactItem}>
                      <span className={styles.contactIconBox} aria-hidden="true">
                        <svg
                          className={styles.contactIconGlyph}
                          viewBox="0 0 512 512"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          {/* Official Europass FontAwesome solid envelope glyph */}
                          <path d="M502.3 190.8c3.9-3.1 9.7-.2 9.7 4.7V400c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V195.6c0-5 5.7-7.8 9.7-4.7 22.4 17.4 52.1 39.5 154.1 113.6 21.1 15.4 56.7 47.8 92.2 47.6 35.7.3 72-32.8 92.3-47.6 102-74.1 131.6-96.3 154-113.7zM256 320c23.2.4 56.6-29.2 73.4-41.4 132.7-96.3 142.8-104.7 173.4-128.7 5.8-4.5 9.2-11.5 9.2-18.9v-19c0-26.5-21.5-48-48-48H48C21.5 64 0 85.5 0 112v19c0 7.4 3.4 14.3 9.2 18.9 30.6 23.9 40.7 32.4 173.4 128.7 16.8 12.2 50.2 41.8 73.4 41.4z" />
                        </svg>
                      </span>
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
                  )}
                </div>
              )}

              {/* Row 4: Home address (with icon) */}
              {hasAddress && (
                <div className={styles.identityContactItem}>
                  <span className={styles.contactIconBox} aria-hidden="true">
                    <svg
                      className={styles.contactIconGlyph}
                      viewBox="0 0 384 512"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      {/* Official Europass FontAwesome solid map pin glyph */}
                      <path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z" />
                    </svg>
                  </span>
                  <span className={styles.identityLabel}>Home:</span>{" "}
                  {isInteractive && onUpdatePersonal ? (
                    <EditableText
                      value={personal.address ? formatAddress(personal.address) : ""}
                      onChange={(v) => onUpdatePersonal({ address: v })}
                      isInteractive={isInteractive}
                      className={styles.identityValue}
                      placeholder="Home address"
                    />
                  ) : (
                    <span className={styles.identityValue}>{formatAddress(personal.address)}</span>
                  )}
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

              {/* Row 7: LinkedIn profile (with icon) */}
              {hasLinkedIn && (
                <div className={styles.identityIconRow}>
                  <span className={styles.iconBox} aria-hidden="true">
                    <svg className={styles.identityIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.45 1.45 0 0 0 1.45-1.45 1.45 1.45 0 0 0-1.45-1.45 1.45 1.45 0 0 0-1.45 1.45c0 .8.65 1.45 1.45 1.45m1.39 9.74v-8.37H5.07v8.37h2.78z" />
                    </svg>
                  </span>
                  <span className={styles.identityTextGroup}>
                    <span className={styles.identityLabel}>LinkedIn:</span>{" "}
                    {isInteractive && onUpdatePersonal ? (
                      <EditableText
                        value={personal.linkedinUrl ?? ""}
                        href={formatUrl(personal.linkedinUrl)}
                        onChange={(v) => onUpdatePersonal({ linkedinUrl: v })}
                        isInteractive={isInteractive}
                        className={styles.blueLink}
                        placeholder="https://linkedin.com/in/username"
                        as="a"
                      />
                    ) : (
                      <a
                        href={formatUrl(personal.linkedinUrl)}
                        data-pdf-link={formatUrl(personal.linkedinUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.blueLink}
                      >
                        {personal.linkedinUrl}
                      </a>
                    )}
                  </span>
                </div>
              )}

              {/* Row 8: GitHub profile (with icon) */}
              {hasGitHub && (
                <div className={styles.identityIconRow}>
                  <span className={styles.iconBox} aria-hidden="true">
                    <svg className={styles.identityIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  </span>
                  <span className={styles.identityTextGroup}>
                    <span className={styles.identityLabel}>GitHub:</span>{" "}
                    {isInteractive && onUpdatePersonal ? (
                      <EditableText
                        value={personal.githubUrl ?? ""}
                        href={formatUrl(personal.githubUrl)}
                        onChange={(v) => onUpdatePersonal({ githubUrl: v })}
                        isInteractive={isInteractive}
                        className={styles.blueLink}
                        placeholder="https://github.com/username"
                        as="a"
                      />
                    ) : (
                      <a
                        href={formatUrl(personal.githubUrl)}
                        data-pdf-link={formatUrl(personal.githubUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.blueLink}
                      >
                        {personal.githubUrl}
                      </a>
                    )}
                  </span>
                </div>
              )}

              {/* Row 9: Driving licence (with icon) */}
              {hasDrivingLicence && (
                <div className={styles.identityIconRow}>
                  <span className={styles.iconBox} aria-hidden="true">
                    <svg className={styles.identityIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z" />
                      <circle cx="7.5" cy="14.5" r="1.5" />
                      <circle cx="16.5" cy="14.5" r="1.5" />
                    </svg>
                  </span>
                  <span className={styles.identityTextGroup}>
                    <span className={styles.identityLabel}>Driving licence:</span>{" "}
                    {isInteractive && onUpdatePersonal ? (
                      <EditableText
                        value={personal.drivingLicence ?? ""}
                        onChange={(v) => onUpdatePersonal({ drivingLicence: v })}
                        isInteractive={isInteractive}
                        className={styles.identityValue}
                        placeholder="e.g. B, A1"
                      />
                    ) : (
                      <span className={styles.identityValue}>{personal.drivingLicence}</span>
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