/**
 * buildStudentDocumentContext
 *
 * Normalisation layer: adapts raw mock/webhook/database application data
 * into the `StudentDocumentContext` shape used exclusively by SOP templates.
 *
 * ARCHITECTURE NOTE:
 * This function is the ONLY place that touches raw mock data and maps it
 * to the SOP context. No UI component should import mock data directly.
 *
 * Later this function can be replaced with a real API call without any
 * changes to the components that consume StudentDocumentContext.
 */

import type { StudentDocumentContext } from "../types/sop-generator";
import { mockStudentApplication } from "../data/mock-student-application";

/**
 * Builds a `StudentDocumentContext` from the current application data.
 *
 * Phase 1: returns data derived from `mockStudentApplication`.
 * Phase 2+: accept a real application record from the backend.
 */
export function buildStudentDocumentContext(): StudentDocumentContext {
  const raw = mockStudentApplication;

  return {
    student: {
      fullName: raw.student.fullName,
      dateOfBirth: raw.student.dateOfBirth,
      placeOfBirth: raw.student.placeOfBirth,
      city: raw.student.city,
      country: raw.student.country,
      nationality: raw.student.nationality,
      passportNumber: raw.student.passportNumber,
      phone: raw.student.phone,
      email: raw.student.email,
      address: raw.student.address,
      gender: raw.student.gender,
      languages: raw.student.languages,
    },

    academics: {
      latestQualification: raw.academics.latestQualification,
      institution: raw.academics.institution,
      board: raw.academics.board,
      completionYear: raw.academics.completionYear,
      subjects: raw.academics.subjects,
      percentage: raw.academics.percentage,
      previousDegree: raw.academics.previousDegree ?? "",
    },

    tests: {
      ielts: {
        overall: raw.tests.ielts.overall,
        listening: raw.tests.ielts.listening,
        reading: raw.tests.ielts.reading,
        writing: raw.tests.ielts.writing,
        speaking: raw.tests.ielts.speaking,
        dateTaken: raw.tests.ielts.dateTaken,
      },
    },

    destination: {
      country: raw.destination.country,
      city: raw.destination.city,
      university: raw.destination.university,
      course: raw.destination.course,
      degreeLevel: raw.destination.degreeLevel,
      duration: raw.destination.duration,
      intakeMonth: raw.destination.intakeMonth,
      intakeYear: raw.destination.intakeYear,
      consulate: raw.destination.consulate,
      consulateCity: raw.destination.consulateCity,
      consulateAddress: raw.destination.consulateAddress,
    },

    career: {
      shortTermGoal: raw.career.shortTermGoal,
      longTermGoal: raw.career.longTermGoal,
      returnIntention: raw.career.returnIntention,
    },

    sponsor: {
      name: raw.sponsor.name,
      relationship: raw.sponsor.relationship,
      occupation: raw.sponsor.occupation,
      annualIncome: raw.sponsor.annualIncome,
      incomeSource: raw.sponsor.incomeSource,
    },

    finance: {
      educationLoanAmount: raw.finance.educationLoanAmount,
      loanProvider: raw.finance.loanProvider,
      bankName: raw.finance.bankName,
      accountHolderName: raw.finance.accountHolderName,
      availableBalance: raw.finance.availableBalance,
      totalFundsAvailable: raw.finance.totalFundsAvailable,
      currency: raw.finance.currency,
    },

    accommodation: {
      name: raw.accommodation.name,
      type: raw.accommodation.type,
      address: raw.accommodation.address,
      city: raw.accommodation.city,
      country: raw.accommodation.country,
      fromDate: raw.accommodation.fromDate,
      toDate: raw.accommodation.toDate,
      bookingReference: raw.accommodation.bookingReference,
    },

    insurance: {
      provider: raw.insurance.provider,
      policyNumber: raw.insurance.policyNumber,
      type: raw.insurance.type,
      fromDate: raw.insurance.fromDate,
      toDate: raw.insurance.toDate,
      coverageAmount: raw.insurance.coverageAmount,
    },

    travel: {
      airline: raw.travel.airline,
      flightNumber: raw.travel.flightNumber,
      origin: raw.travel.origin,
      destination: raw.travel.destination,
      travelDate: raw.travel.travelDate,
      pnr: raw.travel.pnr,
      returnDate: raw.travel.returnDate ?? "",
    },
  };
}
