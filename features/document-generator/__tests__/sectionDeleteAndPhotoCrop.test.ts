import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { documentReducer } from "../state/documentReducer";
import {
  DEFAULT_PHOTO_CROP,
  clampPhotoCrop,
  computePhotoDrawRect,
} from "../utils/photoCrop";
import type { DocumentData } from "@/types";

describe("Europass Section Deletion (DELETE_SECTION)", () => {
  it("clears repeatable section entries and removes the key from sectionOrder", () => {
    const initial: DocumentData = {
      personal: { fullName: "Test Student" },
      education: [
        {
          id: "edu-1",
          qualification: "Grade 12th",
          institution: "K.D.B. Public School",
          endDate: "2024 - 04",
          finalGrade: "75.60%/100",
        },
      ],
      skills: [{ id: "sk-1", name: "TypeScript", proficiency: "Advanced" }],
      sectionOrder: ["aboutMe", "education", "skills"],
    };

    const afterEdu = documentReducer(initial, {
      type: "DELETE_SECTION",
      payload: "education",
    });
    assert.deepStrictEqual(afterEdu.education, []);
    assert.deepStrictEqual(afterEdu.sectionOrder, ["aboutMe", "skills"]);

    const afterSkills = documentReducer(afterEdu, {
      type: "DELETE_SECTION",
      payload: "skills",
    });
    assert.deepStrictEqual(afterSkills.skills, []);
    assert.deepStrictEqual(afterSkills.sectionOrder, ["aboutMe"]);
  });

  it("clears singleton section content and aliases from sectionOrder", () => {
    const initial: DocumentData = {
      personal: { fullName: "Test Student" },
      aboutMe: "Driven CS applicant",
      declaration: "I hereby declare...",
      sectionOrder: ["aboutMe", "declaration"],
    };

    const afterAbout = documentReducer(initial, {
      type: "DELETE_SECTION",
      payload: "about",
    });
    assert.strictEqual(afterAbout.aboutMe, "");
    assert.deepStrictEqual(afterAbout.sectionOrder, ["declaration"]);

    const afterDecl = documentReducer(afterAbout, {
      type: "DELETE_SECTION",
      payload: "declaration",
    });
    assert.strictEqual(afterDecl.declaration, "");
    assert.deepStrictEqual(afterDecl.sectionOrder, []);
  });
});

describe("Photo Reposition & Crop Geometry", () => {
  it("clamps extreme pan and zoom values within safe bounds", () => {
    assert.deepStrictEqual(clampPhotoCrop({ x: 120, y: -95, zoom: 5 }), {
      x: 60,
      y: -60,
      zoom: 2.5,
    });
    assert.deepStrictEqual(clampPhotoCrop({ x: Number.NaN, y: 12.345, zoom: 0.2 }), {
      x: 0,
      y: 12.35,
      zoom: 1,
    });
  });

  it("computes cover-fit centered rect at default crop and scaled/shifted rect at custom crop", () => {
    // Portrait image 600x900 inside 200x200 box at default zoom=1
    const base = computePhotoDrawRect(600, 900, 200, DEFAULT_PHOTO_CROP);
    assert.strictEqual(base.drawW, 200);
    assert.strictEqual(base.drawH, 300);
    assert.strictEqual(base.drawX, 0);
    assert.strictEqual(base.drawY, -50);

    // 2x zoom + +10% x / -10% y pan on 200px box -> +20px / -20px offset from centered 400x600 rect
    const zoomed = computePhotoDrawRect(600, 900, 200, {
      x: 10,
      y: -10,
      zoom: 2,
    });
    assert.strictEqual(zoomed.drawW, 400);
    assert.strictEqual(zoomed.drawH, 600);
    assert.strictEqual(zoomed.drawX, (200 - 400) / 2 + 20);
    assert.strictEqual(zoomed.drawY, (200 - 600) / 2 - 20);
  });
});

