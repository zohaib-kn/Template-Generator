"use client";

import { useRef, type ChangeEvent } from "react";
import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export function PersonalDetailsForm() {
  const { data, setPersonal } = useDocumentState();
  const personal = data.personal ?? {};
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert uploaded file → base64 data URI stored in personal.photoUrl
  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const url = evt.target?.result as string;
      setPersonal({ photoUrl: url });
    };
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    setPersonal({ photoUrl: undefined });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Photo upload */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-20 h-20 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center cursor-pointer hover:border-navy/50 transition-colors"
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
            <span className="text-2xl" aria-hidden="true">👤</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-medium text-navy hover:underline"
          >
            {personal.photoUrl ? "Change photo" : "Upload photo"}
          </button>
          {personal.photoUrl && (
            <button
              type="button"
              onClick={clearPhoto}
              className="text-xs font-medium text-red-400 hover:underline"
            >
              Remove
            </button>
          )}
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
        <Label htmlFor="pd-fullName" required>Full Name</Label>
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
          <Label htmlFor="pd-passport">Passport No.</Label>
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
          <Label htmlFor="pd-dob">Date of Birth</Label>
          <Input
            id="pd-dob"
            type="date"
            value={personal.dateOfBirth ?? ""}
            onChange={(e) => setPersonal({ dateOfBirth: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="pd-pob">Place of Birth</Label>
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
          <Label htmlFor="pd-phone">Phone</Label>
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
        <Label htmlFor="pd-email">Email</Label>
        <Input
          id="pd-email"
          type="email"
          value={personal.email ?? ""}
          onChange={(e) => setPersonal({ email: e.target.value })}
          placeholder="john@example.com"
        />
      </div>

      <div>
        <Label htmlFor="pd-address">Home Address</Label>
        <Input
          id="pd-address"
          value={personal.address ?? ""}
          onChange={(e) => setPersonal({ address: e.target.value })}
          placeholder="123 Main Street, London, UK"
        />
      </div>
    </div>
  );
}
