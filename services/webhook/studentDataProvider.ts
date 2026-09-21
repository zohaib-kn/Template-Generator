/**
 * services/webhook/studentDataProvider.ts
 *
 * Student data retrieval provider for the Unified Webhook.
 *
 * Supports:
 * - Mode A: Inline student data payload (InlineStudentDataProvider)
 * - Mode B: Upstream Senior CRM API fetch + dev cache fallback (CrmApiStudentDataProvider)
 */

import type { CrmSnapshot } from "@/types/crmSnapshot";
import kaavyaSnapshot from "@/features/document-generator/utils/crmSnapshot_Kaavya.json";
import fardeeSnapshot from "@/features/document-generator/utils/crmSnapshot_Fardee.json";

export class StudentNotFoundError extends Error {
  constructor(public readonly studentId: string, message?: string) {
    super(message || `Student not found for ID "${studentId}".`);
    this.name = "StudentNotFoundError";
  }
}

export interface StudentDataProvider {
  getStudent(studentId: string): Promise<CrmSnapshot>;
}

/**
 * Mode A: Consumes inline studentData passed directly in webhook payload.
 */
export class InlineStudentDataProvider implements StudentDataProvider {
  constructor(private readonly inlineData: unknown) {}

  async getStudent(studentId: string): Promise<CrmSnapshot> {
    if (!this.inlineData || typeof this.inlineData !== "object") {
      throw new StudentNotFoundError(
        studentId,
        "Inline studentData payload is missing or invalid."
      );
    }

    const payload = this.inlineData as Record<string, unknown>;

    // Support both raw snapshot and { success: true, data: CrmSnapshot } wrapper
    if ("data" in payload && typeof payload.data === "object" && payload.data !== null) {
      return payload.data as CrmSnapshot;
    }

    if ("student" in payload) {
      return payload as unknown as CrmSnapshot;
    }

    throw new StudentNotFoundError(
      studentId,
      "Inline studentData payload does not contain a valid student snapshot structure."
    );
  }
}

/**
 * Mode B: Fetches live snapshot from Senior's CRM API with fallback to cached development fixtures.
 */
export class CrmApiStudentDataProvider implements StudentDataProvider {
  async getStudent(studentId: string): Promise<CrmSnapshot> {
    const trimmedId = studentId?.trim();
    if (!trimmedId) {
      throw new StudentNotFoundError(studentId, "Empty studentId provided.");
    }

    // 1. Development cached fixture check (fast & offline resilient)
    const normalized = trimmedId.toLowerCase();
    if (normalized === "6a508a96af13bb33e9fc07ce") {
      return kaavyaSnapshot as unknown as CrmSnapshot;
    }
    if (normalized === "69e600e750f7c6e4051f547e") {
      return fardeeSnapshot as unknown as CrmSnapshot;
    }

    // 2. Live upstream fetch
    const baseUrl = process.env.SENIOR_API_BASE_URL?.trim();
    const apiKey = process.env.SENIOR_API_KEY?.trim();

    if (!baseUrl || !apiKey) {
      throw new StudentNotFoundError(
        studentId,
        `Student "${trimmedId}" not found in local cache and Senior CRM API credentials are not configured.`
      );
    }

    const targetUrl = `${baseUrl}/api/students/${trimmedId}/data-snapshot?key=${apiKey}`;

    try {
      const res = await fetch(targetUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (res.status === 404) {
        throw new StudentNotFoundError(
          trimmedId,
          `Student with ID "${trimmedId}" was not found in Senior CRM.`
        );
      }

      if (!res.ok) {
        throw new Error(
          `Senior CRM API returned HTTP ${res.status}: ${res.statusText}`
        );
      }

      const json = await res.json();
      if (!json || typeof json !== "object") {
        throw new Error("Senior CRM API returned malformed response.");
      }

      return json as CrmSnapshot;
    } catch (err: unknown) {
      if (err instanceof StudentNotFoundError) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new StudentNotFoundError(
        trimmedId,
        `Failed to retrieve student "${trimmedId}" from Senior CRM: ${msg}`
      );
    }
  }
}
