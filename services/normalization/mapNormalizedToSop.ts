/**
 * services/normalization/mapNormalizedToSop.ts
 *
 * SOP Projection:
 * Converts a NormalizedStudentProfile into StudentDocumentContext
 * for the SOP & Visa Cover Letter Generator.
 *
 * SAFETY RULES:
 * 1. Populates all verified facts that genuinely exist in CRM.
 * 2. Does NOT fabricate fake sponsor incomes, bank balances, or flight PNRs.
 * 3. Unavailable visa-specific fields safely default to empty string ("").
 */

import type { StudentDocumentContext } from "@/features/sop-generator/types/sop-generator";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";

export function mapNormalizedToSop(profile: NormalizedStudentProfile): StudentDocumentContext {
  const p = profile.personal;
  const a = profile.academics;
  const activeProg = profile.applications.activeProgram;
  const eng = profile.tests.english;
  const fam = profile.family;
  const fin = profile.finance;
  const visa = profile.visaLogistics;

  // Determine primary sponsor from family if available
  const sponsorName = fam?.father?.name || fam?.mother?.name || "";
  const sponsorRel = fam?.father?.name ? "Father" : fam?.mother?.name ? "Mother" : "";

  return {
    student: {
      fullName: p.fullName || "",
      dateOfBirth: p.dateOfBirth || "",
      placeOfBirth: p.placeOfBirth || "",
      city: p.city || "",
      country: p.country || "",
      nationality: p.nationality || "",
      passportNumber: p.passportNumber || "",
      phone: p.phone || "",
      email: p.email || "",
      address: p.address || "",
      gender: p.gender || "",
      languages: "", // Not present in CRM; not fabricated
    },

    academics: {
      latestQualification: a.latest?.qualification || "",
      institution: a.latest?.institution || "",
      board: a.latest?.board || "",
      completionYear: a.latest?.completionYear || "",
      subjects: a.latest?.subjects || "",
      percentage: a.latest?.score || "",
      previousDegree: "",
    },

    tests: {
      ielts: {
        overall: eng?.overallScore || "",
        listening: eng?.subscores?.listening || "",
        reading: eng?.subscores?.reading || "",
        writing: eng?.subscores?.writing || "",
        speaking: eng?.subscores?.speaking || "",
        dateTaken: eng?.testDate || "",
      },
    },

    destination: {
      country: activeProg?.country || "",
      city: "", // Often not explicitly in program model
      university: activeProg?.university || "",
      course: activeProg?.course || "",
      degreeLevel: activeProg?.degreeLevel || "",
      duration: "", // Not present in CRM; not fabricated
      intakeMonth: "",
      intakeYear: "",
      consulate: visa?.consulate?.name || "",
      consulateCity: visa?.consulate?.city || "",
      consulateAddress: visa?.consulate?.address || "",
    },

    career: {
      shortTermGoal: "", // Narrative goal; not fabricated
      longTermGoal: "",
      returnIntention: "",
    },

    sponsor: {
      name: sponsorName,
      relationship: sponsorRel,
      occupation: fam?.father?.occupation || fam?.mother?.occupation || "",
      annualIncome: "", // Financial balance not fabricated
      incomeSource: "",
    },

    finance: {
      educationLoanAmount: fin?.loanAmountSanctioned || "",
      loanProvider: fin?.bankName || "",
      bankName: fin?.bankName || "",
      accountHolderName: sponsorName || p.fullName || "",
      availableBalance: "", // Liquid balance not fabricated
      totalFundsAvailable: "",
      currency: fin?.currency || "",
    },

    accommodation: {
      name: visa?.accommodation?.name || "",
      type: visa?.accommodation?.type || "",
      address: visa?.accommodation?.address || "",
      city: visa?.accommodation?.city || "",
      country: visa?.accommodation?.country || "",
      fromDate: visa?.accommodation?.fromDate || "",
      toDate: visa?.accommodation?.toDate || "",
      bookingReference: visa?.accommodation?.bookingReference || "",
    },

    insurance: {
      provider: visa?.insurance?.provider || "",
      policyNumber: visa?.insurance?.policyNumber || "",
      type: "",
      fromDate: visa?.insurance?.fromDate || "",
      toDate: visa?.insurance?.toDate || "",
      coverageAmount: visa?.insurance?.coverageAmount || "",
    },

    travel: {
      airline: visa?.travel?.airline || "",
      flightNumber: visa?.travel?.flightNumber || "",
      origin: visa?.travel?.origin || "",
      destination: visa?.travel?.destination || "",
      travelDate: visa?.travel?.travelDate || "",
      pnr: visa?.travel?.pnr || "",
      returnDate: visa?.travel?.returnDate || "",
    },
  };
}
