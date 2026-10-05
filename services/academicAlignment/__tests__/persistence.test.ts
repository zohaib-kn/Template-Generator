/**
 * services/academicAlignment/__tests__/persistence.test.ts
 *
 * Test suite for Academic Alignment Persistence & API Layer (Phase 2).
 *
 * Tests:
 * 1. GET with missing studentId / programId returns 400
 * 2. POST with missing required fields returns 400
 * 3. POST with invalid resolution enum returns 400
 * 4. POST with INTENTIONAL_CONFIRMED but missing reason returns 400
 * 5. DELETE with missing parameters returns 400
 * 6. Resolution lifecycle: GET (null) -> POST (create) -> GET (persisted) -> DELETE (cleared) -> GET (null)
 */

(process.env as Record<string, string | undefined>).NODE_ENV = "test";

import test, { describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  GET,
  POST,
  DELETE,
  clearTestMemoryResolutions,
} from "@/app/api/academic-alignment/route";

function makeGetRequest(studentId?: string, programId?: string): NextRequest {
  const url = new URL("http://localhost:3000/api/academic-alignment");
  if (studentId !== undefined) url.searchParams.set("studentId", studentId);
  if (programId !== undefined) url.searchParams.set("programId", programId);
  return new NextRequest(url.toString(), { method: "GET" });
}

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/academic-alignment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(studentId?: string, programId?: string): NextRequest {
  const url = new URL("http://localhost:3000/api/academic-alignment");
  if (studentId !== undefined) url.searchParams.set("studentId", studentId);
  if (programId !== undefined) url.searchParams.set("programId", programId);
  return new NextRequest(url.toString(), { method: "DELETE" });
}

describe("Academic Alignment Persistence & API Layer (Phase 2)", () => {
  beforeEach(() => {
    clearTestMemoryResolutions();
  });

  test("1. GET with missing studentId or programId returns 400", async () => {
    const res1 = await GET(makeGetRequest());
    assert.equal(res1.status, 400);

    const res2 = await GET(makeGetRequest("student-123"));
    assert.equal(res2.status, 400);

    const res3 = await GET(makeGetRequest(undefined, "prog-456"));
    assert.equal(res3.status, 400);
  });

  test("2. POST with missing studentId or programId returns 400", async () => {
    const res = await POST(
      makePostRequest({
        resolution: "INTENTIONAL_CONFIRMED",
      })
    );
    assert.equal(res.status, 400);
  });

  test("3. POST with invalid resolution enum returns 400", async () => {
    const res = await POST(
      makePostRequest({
        studentId: "student-1",
        programId: "prog-1",
        resolution: "INVALID_STATUS_VALUE",
      })
    );
    assert.equal(res.status, 400);
  });

  test("4. POST with INTENTIONAL_CONFIRMED but missing reason returns 400", async () => {
    const res = await POST(
      makePostRequest({
        studentId: "student-1",
        programId: "prog-1",
        resolution: "INTENTIONAL_CONFIRMED",
        transitionContext: {
          reason: "   ",
        },
      })
    );
    assert.equal(res.status, 400);
  });

  test("5. DELETE with missing parameters returns 400", async () => {
    const res = await DELETE(makeDeleteRequest());
    assert.equal(res.status, 400);
  });

  test("6. Full resolution lifecycle: GET(null) -> POST -> GET(saved) -> DELETE -> GET(null)", async () => {
    const studentId = "test-stu-99";
    const programId = "test-prog-88";

    // 1. Initial GET should return resolution: null
    const getRes1 = await GET(makeGetRequest(studentId, programId));
    assert.equal(getRes1.status, 200);
    const body1 = await getRes1.json();
    assert.equal(body1.success, true);
    assert.equal(body1.resolution, null);

    // 2. POST to save resolution
    const postRes = await POST(
      makePostRequest({
        studentId,
        programId,
        sourceQualificationSnapshot: "Bachelor of Commerce",
        targetCourseSnapshot: "MSc Data Science",
        resolution: "INTENTIONAL_CONFIRMED",
        transitionContext: {
          reason: "Completed 2 industry data analytics certifications and practical SQL projects.",
          selectedCertifications: ["cert-1"],
        },
      })
    );
    assert.equal(postRes.status, 200);
    const postBody = await postRes.json();
    assert.equal(postBody.success, true);
    assert.ok(postBody.resolution);
    assert.equal(postBody.resolution.studentId, studentId);
    assert.equal(postBody.resolution.programId, programId);
    assert.equal(postBody.resolution.resolution, "INTENTIONAL_CONFIRMED");

    // 3. GET should now return the saved resolution
    const getRes2 = await GET(makeGetRequest(studentId, programId));
    assert.equal(getRes2.status, 200);
    const body2 = await getRes2.json();
    assert.equal(body2.success, true);
    assert.equal(body2.resolution.studentId, studentId);
    assert.equal(body2.resolution.resolution, "INTENTIONAL_CONFIRMED");
    assert.equal(
      body2.resolution.transitionContext.reason,
      "Completed 2 industry data analytics certifications and practical SQL projects."
    );

    // 4. DELETE should remove the resolution
    const delRes = await DELETE(makeDeleteRequest(studentId, programId));
    assert.equal(delRes.status, 200);
    const delBody = await delRes.json();
    assert.equal(delBody.success, true);
    assert.equal(delBody.deleted, true);

    // 5. Subsequent GET should return null again
    const getRes3 = await GET(makeGetRequest(studentId, programId));
    assert.equal(getRes3.status, 200);
    const body3 = await getRes3.json();
    assert.equal(body3.success, true);
    assert.equal(body3.resolution, null);
  });
});
