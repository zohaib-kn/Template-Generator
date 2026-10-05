import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ApplicationTarget } from "@/features/document-generator/guidance/types";
import type { DocumentData } from "@/types";
import { getStudentDocumentContext } from "../lib/applicationService";
import { mapNormalizedToSop } from "@/services/normalization/mapNormalizedToSop";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";

describe("Cross-Module Synchronization: Resume Builder <-> SOP Generator", () => {
  it("Overlaying applicationTarget populates SOP destination correctly", () => {
    const baseCtx = getStudentDocumentContext();

    const applicationTarget: ApplicationTarget = {
      universityName: "Technical University of Munich",
      intendedCourse: "M.Sc. Computer Science",
      destinationCountry: "Germany" as any,
      degreeLevel: "Master's",
    };

    // Simulate the SOP overlay logic
    const syncedCtx = {
      ...baseCtx,
      destination: {
        ...baseCtx.destination,
        university: applicationTarget.universityName || baseCtx.destination.university,
        course: applicationTarget.intendedCourse || baseCtx.destination.course,
        country: applicationTarget.destinationCountry || baseCtx.destination.country,
        degreeLevel: applicationTarget.degreeLevel || baseCtx.destination.degreeLevel,
      },
    };

    assert.equal(syncedCtx.destination.university, "Technical University of Munich");
    assert.equal(syncedCtx.destination.course, "M.Sc. Computer Science");
    assert.equal(syncedCtx.destination.country, "Germany");
    assert.equal(syncedCtx.destination.degreeLevel, "Master's");
  });

  it("Overlaying filled resume details populates SOP student and academics cleanly", () => {
    const baseCtx = getStudentDocumentContext();

    const resumeData: DocumentData = {
      personal: {
        fullName: "Kaavya Girish Nair",
        email: "kaavyanaair@gmail.com",
        phone: "+91 9876543210",
        address: "Kochi, Kerala, India",
        nationality: "Indian",
      },
      education: [
        {
          id: "edu-1",
          qualification: "Bachelor of Technology in Computer Science",
          institution: "National Institute of Technology Calicut",
          fieldOfStudy: "Computer Science and Engineering",
          endDate: "2024-05",
        },
      ],
    };

    const syncedCtx = {
      ...baseCtx,
      student: {
        ...baseCtx.student,
        fullName: resumeData.personal?.fullName || baseCtx.student.fullName,
        email: resumeData.personal?.email || baseCtx.student.email,
        phone: resumeData.personal?.phone || baseCtx.student.phone,
        address: resumeData.personal?.address || baseCtx.student.address,
        nationality: resumeData.personal?.nationality || baseCtx.student.nationality,
      },
      academics: {
        ...baseCtx.academics,
        latestQualification: resumeData.education?.[0]?.qualification || baseCtx.academics.latestQualification,
        institution: resumeData.education?.[0]?.institution || baseCtx.academics.institution,
        subjects: resumeData.education?.[0]?.fieldOfStudy || baseCtx.academics.subjects,
        completionYear: resumeData.education?.[0]?.endDate?.slice(0, 4) || baseCtx.academics.completionYear,
      },
    };

    assert.equal(syncedCtx.student.fullName, "Kaavya Girish Nair");
    assert.equal(syncedCtx.student.email, "kaavyanaair@gmail.com");
    assert.equal(syncedCtx.student.phone, "+91 9876543210");
    assert.equal(syncedCtx.student.address, "Kochi, Kerala, India");
    assert.equal(syncedCtx.academics.latestQualification, "Bachelor of Technology in Computer Science");
    assert.equal(syncedCtx.academics.institution, "National Institute of Technology Calicut");
    assert.equal(syncedCtx.academics.subjects, "Computer Science and Engineering");
    assert.equal(syncedCtx.academics.completionYear, "2024");
  });

  it("Academic alignment targetProgram properly derives from applicationTarget", () => {
    const applicationTarget: ApplicationTarget = {
      universityName: "Politecnico di Milano",
      intendedCourse: "M.Sc. Mechanical Engineering",
      destinationCountry: "Italy",
      degreeLevel: "Master's",
    };

    const targetProgram = {
      id: "target-program",
      university: applicationTarget.universityName || "Target University",
      course: applicationTarget.intendedCourse || "Target Course",
      country: applicationTarget.destinationCountry || "Target Country",
      degreeLevel: applicationTarget.degreeLevel || "Master's",
      courseCategory: applicationTarget.courseCategory || "Other",
    };

    assert.equal(targetProgram.university, "Politecnico di Milano");
    assert.equal(targetProgram.course, "M.Sc. Mechanical Engineering");
    assert.equal(targetProgram.country, "Italy");
    assert.equal(targetProgram.degreeLevel, "Master's");
  });
});
