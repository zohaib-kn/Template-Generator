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
          qualification: "Higher Secondary (FSc Pre-Engineering)",
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
          overallScore: "7.0",
          testDate: "2024-08-10",
        },
      ],
    },
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
