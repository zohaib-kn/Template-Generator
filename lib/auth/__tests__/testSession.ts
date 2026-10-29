/**
 * Test helper: signs a real operator session cookie so route tests exercise the
 * production auth path instead of a bypass.
 */
import { encodeSession, SESSION_COOKIE_NAME, type OperatorSession } from "@/lib/auth/session";

export const TEST_SESSION_SECRET = "test-session-secret-0123456789abcdef-0123456789";

export function testSessionCookie(students: OperatorSession["students"] = "*", sub = "test-operator"): string {
  process.env.SESSION_SECRET = TEST_SESSION_SECRET;
  const value = encodeSession({ sub, students, exp: Math.floor(Date.now() / 1000) + 3600 });
  if (!value) throw new Error("Failed to sign test session");
  return `${SESSION_COOKIE_NAME}=${value}`;
}
