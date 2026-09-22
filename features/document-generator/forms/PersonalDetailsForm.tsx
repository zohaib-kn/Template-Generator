"use client";

import { useRef, useState, useEffect, type ChangeEvent } from "react";
import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PhotoCropModal } from "../photo/PhotoCropModal";

export function PersonalDetailsForm() {
  const { data, setPersonal } = useDocumentState();
  const personal = data.personal ?? {};
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Photo-crop state ──────────────────────────────────────────────────────
  /** The raw HTMLImageElement loaded from the user's selected file. */
  const [pendingImg, setPendingImg] = useState<HTMLImageElement | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  // Clean up the object URL when it's no longer needed
  const pendingObjUrl = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      // Revoke on unmount
      if (pendingObjUrl.current) {
        URL.revokeObjectURL(pendingObjUrl.current);
      }
    };
  }, []);

  // ── File select handler ───────────────────────────────────────────────────

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clean up any previous pending object URL
    if (pendingObjUrl.current) {
      URL.revokeObjectURL(pendingObjUrl.current);
      pendingObjUrl.current = null;
    }

    const objUrl = URL.createObjectURL(file);
    pendingObjUrl.current = objUrl;

    const img = new Image();
    img.onload = () => {
      setPendingImg(img);
      setCropOpen(true);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      pendingObjUrl.current = null;
    };
    img.src = objUrl;

    // Reset file input so the same file can be re-selected
    e.target.value = "";
  }

  // ── Modal callbacks ───────────────────────────────────────────────────────

  function handleCropApply(dataUri: string) {
    setPersonal({ photoUrl: dataUri });
    setCropOpen(false);
    // Clean up object URL — the data-URI is now stored in state
    if (pendingObjUrl.current) {
      URL.revokeObjectURL(pendingObjUrl.current);
      pendingObjUrl.current = null;
    }
    setPendingImg(null);
  }

  function handleCropCancel() {
    setCropOpen(false);
    // Don't change personal.photoUrl — keep existing photo
    if (pendingObjUrl.current) {
      URL.revokeObjectURL(pendingObjUrl.current);
      pendingObjUrl.current = null;
    }
    setPendingImg(null);
  }

  function clearPhoto() {
    setPersonal({ photoUrl: undefined });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Crop modal (portal-like, rendered at component root) ─────────── */}
      {cropOpen && pendingImg && (
        <PhotoCropModal
          imgEl={pendingImg}
          onApply={handleCropApply}
          onCancel={handleCropCancel}
        />
      )}

      <div className="space-y-4 pt-2">
        {/* Photo upload - Sleek compact horizontal card */}
        <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
          <div
            className="w-12 h-12 rounded-full bg-white border border-slate-300 shadow-2xs overflow-hidden flex items-center justify-center cursor-pointer hover:border-slate-400 transition-colors flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload profile photo"
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            {personal.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={personal.photoUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg opacity-60" aria-hidden="true">👤</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800">
              Europass Profile Photo
            </p>
            <div className="flex items-center gap-2 mt-0.5 text-xs">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-slate-900 hover:underline cursor-pointer"
              >
                {personal.photoUrl ? "Change photo" : "Upload photo"}
              </button>
              {personal.photoUrl && (
                <>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Reposition
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
            aria-label="Profile photo file input"
          />
        </div>

        {/* Name */}
        <div>
          <Label htmlFor="pd-fullName" required>Full name</Label>
          <Input
            id="pd-fullName"
            value={personal.fullName ?? ""}
            onChange={(e) => setPersonal({ fullName: e.target.value })}
            placeholder="e.g. John Smith"
          />
        </div>

        {/* Two-column row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pd-passport">Passport number</Label>
            <Input
              id="pd-passport"
              value={personal.passportNumber ?? ""}
              onChange={(e) => setPersonal({ passportNumber: e.target.value })}
              placeholder="e.g. AB1234567"
            />
          </div>
          <div>
            <Label htmlFor="pd-nationality">Nationality</Label>
            <Input
              id="pd-nationality"
              value={personal.nationality ?? ""}
              onChange={(e) => setPersonal({ nationality: e.target.value })}
              placeholder="e.g. British"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pd-dob">Date of birth</Label>
            <Input
              id="pd-dob"
              type="date"
              value={personal.dateOfBirth ?? ""}
              onChange={(e) => setPersonal({ dateOfBirth: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="pd-pob">Place of birth</Label>
            <Input
              id="pd-pob"
              value={personal.placeOfBirth ?? ""}
              onChange={(e) => setPersonal({ placeOfBirth: e.target.value })}
              placeholder="e.g. London"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pd-gender">Gender</Label>
            <Input
              id="pd-gender"
              value={personal.gender ?? ""}
              onChange={(e) => setPersonal({ gender: e.target.value })}
              placeholder="e.g. Male / Female"
            />
          </div>
          <div>
            <Label htmlFor="pd-phone">Phone number</Label>
            <Input
              id="pd-phone"
              type="tel"
              value={personal.phone ?? ""}
              onChange={(e) => setPersonal({ phone: e.target.value })}
              placeholder="+44 7000 000000"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="pd-email">Email address</Label>
          <Input
            id="pd-email"
            type="email"
            value={personal.email ?? ""}
            onChange={(e) => setPersonal({ email: e.target.value })}
            placeholder="john@example.com"
          />
        </div>

        <div>
          <Label htmlFor="pd-address">Home address</Label>
          <Input
            id="pd-address"
            value={personal.address ?? ""}
            onChange={(e) => setPersonal({ address: e.target.value })}
            placeholder="123 Main Street, London, UK"
          />
        </div>
      </div>
    </>
  );
}
