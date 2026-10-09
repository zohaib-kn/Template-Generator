"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export function LanguagesForm() {
  const { data, setMotherTongue } = useDocumentState();

  // If data.motherTongue is set, use it. Otherwise, fallback to any existing "native" language entry if migrating.
  const currentMotherTongue =
    data.motherTongue ??
    data.languages?.find(
      (l) =>
        l.level?.toLowerCase().includes("native") ||
        l.level?.toLowerCase().includes("mother")
    )?.language ??
    "";

  return (
    <div className="space-y-4 pt-2">
      <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3">
        <div>
          <Label htmlFor="mother-tongue" className="text-xs font-semibold text-slate-800">
            Mother Tongue(s)
          </Label>
          <Input
            id="mother-tongue"
            value={currentMotherTongue}
            onChange={(e) => setMotherTongue(e.target.value)}
            placeholder="e.g. Hindi, Punjabi"
            className="mt-1 bg-white"
          />
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Specify the candidate&apos;s native language(s). English proficiency, IELTS band scores, and test details are managed in{" "}
          <strong className="text-slate-700 font-medium">Section 12 (English Certificate / IELTS)</strong>.
        </p>
      </div>
    </div>
  );
}
