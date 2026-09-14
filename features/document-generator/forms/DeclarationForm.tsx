"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";

export function DeclarationForm() {
  const { data, setDeclaration } = useDocumentState();

  return (
    <div className="space-y-3 pt-2">
      <Label htmlFor="declaration-text">Declaration statement</Label>
      <Textarea
        id="declaration-text"
        rows={5}
        value={data.declaration ?? ""}
        onChange={(e) => setDeclaration(e.target.value)}
        placeholder="I hereby declare that all the information provided above is true and accurate to the best of my knowledge…"
      />
    </div>
  );
}
