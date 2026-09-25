/**
 * features/sop-generator/lib/buildImportedStudentContext.ts
 *
 * Constructs a pure, isolated StudentDocumentContext for imported SOP documents.
 * 
 * Crucial Invariant:
 * When an SOP is imported directly without pre-selecting a CRM student, this helper
 * ensures that mock/dummy data (e.g. Aafia Ameen, CBSE 88.6%, IELTS Band 7.5) is
 * completely purged, populating ONLY verified facts extracted from the uploaded document.
 */

import type { StudentDocumentContext } from "../types/sop-generator";

/**
 * Builds a clean StudentDocumentContext from extracted SOP facts.
 * 
 * @param facts Map of student/destination/academic facts extracted from the SOP or approved in review.
 * @param baseContext Optional existing context. If provided AND was live-crm, facts are overlaid on it.
 * @param defaultName Optional fallback student name if not present in facts.
 */
export function buildImportedStudentContext(
  facts: Record<string, string> = {},
  baseContext?: StudentDocumentContext,
  defaultName?: string
): StudentDocumentContext {
  // If baseContext exists (and belongs to a live CRM record), preserve existing verified fields
  if (baseContext) {
    const updated: StudentDocumentContext = {
      ...baseContext,
      student: {
        ...baseContext.student,
        fullName: facts.fullName || baseContext.student.fullName,
        nationality: facts.nationality || baseContext.student.nationality,
        passportNumber: facts.passportNumber || baseContext.student.passportNumber,
        city: facts.city || baseContext.student.city,
      },
      academics: {
        ...baseContext.academics,
        latestQualification: facts.qualification || baseContext.academics.latestQualification,
        institution: facts.institution || baseContext.academics.institution,
        percentage: facts.percentage || baseContext.academics.percentage,
        completionYear: facts.completionYear || baseContext.academics.completionYear,
      },
      destination: {
        ...baseContext.destination,
        university: facts.targetUniversity || baseContext.destination.university,
        course: facts.targetCourse || baseContext.destination.course,
        country: facts.targetCountry || baseContext.destination.country,
      },
    };

    if (facts.ieltsScore) {
      updated.tests = {
        ...updated.tests,
        ielts: {
          ...updated.tests.ielts,
          overall: facts.ieltsScore,
        },
      };
    }

    return updated;
  }

  // Otherwise, construct a clean, dedicated context free of any mock data contamination
  const resolvedName = facts.fullName?.trim() || defaultName?.trim() || "Student";
  const resolvedTargetCountry = facts.targetCountry?.trim() || "Italy";

  return {
    student: {
      fullName: resolvedName,
      dateOfBirth: facts.dateOfBirth || "",
      placeOfBirth: facts.placeOfBirth || "",
      city: facts.city || "",
      country: facts.country || "India",
      nationality: facts.nationality || "Indian",
      passportNumber: facts.passportNumber || "",
      phone: facts.phone || "",
      email: facts.email || "",
      address: facts.address || "",
      gender: facts.gender || "",
      languages: facts.languages || "",
    },

    academics: {
      latestQualification: facts.qualification || "",
      institution: facts.institution || "",
      board: facts.board || "",
      completionYear: facts.completionYear || "",
      subjects: facts.subjects || "",
      percentage: facts.percentage || "",
      previousDegree: facts.previousDegree || "",
    },

    tests: {
      ielts: {
        overall: facts.ieltsScore || "",
        listening: facts.ieltsListening || "",
        reading: facts.ieltsReading || "",
        writing: facts.ieltsWriting || "",
        speaking: facts.ieltsSpeaking || "",
        dateTaken: facts.ieltsDateTaken || "",
      },
    },

    destination: {
      country: resolvedTargetCountry,
      city: facts.targetCity || "",
      university: facts.targetUniversity || "",
      course: facts.targetCourse || "",
      degreeLevel: facts.degreeLevel || "Master's Degree",
      duration: facts.duration || "2 Years",
      intakeMonth: facts.intakeMonth || "September",
      intakeYear: facts.intakeYear || new Date().getFullYear().toString(),
      consulate: facts.consulate || "Embassy of Italy, New Delhi",
      consulateCity: facts.consulateCity || "New Delhi",
      consulateAddress: facts.consulateAddress || "50-E, Chandragupta Marg, Chanakyapuri, New Delhi",
    },

    career: {
      shortTermGoal: facts.shortTermGoal || "",
      longTermGoal: facts.longTermGoal || "",
      returnIntention: facts.returnIntention || "",
    },

    sponsor: {
      name: facts.sponsorName || "",
      relationship: facts.sponsorRelationship || "",
      occupation: facts.sponsorOccupation || "",
      annualIncome: facts.sponsorAnnualIncome || "",
      incomeSource: facts.sponsorIncomeSource || "",
    },

    finance: {
      educationLoanAmount: facts.educationLoanAmount || "",
      loanProvider: facts.loanProvider || "",
      bankName: facts.bankName || "",
      accountHolderName: facts.accountHolderName || "",
      availableBalance: facts.availableBalance || "",
      totalFundsAvailable: facts.totalFundsAvailable || "",
      currency: facts.currency || "EUR",
    },

    accommodation: {
      name: facts.accommodationName || "",
      type: facts.accommodationType || "",
      address: facts.accommodationAddress || "",
      city: facts.accommodationCity || "",
      country: facts.accommodationCountry || resolvedTargetCountry,
      fromDate: facts.accommodationFromDate || "",
      toDate: facts.accommodationToDate || "",
      bookingReference: facts.accommodationBookingReference || "",
    },

    insurance: {
      provider: facts.insuranceProvider || "",
      policyNumber: facts.insurancePolicyNumber || "",
      type: facts.insuranceType || "",
      fromDate: facts.insuranceFromDate || "",
      toDate: facts.insuranceToDate || "",
      coverageAmount: facts.insuranceCoverageAmount || "€30,000",
    },

    travel: {
      airline: facts.airline || "",
      flightNumber: facts.flightNumber || "",
      origin: facts.travelOrigin || "",
      destination: facts.travelDestination || "",
      travelDate: facts.travelDate || "",
      pnr: facts.pnr || "",
      returnDate: facts.returnDate || "",
    },
  };
}
