"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export function EnglishCertificateForm() {
  const { data, setEnglishCertificate } = useDocumentState();
  const cert = data.englishCertificate ?? {};

  return (
    <div className="space-y-3 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="cert-exam">Exam Name</Label>
          <Input
            id="cert-exam"
            value={cert.examName ?? ""}
            onChange={(e) => setEnglishCertificate({ examName: e.target.value })}
            placeholder="IELTS, TOEFL, Cambridge…"
          />
        </div>
        <div>
          <Label htmlFor="cert-score">Score / Band</Label>
          <Input
            id="cert-score"
            value={cert.score ?? ""}
            onChange={(e) => setEnglishCertificate({ score: e.target.value })}
            placeholder="e.g. 7.5, C1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="cert-date">Date Taken</Label>
          <Input
            id="cert-date"
            type="date"
            value={cert.dateTaken ?? ""}
            onChange={(e) =>
              setEnglishCertificate({ dateTaken: e.target.value })
            }
          />
        </div>
        <div>
          <Label htmlFor="cert-issuer">Issuing Body</Label>
          <Input
            id="cert-issuer"
            value={cert.issuingBody ?? ""}
            onChange={(e) =>
              setEnglishCertificate({ issuingBody: e.target.value })
            }
            placeholder="British Council, ETS…"
          />
        </div>
      </div>
    </div>
  );
}
