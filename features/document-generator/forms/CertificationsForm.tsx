"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntryCardHeader } from "./shared";

export function CertificationsForm() {
  const {
    data,
    addCertification,
    updateCertification,
    removeCertification,
  } = useDocumentState();
  const entries = data.certifications ?? [];

  return (
    <div className="space-y-3 pt-2">
      {entries.length === 0 && (
        <EmptyState message='No certifications yet. Click "Add Certification" below.' />
      )}

      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3"
        >
          <EntryCardHeader
            index={idx}
            onRemove={() => removeCertification(entry.id)}
          />

          <div>
            <Label htmlFor={`cert-name-${entry.id}`}>
              Certificate / Course Name
            </Label>
            <Input
              id={`cert-name-${entry.id}`}
              value={entry.name ?? ""}
              onChange={(e) =>
                updateCertification(entry.id, { name: e.target.value })
              }
              placeholder="Course or certificate name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`cert-provider-${entry.id}`}>
                Provider (optional)
              </Label>
              <Input
                id={`cert-provider-${entry.id}`}
                value={entry.provider ?? ""}
                onChange={(e) =>
                  updateCertification(entry.id, { provider: e.target.value })
                }
                placeholder="e.g. Coursera, Google, edX"
              />
            </div>
            <div>
              <Label htmlFor={`cert-date-${entry.id}`}>
                Completion Date (optional)
              </Label>
              <Input
                id={`cert-date-${entry.id}`}
                value={entry.completionDate ?? ""}
                onChange={(e) =>
                  updateCertification(entry.id, {
                    completionDate: e.target.value,
                  })
                }
                placeholder="e.g. March 2024"
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`cert-link-${entry.id}`}>
              Credential Link (optional)
            </Label>
            <Input
              id={`cert-link-${entry.id}`}
              value={entry.credentialLink ?? ""}
              onChange={(e) =>
                updateCertification(entry.id, {
                  credentialLink: e.target.value,
                })
              }
              placeholder="https://…"
            />
          </div>

          <div>
            <Label htmlFor={`cert-desc-${entry.id}`}>
              Description (optional)
            </Label>
            <Textarea
              id={`cert-desc-${entry.id}`}
              rows={2}
              value={entry.description ?? ""}
              onChange={(e) =>
                updateCertification(entry.id, { description: e.target.value })
              }
              placeholder="Brief note about what you learned or why it's relevant…"
            />
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addCertification}
        className="w-full"
      >
        + Add Certification
      </Button>
    </div>
  );
}
