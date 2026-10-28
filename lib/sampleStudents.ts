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

export function getSampleAafiaAmeenSnapshot(): CrmSnapshot {
  return {
    student: {
      _id: "sample-aafia-ameen",
      personalDetails: {
        firstName: "Aafia",
        lastName: "Ameen",
        email: "aafiaameen9@gmail.com",
        personalEmail: "aafiaameen9@gmail.com",
        mobile: "+91 8839395705",
        dob: "2006-03-15T00:00:00.000Z",
        gender: "female",
      },
      nationality: {
        nationality: "Indian",
        citizenship: "Indian",
      },
      passportInfo: {
        passportNumber: "Z9876543",
        countryOfBirth: "India",
        cityOfBirth: "Bhopal",
      },
      mailingAddress: {
        address1: "18 Koh-e-Fiza Colony",
        city: "Bhopal",
        state: "Madhya Pradesh",
        country: "India",
        pincode: "462001",
      },
      academicQualifications: [
        {
          _id: "qual-aafia-1",
          levelOfStudy: "12th",
          qualification: "Class XII",
          institution: "Carmel Convent Sr. Sec. School, Bhopal",
          boardOrUniversity: "CBSE curriculum",
          cityOfStudy: "Bhopal",
          countryOfStudy: "India",
          score: "88.6%",
          startDate: "2024-04-01",
          endDate: "2026-03-31",
        },
      ],
      workExperience: [],
      tests: [
        {
          _id: "test-aafia-1",
          type: "IELTS Academic",
          overallScore: "7.5",
          listeningScore: "8.0",
          readingScore: "7.5",
          writingScore: "7.0",
          speakingScore: "7.5",
          testDate: "2025-09-14",
        },
        {
          _id: "test-aafia-2",
          type: "CISIA CENT-S",
          overallScore: "81.75",
          testDate: "2025-11-20",
        },
      ],
      family: {
        count: "four",
        father: {
          name: "Mr. Amin Jamali",
          occupation: "Insurance Surveyor",
          annualIncome: "INR 18,00,000",
        },
        mother: {
          name: "Mrs. Ameen",
          occupation: "Amazon",
        },
        sibling: "elder brother",
        returnReason: "Being the only daughter of my parents",
      },
      finance: {
        loanAmountSanctioned: "INR 39,00,000 (Indian Rupees Thirty-Nine Lakh Only)",
        bankName: "Credila Financial Services Limited",
        disbursedAmount: "INR 38,11,848",
        bankAccount: "HSBC Bank Savings Account No. 053-059036-006",
        statementDate: "23 July 2026",
        availableBalance: "INR 38,11,848.00",
        availableBalanceEur: "EUR 34,719.44",
        exchangeRate: "1 EUR = INR 109.79",
        netWorth: "INR 2,32,44,511",
        itrYears: "2024–25, 2025–26, and 2026–27",
        currency: "INR",
      },
      visaLogistics: {
        consulate: {
          name: "Consulate General of Italy",
          city: "Mumbai",
          address: "Mumbai, India",
        },
        accommodation: {
          name: "Dimora in Prato",
          type: "Temporary Student Accommodation",
          address: "Dimora in Prato, Padova, Italy",
          city: "Padova",
          country: "Italy",
          fromDate: "20 September 2026",
          toDate: "20 October 2026",
          bookingReference: "DIMORA-PADUA-2026",
        },
        insurance: {
          provider: "ICICI Lombard General Insurance",
          policyNumber: "IC512370",
          type: "365-day ICICI Lombard General Insurance Overseas Student Travel Insurance Policy",
          fromDate: "01 September 2026",
          toDate: "31 August 2027",
          coverageAmount: "EUR 50,000",
        },
        travel: {
          airline: "Emirates",
          flightNumber: "EK 501",
          origin: "Mumbai (BOM)",
          destination: "Venice Marco Polo Airport (VCE)",
          transit: "Dubai (DXB)",
          travelDate: "20 September 2026",
          pnr: "PCNXKF",
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

export function getSampleMirzaFarhanZaidSnapshot(): CrmSnapshot {
  return {
    student: {
      _id: "sample-mirza-farhan-zaid",
      personalDetails: {
        firstName: "Mirza Farhan",
        lastName: "Zaid",
        email: "zaidmirzafarhan@gmail.com",
        personalEmail: "zaidmirzafarhan@gmail.com",
        mobile: "(+91) 8770819483",
        dob: "2003-07-06T00:00:00.000Z",
        gender: "male",
      },
      nationality: {
        nationality: "Indian",
        citizenship: "Indian",
      },
      passportInfo: {
        passportNumber: "V3388567",
        countryOfBirth: "India",
        cityOfBirth: "BHOPAL",
      },
      mailingAddress: {
        address1: "F- 2, ZAHARA Complex Neem Road , Jinsi",
        city: "Bhopal",
        state: "Madhya Pradesh",
        country: "India",
        pincode: "462008",
      },
      academicQualifications: [
        {
          _id: "qual-mirza-1",
          levelOfStudy: "Undergraduate",
          qualification: "Bachelors of Technology in Computer Science and Engineering",
          fieldOfStudy: "Artificial Intelligence and Machine Learning",
          institution: "Vellore Institution of Technology",
          cityOfStudy: "Bhopal",
          countryOfStudy: "India",
          website: "https://www.vitbhopal.ac.in/",
          score: "8.12",
          gradingSystem: "10",
          startDate: "2021-07-08",
          endDate: "2025-04-20",
        },
        {
          _id: "qual-mirza-2",
          levelOfStudy: "12th",
          qualification: "12th Grade",
          institution: "ST Francis Higher Secondary School",
          cityOfStudy: "Bhopal",
          countryOfStudy: "India",
          website: "stfrancisbhopal.com/",
          score: "78.2%",
          startDate: "2020-12-15",
          endDate: "2021-07-30",
        },
      ],
      workExperience: [],
      tests: [
        {
          _id: "test-mirza-1",
          type: "IELTS",
          overallScore: "7.5",
          testDate: "2026-08-23",
          trfNumber: "26IA506129FAIM003A",
          testReportFormNumber: "26IA506129FAIM003A",
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
        _id: "app-mirza-1",
        university: { name: "Technical University of Munich" },
        course: { title: "Master of Science in Artificial Intelligence & Machine Learning" },
        country: { name: "Germany" },
      },
    ],
    documents: [],
  };
}
