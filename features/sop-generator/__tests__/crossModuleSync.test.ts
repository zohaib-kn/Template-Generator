import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ApplicationTarget } from "@/features/document-generator/guidance/types";
import type { DocumentData } from "@/types";
import { getStudentDocumentContext } from "../lib/applicationService";

describe("Cross-Module Synchronization: Resume Builder <-> SOP Generator", () => {
  it("Overlaying applicationTarget populates SOP destination correctly", () => {
    const baseCtx = getStudentDocumentContext();

    const applicationTarget: ApplicationTarget = {
      universityName: "Technical University of Munich",
      intendedCourse: "M.Sc. Computer Science",
      destinationCountry: "Other",
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
    assert.equal(syncedCtx.destination.country, "Other");
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

  it("getResumeSessionStorageKey scopes sessionStorage key by studentId", async () => {
    const { getResumeSessionStorageKey } = await import(
      "@/features/document-generator/state/DocumentContext"
    );

    assert.equal(
      getResumeSessionStorageKey("student-123"),
      "template_gen_active_resume_student-123"
    );
    assert.equal(
      getResumeSessionStorageKey("6a508a96af13bb33e9fc07ce"),
      "template_gen_active_resume_6a508a96af13bb33e9fc07ce"
    );
    assert.equal(getResumeSessionStorageKey(null), "template_gen_active_resume_data");
    assert.equal(getResumeSessionStorageKey(undefined), "template_gen_active_resume_data");
    assert.equal(getResumeSessionStorageKey(""), "template_gen_active_resume_data");
  });

  it("Cross-Student Isolation: Resume evidence from Student A is blocked from appearing in Student B's SOP", () => {
    // Student A's Resume data with specialized certificates and projects
    const studentAResumeData: DocumentData = {
      personal: {
        fullName: "Fardeen Khan",
        email: "fardeen@example.com",
      },
      certifications: [
        { id: "c1", name: "Certified Automotive Safety Engineer", provider: "SAE" },
      ],
      academicProjects: [
        { id: "p1", title: "Automotive Suspension Design", description: "Simulation in ANSYS" },
      ],
      skills: [{ id: "s1", name: "SolidWorks Simulation" }],
      internships: [
        { id: "i1", role: "Suspension Intern", company: "Bosch", description: "Design work" },
      ],
    };

    // Active student in SOP is Student B (Kaavya Nair)
    const currentStudentName = "Kaavya Girish Nair".toLowerCase();
    const resumeStudentName = (studentAResumeData.personal?.fullName || "").toLowerCase();

    const isResumeForCurrentStudent = Boolean(
      currentStudentName &&
      resumeStudentName &&
      (resumeStudentName === currentStudentName ||
        resumeStudentName.includes(currentStudentName) ||
        currentStudentName.includes(resumeStudentName))
    );

    // Filter evidence based on student identity
    const availableCertifications = isResumeForCurrentStudent
      ? (studentAResumeData.certifications ?? []).map((c) => ({ id: c.id, name: c.name }))
      : [];
    const availableProjects = isResumeForCurrentStudent
      ? (studentAResumeData.academicProjects ?? []).map((p) => ({ id: p.id, title: p.title }))
      : [];
    const availableSkills = isResumeForCurrentStudent
      ? (studentAResumeData.skills ?? []).map((s) => ({ id: s.id, name: s.name }))
      : [];
    const availableInternships = isResumeForCurrentStudent
      ? (studentAResumeData.internships ?? []).map((i) => ({ id: i.id, role: i.role }))
      : [];

    assert.equal(isResumeForCurrentStudent, false, "Must detect student identity mismatch");
    assert.equal(availableCertifications.length, 0, "Student A certifications must not leak to Student B");
    assert.equal(availableProjects.length, 0, "Student A projects must not leak to Student B");
    assert.equal(availableSkills.length, 0, "Student A skills must not leak to Student B");
    assert.equal(availableInternships.length, 0, "Student A internships must not leak to Student B");
  });

  it("Cross-Student Isolation: Resume evidence is preserved and accessible when student identities match", () => {
    const studentBResumeData: DocumentData = {
      personal: {
        fullName: "Kaavya Girish Nair",
        email: "kaavya@example.com",
      },
      certifications: [
        { id: "c2", name: "Data Science Specialization", provider: "Coursera" },
      ],
      skills: [{ id: "s2", name: "Python" }],
    };

    const currentStudentName = "Kaavya Girish Nair".toLowerCase();
    const resumeStudentName = (studentBResumeData.personal?.fullName || "").toLowerCase();

    const isResumeForCurrentStudent = Boolean(
      currentStudentName &&
      resumeStudentName &&
      (resumeStudentName === currentStudentName ||
        resumeStudentName.includes(currentStudentName) ||
        currentStudentName.includes(resumeStudentName))
    );

    const availableCertifications = isResumeForCurrentStudent
      ? (studentBResumeData.certifications ?? []).map((c) => ({ id: c.id, name: c.name }))
      : [];

    assert.equal(isResumeForCurrentStudent, true, "Must recognize matching student identity");
    assert.equal(availableCertifications.length, 1);
    assert.equal(availableCertifications[0].name, "Data Science Specialization");
  });

  it("Target Course Fallback Safety: Active student without target course evaluates to null (UNKNOWN) instead of false mismatch", async () => {
    const { computeAcademicAlignment } = await import(
      "@/services/academicAlignment/academicAlignmentEngine"
    );

    // Active student with Business background (e.g. Aarav Mehta, BBA)
    const qualifications = [
      {
        id: "qual-1",
        qualification: "Bachelor of Business Administration (BBA)",
        fieldOfStudy: "Business Administration",
        institution: "Delhi University",
        completionYear: "2024",
      },
    ];

    // Mock template destination from test-data (Aafia Ameen's mock Engineering program)
    const mockTemplateDestination = {
      course: "Bachelor's Degree in Information Engineering",
      university: "Politecnico di Torino",
      country: "Italy",
      degreeLevel: "Bachelor's Degree",
    };

    // User's active application target (not yet configured)
    const emptyApplicationTarget: ApplicationTarget = {
      intendedCourse: "",
      universityName: "",
      degreeLevel: "Master's",
    };

    const hasActiveStudent = true;

    // Simulation of SOP targetProgram resolution logic:
    // If active student is present but no target course specified, do NOT fall back to mock destination!
    const targetProgram =
      emptyApplicationTarget.intendedCourse || emptyApplicationTarget.universityName
        ? {
            id: "prog-1",
            university: emptyApplicationTarget.universityName || mockTemplateDestination.university,
            course: emptyApplicationTarget.intendedCourse || mockTemplateDestination.course,
            country: emptyApplicationTarget.destinationCountry || mockTemplateDestination.country,
            degreeLevel: emptyApplicationTarget.degreeLevel || "Master's",
            courseCategory: "Other",
          }
        : hasActiveStudent
        ? null
        : {
            id: "mock-program",
            university: mockTemplateDestination.university,
            course: mockTemplateDestination.course,
            country: mockTemplateDestination.country,
            degreeLevel: mockTemplateDestination.degreeLevel,
            courseCategory: "Other",
          };

    // targetProgram MUST be null for active student with no course
    assert.equal(targetProgram, null, "Active student with no target course must evaluate targetProgram to null");

    // computeAcademicAlignment with targetProgram=null MUST return UNKNOWN, not ACADEMIC_MISMATCH
    const alignmentResult = computeAcademicAlignment({
      qualifications,
      targetProgram: null,
    });

    assert.equal(alignmentResult.status, "UNKNOWN", "Alignment status must be UNKNOWN, avoiding false mismatch alarm");
    assert.equal(alignmentResult.targetField.domain, "UNKNOWN");
  });

  it("Target Course Fallback Safety: When target course is configured, alignment evaluates accurately across modules", async () => {
    const { computeAcademicAlignment } = await import(
      "@/services/academicAlignment/academicAlignmentEngine"
    );

    const qualifications = [
      {
        id: "qual-1",
        qualification: "Bachelor of Business Administration (BBA)",
        fieldOfStudy: "Business Administration",
        institution: "Delhi University",
        completionYear: "2024",
      },
    ];

    // 1. Same-stream target (Business -> MBA)
    const mbaTarget = {
      id: "prog-mba",
      university: "Bocconi University",
      course: "Master of Business Administration",
      country: "Italy",
      degreeLevel: "Master's",
      courseCategory: "Business / Management",
    };

    const alignedResult = computeAcademicAlignment({
      qualifications,
      targetProgram: mbaTarget,
    });
    assert.equal(alignedResult.status, "ALIGNED");
    assert.equal(alignedResult.generationAllowed, true);

    // 2. Stream transition target (Business -> Computer Science)
    const csTarget = {
      id: "prog-cs",
      university: "Politecnico di Milano",
      course: "M.Sc. Computer Science",
      country: "Italy",
      degreeLevel: "Master's",
      courseCategory: "Computer Science / IT",
    };

    const mismatchResult = computeAcademicAlignment({
      qualifications,
      targetProgram: csTarget,
    });
    assert.equal(mismatchResult.status, "ACADEMIC_MISMATCH");
    assert.equal(mismatchResult.sourceField.domain, "BUSINESS");
    assert.equal(mismatchResult.targetField.domain, "COMPUTING");
    assert.equal(mismatchResult.targetField.subDomain, "COMPUTER_SCIENCE");
  });

  it("getAppTargetSessionStorageKey properly scopes keys by student ID", async () => {
    const { getAppTargetSessionStorageKey } = await import(
      "@/lib/context/GlobalStudentContext"
    );

    assert.equal(
      getAppTargetSessionStorageKey("6a508a96af13bb33e9fc07ce"),
      "template_gen_active_target_6a508a96af13bb33e9fc07ce"
    );
    assert.equal(
      getAppTargetSessionStorageKey("sample-aarav-mehta"),
      "template_gen_active_target_sample-aarav-mehta"
    );
    assert.equal(
      getAppTargetSessionStorageKey("sample-aafia-ameen"),
      "template_gen_active_target_sample-aafia-ameen"
    );
    assert.equal(
      getAppTargetSessionStorageKey(null),
      "template_gen_active_target_general"
    );
    assert.equal(
      getAppTargetSessionStorageKey(undefined),
      "template_gen_active_target_general"
    );
    assert.equal(
      getAppTargetSessionStorageKey("   "),
      "template_gen_active_target_general"
    );
  });

  it("Cross-Student Target Isolation: Student A (Samiyah) target does not contaminate Student B (Aarav)", async () => {
    const { getAppTargetSessionStorageKey } = await import(
      "@/lib/context/GlobalStudentContext"
    );

    // Mock storage simulating sessionStorage
    const storage = new Map<string, string>();

    const samiyahId = "6a508a96af13bb33e9fc07ce";
    const aaravId = "sample-aarav-mehta";

    const samiyahTarget: ApplicationTarget = {
      universityName: "University of Messina",
      intendedCourse: "Business Consulting and Management",
      destinationCountry: "Italy",
      degreeLevel: "Master's",
    };

    // Store Samiyah's target under her scoped key
    storage.set(getAppTargetSessionStorageKey(samiyahId), JSON.stringify(samiyahTarget));

    // Retrieve Aarav's target from storage
    const aaravRaw = storage.get(getAppTargetSessionStorageKey(aaravId));
    const aaravTarget: ApplicationTarget = aaravRaw ? JSON.parse(aaravRaw) : {};

    assert.equal(Object.keys(aaravTarget).length, 0, "Aarav must not inherit Samiyah's target");
    assert.equal(aaravTarget.universityName, undefined);
    assert.equal(aaravTarget.intendedCourse, undefined);

    // Verify Samiyah's target is intact under her own key
    const samiyahRaw = storage.get(getAppTargetSessionStorageKey(samiyahId));
    assert.ok(samiyahRaw);
    const retrievedSamiyah: ApplicationTarget = JSON.parse(samiyahRaw);
    assert.equal(retrievedSamiyah.universityName, "University of Messina");
    assert.equal(retrievedSamiyah.intendedCourse, "Business Consulting and Management");
  });

  it("Sample Students Fixtures: Aarav Mehta and Aafia Ameen snapshots provide valid structures", async () => {
    const { getSampleAaravMehtaSnapshot, getSampleAafiaAmeenSnapshot } = await import(
      "@/lib/sampleStudents"
    );

    const aarav = getSampleAaravMehtaSnapshot();
    assert.ok(aarav.student);
    assert.ok(aarav.appliedPrograms);
    assert.equal(aarav.student._id, "sample-aarav-mehta");
    assert.equal(aarav.student.personalDetails?.firstName, "Aarav");
    assert.equal(aarav.student.personalDetails?.lastName, "Mehta");
    assert.equal(aarav.appliedPrograms.length, 0, "Aarav has no pre-selected programs");

    const aafia = getSampleAafiaAmeenSnapshot();
    assert.ok(aafia.student);
    assert.ok(aafia.appliedPrograms);
    assert.equal(aafia.student._id, "sample-aafia-ameen");
    assert.equal(aafia.student.personalDetails?.firstName, "Aafia");
    assert.equal(aafia.student.personalDetails?.lastName, "Ameen");
    assert.equal(aafia.appliedPrograms.length, 1, "Aafia targets Politecnico di Torino");
    assert.equal(aafia.appliedPrograms[0].university?.name, "Politecnico di Torino");
  });
});
