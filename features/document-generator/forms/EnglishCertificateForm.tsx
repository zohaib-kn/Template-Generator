"use client";

import { useDocumentState } from "../hooks/useDocumentState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export function EnglishCertificateForm() {
  const { data, setEnglishCertificate } = useDocumentState();
  const cert = data.englishCertificate ?? {};

  return (
    <div className="space-y-4 pt-2">
      {/* Primary Exam Details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          <Label htmlFor="cert-score">Overall Score / Band</Label>
          <Input
            id="cert-score"
            value={cert.score ?? ""}
            onChange={(e) => setEnglishCertificate({ score: e.target.value })}
            placeholder="e.g. 7.5"
          />
        </div>
        <div>
          <Label htmlFor="cert-cefr">CEFR Level</Label>
          <Input
            id="cert-cefr"
            value={cert.cefrLevel ?? ""}
            onChange={(e) => setEnglishCertificate({ cefrLevel: e.target.value })}
            placeholder="e.g. C1, B2"
          />
        </div>
      </div>

      {/* Component Sub-scores */}
      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800 tracking-wide uppercase">
            Component Sub-Scores
          </span>
          <span className="text-[11px] text-slate-400">Listening · Reading · Writing · Speaking</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label htmlFor="cert-listening" className="text-[11px] text-slate-600">Listening</Label>
            <Input
              id="cert-listening"
              value={cert.listening ?? ""}
              onChange={(e) => setEnglishCertificate({ listening: e.target.value })}
              placeholder="e.g. 8.5"
              className="bg-white"
            />
          </div>
          <div>
            <Label htmlFor="cert-reading" className="text-[11px] text-slate-600">Reading</Label>
            <Input
              id="cert-reading"
              value={cert.reading ?? ""}
              onChange={(e) => setEnglishCertificate({ reading: e.target.value })}
              placeholder="e.g. 6.5"
              className="bg-white"
            />
          </div>
          <div>
            <Label htmlFor="cert-writing" className="text-[11px] text-slate-600">Writing</Label>
            <Input
              id="cert-writing"
              value={cert.writing ?? ""}
              onChange={(e) => setEnglishCertificate({ writing: e.target.value })}
              placeholder="e.g. 7.5"
              className="bg-white"
            />
          </div>
          <div>
            <Label htmlFor="cert-speaking" className="text-[11px] text-slate-600">Speaking</Label>
            <Input
              id="cert-speaking"
              value={cert.speaking ?? ""}
              onChange={(e) => setEnglishCertificate({ speaking: e.target.value })}
              placeholder="e.g. 7.0"
              className="bg-white"
            />
          </div>
        </div>
      </div>

      {/* Verification & Meta Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="cert-date">Date Taken</Label>
          <Input
            id="cert-date"
            type="date"
            value={cert.dateTaken ?? ""}
            onChange={(e) => setEnglishCertificate({ dateTaken: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="cert-trf">TRF / Candidate No.</Label>
          <Input
            id="cert-trf"
            value={cert.trfNumber ?? ""}
            onChange={(e) => setEnglishCertificate({ trfNumber: e.target.value })}
            placeholder="e.g. 24IA511013A009A"
          />
        </div>
      </div>
    </div>
  );
}
