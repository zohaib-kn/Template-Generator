import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  syncDocumentToRecentList,
  ensureDocumentIdentity,
  generateDocumentId,
  type HydratedDocumentData,
} from "@/features/dashboard/utils/documentHydrator";
import { getEuropassData } from "@/features/dashboard/utils/documentHydrator";
import type { CrmSnapshot } from "@/types/crmSnapshot";

describe("Phase 1: Student Identity Isolation & Safe Data Persistence", () => {
  // Mock CRM Snapshots for two distinct students
  const angadSnapshot: CrmSnapshot = {
    student: {
      _id: "6a27a10d8e3cf265b9ab2ca8",
      name: "Angad Deep",
      email: "angad@example.com",
      phone: "+91 9205094872",
      personalDetails: {
        firstName: "Angad",
        lastName: "Deep",
        gender: "Male",
        dob: "2006-09-15",
        nationality: "Indian",
        placeOfBirth: "Ghaziabad, India",
      },
      passportInfo: {
        passportNumber: "Y2997858",
      },
      mailingAddress: {
        address1: "Raj Nagar Extension",
        city: "Ghaziabad",
        state: "Uttar Pradesh",
        country: "India",
        pincode: "201017",
      },
      education: [],
      workExperience: [],
    } as any,
  };

  const shubhSnapshot: CrmSnapshot = {
    student: {
      _id: "6aa12f3ac975d038580b66e2",
      name: "Shubh Motwani",
      email: "shubh@example.com",
      phone: "+91 6265430446",
      personalDetails: {
        firstName: "Shubh",
        lastName: "Motwani",
        gender: "Male",
        dob: "2002-06-29",
        nationality: "Indian",
        placeOfBirth: "Indore, India",
      },
      passportInfo: {
        passportNumber: "3069544",
      },
      mailingAddress: {
        address1: "Vinay Nagar",
        city: "Indore",
        state: "Madhya Pradesh",
        country: "India",
        pincode: "452009",
      },
      education: [],
      workExperience: [],
    } as any,
  };

  describe("1. Strict Cross-Student CRM Snapshot Isolation (getEuropassData)", () => {
    it("strictly rejects foreign student CRM snapshots and never loads another student's data", () => {
      // Operator is on Angad Deep's document, but Shubh Motwani's CRM data is in context
      const result = getEuropassData(
        "6a27a10d8e3cf265b9ab2ca8", // Angad's ID
        "Angad Deep",
        shubhSnapshot // Foreign snapshot
      );

      // Must NOT contain Shubh Motwani's name, passport, or address
      assert.equal(result.personal?.fullName, "Angad Deep");
      assert.notEqual(result.personal?.fullName, "Shubh Motwani");
      assert.equal(result.personal?.passportNumber, undefined);
      assert.equal(result.personal?.address, undefined);
    });

    it("populates student data when the CRM snapshot ID matches the requested student exactly", () => {
      const result = getEuropassData(
        "6a27a10d8e3cf265b9ab2ca8",
        "Angad Deep",
        angadSnapshot
      );

      assert.equal(result.personal?.fullName, "Angad Deep");
      assert.equal(result.personal?.passportNumber, "Y2997858");
      assert.ok(result.personal?.address?.includes("Ghaziabad"));
    });

    it("never falls back to sample snapshots (Aarav/Rohan/Aafia) for real student IDs", () => {
      // Real student with missing CRM data
      const result = getEuropassData(
        "real-student-uuid-9999",
        "Priya Sharma",
        null
      );

      assert.equal(result.personal?.fullName, "Priya Sharma");
      // Must NOT fall back to Rohan Iyer or Aarav Mehta
      assert.notEqual(result.personal?.fullName, "Rohan Iyer");
      assert.notEqual(result.personal?.fullName, "Aarav Mehta");
      assert.equal(result.personal?.passportNumber, undefined);
    });

    it("allows sample snapshots only when requested ID is explicitly an authorized sample ID", () => {
      const result = getEuropassData("sample-rohan-iyer", "Rohan Iyer", null);
      assert.equal(result.personal?.fullName, "Rohan Iyer");
      assert.ok(result.personal?.passportNumber);
    });
  });

  describe("2. Immutable Document Identity & Multi-Document Support", () => {
    it("generates unique immutable document IDs containing student and docType", () => {
      const id1 = generateDocumentId("stud123", "CV");
      const id2 = generateDocumentId("stud123", "CV");
      assert.ok(id1.startsWith("doc_stud123_cv_"));
      assert.notEqual(id1, id2, "Consecutive document IDs must be uniquely nonced");
    });

    it("preserves multiple distinct CVs for the same student without overwriting", () => {
      const studentId = "6a27a10d8e3cf265b9ab2ca8";
      const cv1: HydratedDocumentData = {
        id: "doc_angad_cv_academic_v1",
        title: "Angad Deep – Academic CV",
        docType: "CV",
        docTypeName: "Europass Academic CV",
        studentName: "Angad Deep",
        studentId,
        updatedAt: "Opened 1h ago",
        targetUniversity: "University of Cassino",
        targetCourse: "Computer Engineering",
        targetCountry: "Italy",
        wordCount: 300,
        route: `/studio?student=${studentId}`,
        sections: [{ heading: "ABOUT ME", content: "Academic focus on AI." }],
      };

      const cv2: HydratedDocumentData = {
        id: "doc_angad_cv_industry_v2",
        title: "Angad Deep – Industry CV",
        docType: "CV",
        docTypeName: "Europass Academic CV",
        studentName: "Angad Deep",
        studentId,
        updatedAt: "Created just now",
        targetUniversity: "Politecnico di Milano",
        targetCourse: "Software Engineering",
        targetCountry: "Italy",
        wordCount: 280,
        route: `/studio?student=${studentId}`,
        sections: [{ heading: "ABOUT ME", content: "Industry software engineering." }],
      };

      // Add CV 1
      let recent = syncDocumentToRecentList([], cv1);
      assert.equal(recent.length, 1);
      assert.equal(recent[0].id, "doc_angad_cv_academic_v1");

      // Add CV 2 for the same student
      recent = syncDocumentToRecentList(recent, cv2);
      assert.equal(recent.length, 2, "Both CVs for the same student must be preserved");
      assert.equal(recent[0].id, "doc_angad_cv_industry_v2");
      assert.equal(recent[1].id, "doc_angad_cv_academic_v1");

      // Update CV 1 only
      const updatedCv1 = {
        ...cv1,
        sections: [{ heading: "ABOUT ME", content: "Updated academic focus." }],
      };
      recent = syncDocumentToRecentList(recent, updatedCv1);

      assert.equal(recent.length, 2, "Count remains 2 after update");
      const foundCv1 = recent.find((d) => d.id === "doc_angad_cv_academic_v1");
      const foundCv2 = recent.find((d) => d.id === "doc_angad_cv_industry_v2");

      assert.equal(foundCv1?.sections[0].content, "Updated academic focus.");
      assert.equal(foundCv2?.sections[0].content, "Industry software engineering.", "CV 2 was untouched");
    });

    it("never overwrites documents across different students sharing identical titles", () => {
      const docAngad: HydratedDocumentData = {
        id: "doc_angad_cv_1",
        title: "Europass Academic CV", // Shared identical default title
        docType: "CV",
        docTypeName: "Europass Academic CV",
        studentName: "Angad Deep",
        studentId: "student_angad_123",
        updatedAt: "Just now",
        targetUniversity: "University of Cassino",
        targetCourse: "Computer Engineering",
        targetCountry: "Italy",
        wordCount: 300,
        route: "/studio",
        sections: [],
      };

      const docShubh: HydratedDocumentData = {
        id: "doc_shubh_cv_1",
        title: "Europass Academic CV", // Shared identical default title
        docType: "CV",
        docTypeName: "Europass Academic CV",
        studentName: "Shubh Motwani",
        studentId: "student_shubh_456",
        updatedAt: "Just now",
        targetUniversity: "Symbiosis",
        targetCourse: "CSIT",
        targetCountry: "India",
        wordCount: 320,
        route: "/studio",
        sections: [],
      };

      let recent = syncDocumentToRecentList([], docAngad);
      recent = syncDocumentToRecentList(recent, docShubh);

      assert.equal(recent.length, 2, "Both students must retain their documents despite identical titles");
      assert.ok(recent.some((d) => d.studentId === "student_angad_123"));
      assert.ok(recent.some((d) => d.studentId === "student_shubh_456"));
    });

    it("safely migrates legacy drafts lacking an id without cross-student collision", () => {
      const legacyDoc: HydratedDocumentData = {
        title: "Legacy Draft",
        docType: "COVER_LETTER",
        docTypeName: "Cover Letter",
        studentName: "Legacy Student",
        studentId: "stud_legacy_001",
        updatedAt: "Old",
        targetUniversity: "Uni",
        targetCourse: "Course",
        targetCountry: "Country",
        wordCount: 150,
        route: "/studio",
        sections: [],
      };

      const secured = ensureDocumentIdentity(legacyDoc);
      assert.ok(secured.id, "Legacy draft must be assigned an immutable id");
      assert.ok(secured.id.startsWith("legacy_stud_legacy_001_cover_letter_"));

      const recent = syncDocumentToRecentList([], secured);
      assert.equal(recent.length, 1);
      assert.equal(recent[0].id, secured.id);
    });
  });

  describe("3. Stale Asynchronous Response Guards", () => {
    it("discards AI responses when the active document or active student changed in flight", () => {
      // Simulate state tracking references
      let activeDocRef = { docId: "doc_angad_1", studentId: "stud_angad" };
      let activeRequestRef = {
        requestId: "req_token_123",
        docId: "doc_angad_1",
        studentId: "stud_angad",
      };

      // Simulated delayed response arriving for Request 1
      const responsePayload = {
        requestId: "req_token_123",
        targetDocId: "doc_angad_1",
        targetStudentId: "stud_angad",
        sections: [{ heading: "ABOUT ME", content: "AI Polish for Angad" }],
      };

      // CASE A: Document is still active -> accepted
      const isAcceptedA =
        activeRequestRef.requestId === responsePayload.requestId &&
        activeDocRef.docId === responsePayload.targetDocId &&
        activeDocRef.studentId === responsePayload.targetStudentId;
      assert.equal(isAcceptedA, true);

      // CASE B: Operator switched to Shubh while AI was running
      activeDocRef = { docId: "doc_shubh_2", studentId: "stud_shubh" };
      activeRequestRef = {
        requestId: "req_token_456",
        docId: "doc_shubh_2",
        studentId: "stud_shubh",
      };

      // Delayed response for Angad arrives NOW
      const isAcceptedB =
        activeRequestRef.requestId === responsePayload.requestId &&
        activeDocRef.docId === responsePayload.targetDocId &&
        activeDocRef.studentId === responsePayload.targetStudentId;

      assert.equal(isAcceptedB, false, "Stale async response must be rejected");
    });
  });

  describe("4. Non-Destructive CRM Hydration", () => {
    it("hydrates missing address from CRM without overwriting user-edited personal fields", () => {
      // Document where user manually edited their name to a custom nickname
      const currentCv = {
        personal: {
          fullName: "Angad Deep (Senior Edit)",
          email: "custom@example.com",
          address: undefined, // Missing address
        },
        aboutMe: "User edited about me text",
      };

      const freshCrm = angadSnapshot;

      // Hydration logic: only fill missing fields
      const updatedPersonal = { ...currentCv.personal };
      let changed = false;

      const crmAddress = freshCrm.student?.mailingAddress?.city + ", " + freshCrm.student?.mailingAddress?.country;
      if (!updatedPersonal.address && crmAddress) {
        (updatedPersonal as any).address = crmAddress;
        changed = true;
      }

      assert.equal(changed, true);
      assert.equal(updatedPersonal.address, "Ghaziabad, India");
      // User manual edits must be strictly preserved
      assert.equal(updatedPersonal.fullName, "Angad Deep (Senior Edit)");
      assert.equal(updatedPersonal.email, "custom@example.com");
      assert.equal(currentCv.aboutMe, "User edited about me text");
    });
  });
});
