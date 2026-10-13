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
          <Label htmlFor="cert-date">Date of Exam</Label>
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

      {/* Live CV Bullet Column Preview */}
      {(cert.score || cert.listening || cert.reading || cert.writing || cert.speaking || cert.trfNumber) && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 tracking-wide uppercase text-[11px]">
              Vertical Column Preview (CV Format)
            </span>
            <span className="text-[10px] bg-sky-100 text-sky-800 font-medium px-2 py-0.5 rounded-full border border-sky-300">
              Avantika Europass Standard
            </span>
          </div>
          <div className="space-y-1 font-mono text-[12px] text-slate-700 bg-white/80 p-2.5 rounded-lg border border-sky-100 shadow-xs">
            {cert.score && (
              <div className="flex items-start gap-2">
                <span className="text-sky-600 font-bold">•</span>
                <span>Overall Band Score - {cert.score.replace(/^(?:Overall\s*(?:Band)?\s*(?:Score)?|Band)\s*[-:]?\s*/i, "")}</span>
              </div>
            )}
            {cert.listening && (
              <div className="flex items-start gap-2">
                <span className="text-sky-600 font-bold">•</span>
                <span>Listening - {cert.listening.replace(/^Listening\s*[-:]?\s*/i, "")}</span>
              </div>
            )}
            {cert.reading && (
              <div className="flex items-start gap-2">
                <span className="text-sky-600 font-bold">•</span>
                <span>Reading - {cert.reading.replace(/^Reading\s*[-:]?\s*/i, "")}</span>
              </div>
            )}
            {cert.writing && (
              <div className="flex items-start gap-2">
                <span className="text-sky-600 font-bold">•</span>
                <span>Writing - {cert.writing.replace(/^Writing\s*[-:]?\s*/i, "")}</span>
              </div>
            )}
            {cert.speaking && (
              <div className="flex items-start gap-2">
                <span className="text-sky-600 font-bold">•</span>
                <span>Speaking - {cert.speaking.replace(/^Speaking\s*[-:]?\s*/i, "")}</span>
              </div>
            )}
            {cert.trfNumber && (
              <div className="flex items-start gap-2">
                <span className="text-sky-600 font-bold">•</span>
                <span>Test Report Form Number - {cert.trfNumber.replace(/^(?:Test\s*Report\s*(?:Form)?\s*(?:Number)?|TRF\s*(?:No\.?|Number)?)\s*[-:]?\s*/i, "")}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
