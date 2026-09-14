"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";

export function AboutMeForm() {
  const { data, setAboutMe } = useDocumentState();

  return (
    <div className="space-y-3 pt-2">
      <Label htmlFor="about-me-text">
        Brief introduction about yourself
      </Label>
      <Textarea
        id="about-me-text"
        rows={6}
        value={data.aboutMe ?? ""}
        onChange={(e) => setAboutMe(e.target.value)}
        placeholder="Write a short paragraph about your background, goals, and what makes you stand out…"
      />
      <p className="text-[11px] text-slate-400 text-right">
        {(data.aboutMe ?? "").length} chars
      </p>
    </div>
  );
}
