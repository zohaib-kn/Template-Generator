/**
 * features/document-generator/__tests__/educationDetailsSequence.test.ts
 *
 * Tests for the required sequence in Education and Training:
 * 1. Address
 * 2. Website URL (clickable)
 * 3. Final grade
 * Followed by Subjects, Language of instruction, and other details.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getInstitutionWebsite } from "../utils/institutionWebsites";
import { getOrderedEducationParts } from "../utils/educationSequence";
import { mapNormalizedToResume } from "@/services/normalization/mapNormalizedToResume";
import type { NormalizedStudentProfile } from "@/types/normalizedStudent";
import type { EducationEntry } from "@/types";

describe("Education and Training sequence: Address -> Website URL -> Final grade", () => {
  it("TEST 1: getInstitutionWebsite identifies known schools and universities", () => {
    assert.strictEqual(
      getInstitutionWebsite("K.d.b. Public School"),
      "https://www.kdbpublicschool.com"
    );
    assert.strictEqual(
      getInstitutionWebsite("KDB Public School"),
      "https://www.kdbpublicschool.com"
    );
    assert.strictEqual(
      getInstitutionWebsite("Bal Bhawan School"),
      "https://www.balbhawanschool.in"
    );
    assert.strictEqual(
      getInstitutionWebsite("Rizvi Law College"),
      "https://www.rizvilawcollege.edu.in"
    );
    assert.strictEqual(
      getInstitutionWebsite("Unknown School XYZ"),
      undefined
    );
  });

  it("TEST 2: mapNormalizedToResume constructs description in sequence Address -> Website -> Final grade", () => {
    const profile = {
      personal: { fullName: "Angad Deep", firstName: "Angad", lastName: "Deep", email: "angad@example.com" },
      academics: {
        qualifications: [
          {
            id: "qual-1",
            levelOfStudy: "Grade 10th",
            institution: "K.d.b. Public School",
            city: "Ghaziabad",
            country: "India",
            score: "93.80%",
            gradingSystem: "100",
            subjects: "Artificial Intelligence, English, Hindi, Mathematics, Science, Social Science",
            primaryLanguage: "English",
          },
          {
            id: "qual-2",
            levelOfStudy: "Grade 12th",
            institution: "K.d.b. Public School",
            city: "Ghaziabad",
            country: "India",
            score: "75.60%",
            gradingSystem: "100",
            subjects: "Computer Science, English, Chemistry, Physics, Mathematics",
            primaryLanguage: "English",
          },
        ],
      },
    };

    const { student } = mapNormalizedToResume(profile as unknown as NormalizedStudentProfile);
    const edu = student.education ?? [];
    assert.strictEqual(edu.length, 2);

    // Verify Entry 1
    const entry1 = edu[0];
    assert.ok(entry1.description);
    const parts1 = entry1.description.split(" | ");

    // Sequence check: Address first, Website second, Final grade third
    assert.strictEqual(parts1[0], "Address: Ghaziabad, India");
    assert.strictEqual(parts1[1], "Website: https://www.kdbpublicschool.com");
    assert.strictEqual(parts1[2], "Final grade: 93.80%/100");
    assert.strictEqual(parts1[3], "Subjects: Artificial Intelligence, English, Hindi, Mathematics, Science, Social Science");
    assert.strictEqual(parts1[4], "Language of instruction: English");

    // Also check direct properties
    assert.strictEqual(entry1.address, "Ghaziabad, India");
    assert.strictEqual(entry1.website, "https://www.kdbpublicschool.com");
    assert.strictEqual(entry1.finalGrade, "93.80%/100");

    // Verify Entry 2
    const entry2 = edu[1];
    assert.ok(entry2.description);
    const parts2 = entry2.description.split(" | ");
    assert.strictEqual(parts2[0], "Address: Ghaziabad, India");
    assert.strictEqual(parts2[1], "Website: https://www.kdbpublicschool.com");
    assert.strictEqual(parts2[2], "Final grade: 75.60%/100");
  });

  it("TEST 3: getOrderedEducationParts re-sequences legacy description to Address -> Website -> Final grade", () => {
    // Simulates student already in session state with the old format from user's screenshot
    const legacyEntry: EducationEntry = {
      id: "edu-legacy-1",
      institution: "K.d.b. Public School",
      qualification: "Grade 10th",
      description:
        "Score: 93.80%/100 | Subjects: Artificial Intelligence, English, Hindi, Mathematics, Science, Social Science | Language of instruction: English | City: Ghaziabad",
    };

    const ordered = getOrderedEducationParts(legacyEntry);

    // 1. Address
    assert.strictEqual(ordered[0], "Address: Ghaziabad");
    // 2. Website URL (looked up for K.d.b. Public School)
    assert.strictEqual(ordered[1], "Website: https://www.kdbpublicschool.com");
    // 3. Final grade
    assert.strictEqual(ordered[2], "Final grade: 93.80%/100");
    // 4. Subjects
    assert.strictEqual(
      ordered[3],
      "Subjects: Artificial Intelligence, English, Hindi, Mathematics, Science, Social Science"
    );
    // 5. Language of instruction
    assert.strictEqual(ordered[4], "Language of instruction: English");
  });

  it("TEST 4: getOrderedEducationParts prioritizes explicit fields and does not duplicate", () => {
    const entry: EducationEntry = {
      id: "edu-custom-1",
      institution: "Bal Bhawan School",
      qualification: "Grade 12th",
      address: "Bhopal, MP, India",
      website: "https://www.balbhawanschool.in",
      finalGrade: "94/100",
      description: "Subjects: Physics, Chemistry, Mathematics | Language of instruction: English",
    };

    const ordered = getOrderedEducationParts(entry);
    assert.strictEqual(ordered[0], "Address: Bhopal, MP, India");
    assert.strictEqual(ordered[1], "Website: https://www.balbhawanschool.in");
    assert.strictEqual(ordered[2], "Final grade: 94/100");
    assert.strictEqual(ordered[3], "Subjects: Physics, Chemistry, Mathematics");
    assert.strictEqual(ordered[4], "Language of instruction: English");
  });
});
