/**
 * lib/sampleStudents.ts
 *
 * First-class sample student snapshots for testing and demo flows.
 * Enables clean multi-module synchronization without corrupting live CRM data.
 */

import type { CrmSnapshot } from "@/types/crmSnapshot";

export function getSampleAaravMehtaSnapshot(): CrmSnapshot {
  return {
    student: {
      _id: "sample-aarav-mehta",
      personalDetails: {
        firstName: "Aarav",
        lastName: "Mehta",
        email: "aarav.mehta.test@example.com",
        personalEmail: "aarav.mehta.test@example.com",
        mobile: "+91 98765 43210",
        dob: "2003-07-18T00:00:00.000Z",
        gender: "male",
      },
      nationality: {
        nationality: "Indian",
        citizenship: "Indian",
      },
      passportInfo: {
        passportNumber: "P1234567",
        countryOfBirth: "India",
        cityOfBirth: "Bhopal",
      },
      mailingAddress: {
        address1: "24 Arera Colony",
        city: "Bhopal",
        state: "Madhya Pradesh",
        country: "India",
        pincode: "462016",
      },
      academicQualifications: [
        {
          _id: "qual-aarav-1",
          levelOfStudy: "Undergraduate",
          qualification: "Bachelor of Business Administration (BBA)",
          institution: "Bhopal School of Management Studies",
          boardOrUniversity: "Barkatullah University",
          cityOfStudy: "Bhopal",
          countryOfStudy: "India",
          score: "76%",
          startDate: "2022-08-01",
          endDate: "2025-05-31",
        },
        {
          _id: "qual-aarav-2",
          levelOfStudy: "12th",
          qualification: "Senior Secondary / Class XII",
          institution: "St. Xavier's Senior Secondary School",
          boardOrUniversity: "CBSE",
          cityOfStudy: "Bhopal",
          countryOfStudy: "India",
          score: "82%",
          startDate: "2020-04-01",
          endDate: "2022-03-31",
        },
      ],
      workExperience: [
        {
          _id: "work-aarav-1",
          position: "Business Analytics Intern",
          organisation: "Apex Retail Solutions",
          location: "Bhopal, India",
          workingFrom: "2024-06-01",
          workingUpto: "2024-08-31",
          jobProfile:
            "Assisted the analytics team with retail sales data cleansing, customer segmentation in Excel, and creation of automated performance dashboards in Power BI.",
        },
      ],
      tests: [
        {
          _id: "test-aarav-1",
          overallScore: "7.5",
          testDate: "2024-11-15",
        },
      ],
    },
    appliedPrograms: [],
    documents: [],
  };
}

/**
 * Fictional visa cover-letter applicant. Every value below is invented
 * (example.com contacts, SAMPLE-* reference numbers); none belongs to a real person.
 */
export function getSampleAafiaAmeenSnapshot(): CrmSnapshot {
  return {
    student: {
      _id: "sample-aafia-ameen",
      personalDetails: {
        firstName: "Aafia",
        lastName: "Ameen",
        email: "aafia.ameen.test@example.com",
        personalEmail: "aafia.ameen.test@example.com",
        mobile: "+91 98765 00000",
        dob: "2004-02-14T00:00:00.000Z",
        gender: "female",
      },
      nationality: {
        nationality: "Indian",
        citizenship: "Indian",
      },
      passportInfo: {
        passportNumber: "Z9876543",
        countryOfBirth: "India",
        cityOfBirth: "Bangalore",
      },
      mailingAddress: {
        address1: "Brigade Road",
        city: "Bangalore",
        state: "Karnataka",
        country: "India",
        pincode: "560001",
      },
      academicQualifications: [
        {
          _id: "qual-aafia-1",
          levelOfStudy: "12th",
          qualification: "Class XII",
          institution: "National College Bangalore",
          boardOrUniversity: "State Board",
          cityOfStudy: "Bangalore",
          countryOfStudy: "India",
          score: "85%",
          startDate: "2022-06-01",
          endDate: "2024-05-31",
        },
      ],
      workExperience: [],
      tests: [
        {
          _id: "test-aafia-1",
          type: "IELTS Academic",
          overallScore: "7.0",
          listeningScore: "7.5",
          readingScore: "7.0",
          writingScore: "6.5",
          speakingScore: "7.0",
          testDate: "2024-08-10",
        },
      ],
      family: {
        count: "four",
        father: {
          name: "Mr. Mohammed Ameen",
          occupation: "Civil Engineer",
          annualIncome: "INR 12,00,000",
        },
        mother: {
          name: "Mrs. Sample Ameen",
          occupation: "School Teacher",
        },
        sibling: "younger brother",
        returnReason: "As the eldest child in my family",
      },
      finance: {
        loanAmountSanctioned: "INR 30,00,000 (Indian Rupees Thirty Lakh Only)",
        bankName: "Sample Education Finance Ltd",
        disbursedAmount: "INR 29,50,000",
        bankAccount: "Sample Bank Savings Account No. XXXX-XXXX-0000",
        statementDate: "01 July 2026",
        availableBalance: "INR 29,50,000.00",
        availableBalanceEur: "EUR 31,000.00",
        exchangeRate: "1 EUR = INR 95.16",
        netWorth: "INR 1,50,00,000",
        itrYears: "2023–24, 2024–25, and 2025–26",
        currency: "INR",
      },
      visaLogistics: {
        consulate: {
          name: "Consulate General of Italy",
          city: "Mumbai",
          address: "Mumbai, India",
        },
        accommodation: {
          name: "Sample Student Residence",
          type: "Temporary Student Accommodation",
          address: "Sample Student Residence, Turin, Italy",
          city: "Turin",
          country: "Italy",
          fromDate: "15 September 2026",
          toDate: "15 October 2026",
          bookingReference: "SAMPLE-BOOKING-0001",
        },
        insurance: {
          provider: "Sample Insurance Co.",
          policyNumber: "SAMPLE-POLICY-0001",
          type: "365-day Overseas Student Travel Insurance Policy",
          fromDate: "01 September 2026",
          toDate: "31 August 2027",
          coverageAmount: "EUR 30,000",
        },
        travel: {
          airline: "Sample Airways",
          flightNumber: "SA 100",
          origin: "Mumbai (BOM)",
          destination: "Turin Airport (TRN)",
          transit: "Dubai (DXB)",
          travelDate: "15 September 2026",
          pnr: "SAMPL1",
        },
      },
    } as any,
    appliedPrograms: [
      {
        _id: "app-aafia-1",
        university: { name: "Politecnico di Torino" },
        course: { title: "Bachelor's Degree in Information Engineering" },
        country: { name: "Italy" },
      },
    ],
    documents: [],
  };
}

/**
 * Fictional Europass CV applicant. Every value below is invented
 * (example.com contacts, SAMPLE-* reference numbers); none belongs to a real person.
 */
export function getSampleRohanIyerSnapshot(): CrmSnapshot {
  return {
    student: {
      _id: "sample-rohan-iyer",
      personalDetails: {
        firstName: "Rohan",
        lastName: "Iyer",
        email: "rohan.iyer.test@example.com",
        personalEmail: "rohan.iyer.test@example.com",
        mobile: "+91 98765 11111",
        dob: "2003-01-10T00:00:00.000Z",
        gender: "male",
      },
      nationality: {
        nationality: "Indian",
        citizenship: "Indian",
      },
      passportInfo: {
        passportNumber: "P0000001",
        countryOfBirth: "India",
        cityOfBirth: "Indore",
      },
      mailingAddress: {
        address1: "12 Sample Street",
        city: "Indore",
        state: "Madhya Pradesh",
        country: "India",
        pincode: "452001",
      },
      academicQualifications: [
        {
          _id: "qual-rohan-1",
          levelOfStudy: "Undergraduate",
          qualification: "Bachelor of Technology in Computer Science and Engineering",
          fieldOfStudy: "Artificial Intelligence and Machine Learning",
          institution: "Sample Institute of Technology",
          cityOfStudy: "Indore",
          countryOfStudy: "India",
          website: "https://example.edu/",
          score: "8.1",
          gradingSystem: "10",
          startDate: "2021-07-01",
          endDate: "2025-05-31",
        },
        {
          _id: "qual-rohan-2",
          levelOfStudy: "12th",
          qualification: "12th Grade",
          institution: "Sample Higher Secondary School",
          cityOfStudy: "Indore",
          countryOfStudy: "India",
          score: "78%",
          startDate: "2019-06-01",
          endDate: "2021-05-31",
        },
      ],
      workExperience: [],
      tests: [
        {
          _id: "test-rohan-1",
          type: "IELTS",
          overallScore: "7.5",
          testDate: "2026-08-23",
          trfNumber: "SAMPLE-TRF-0001",
          testReportFormNumber: "SAMPLE-TRF-0001",
          subscores: {
            listening: "9.0",
            reading: "7.5",
            writing: "6.5",
            speaking: "7.0",
          },
        },
      ],
    },
    appliedPrograms: [
      {
        _id: "app-rohan-1",
        university: { name: "Technical University of Munich" },
        course: { title: "Master of Science in Artificial Intelligence & Machine Learning" },
        country: { name: "Germany" },
      },
    ],
    documents: [],
  };
}

export interface SampleStudent {
  id: string;
  name: string;
  email: string;
  getSnapshot: () => CrmSnapshot;
}

/**
 * Registry of fictional demo students. Sample snapshots are only ever returned for an
 * exact sample ID match — never by name substring and never as a stand-in for a CRM student.
 */
export const SAMPLE_STUDENTS: readonly SampleStudent[] = [
  { id: "sample-aafia-ameen", name: "Aafia Ameen", email: "aafia.ameen.test@example.com", getSnapshot: getSampleAafiaAmeenSnapshot },
  { id: "sample-rohan-iyer", name: "Rohan Iyer", email: "rohan.iyer.test@example.com", getSnapshot: getSampleRohanIyerSnapshot },
  { id: "sample-aarav-mehta", name: "Aarav Mehta", email: "aarav.mehta.test@example.com", getSnapshot: getSampleAaravMehtaSnapshot },
];

export function isSampleStudentId(studentId: string | null | undefined): boolean {
  return Boolean(studentId) && SAMPLE_STUDENTS.some((s) => s.id === studentId);
}

/** Exact-ID lookup only. Returns null for any non-sample (i.e. real CRM) student ID. */
export function getSampleSnapshotById(studentId: string | null | undefined): CrmSnapshot | null {
  const sample = SAMPLE_STUDENTS.find((s) => s.id === studentId);
  return sample ? sample.getSnapshot() : null;
}
