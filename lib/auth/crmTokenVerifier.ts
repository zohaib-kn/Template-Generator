/**
 * lib/auth/crmTokenVerifier.ts
 *
 * Verifies a CRM-issued operator token against the CRM's verification endpoint.
 * The expected request/response contract is documented in docs/crm-auth-contract.md.
 *
 * Fails closed: an unset endpoint, a timeout, a non-200 response or a malformed body
 * all mean "not authenticated". Tokens are never logged.
 */

import crypto from "crypto";
import type { OperatorSession } from "@/lib/auth/session";

const VERIFY_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 500;

/** Upper bound on session lifetime even if the CRM grants a longer one (8h). */
const MAX_SESSION_SECONDS = 8 * 60 * 60;

interface CrmVerifyResponse {
  valid?: boolean;
  user?: { id?: string; name?: string };
  allowedStudentIds?: string[] | "*";
  expiresAt?: string;
}

const cache = new Map<string, { session: OperatorSession; cachedAt: number }>();

function cacheKey(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function clearCrmTokenCache(): void {
  cache.clear();
}

export async function verifyCrmToken(token: string): Promise<OperatorSession | null> {
  const verifyUrl = process.env.CRM_AUTH_VERIFY_URL?.trim();
  if (!verifyUrl || !token || token.length > 4096) return null;

  const key = cacheKey(token);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.cachedAt < CACHE_TTL_MS && hit.session.exp * 1000 > Date.now()) {
    return hit.session;
  }

  let body: CrmVerifyResponse;
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
    const serviceKey = process.env.CRM_AUTH_SERVICE_KEY?.trim();
    if (serviceKey) headers["X-API-Key"] = serviceKey;

    const res = await fetch(verifyUrl, {
      method: "POST",
      headers,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (res.status !== 200) return null;
    body = (await res.json()) as CrmVerifyResponse;
  } catch {
    console.warn("[auth] CRM token verification failed (network, timeout or invalid JSON).");
    return null;
  }

  if (body?.valid !== true || typeof body.user?.id !== "string" || !body.user.id) return null;

  const allowed = body.allowedStudentIds;
  const students =
    allowed === "*" ? "*" : Array.isArray(allowed) ? allowed.filter((id): id is string => typeof id === "string") : [];

  const nowSec = Math.floor(Date.now() / 1000);
  const crmExp = body.expiresAt ? Math.floor(Date.parse(body.expiresAt) / 1000) : NaN;
  const exp = Number.isFinite(crmExp) ? Math.min(crmExp, nowSec + MAX_SESSION_SECONDS) : nowSec + MAX_SESSION_SECONDS;
  if (exp <= nowSec) return null;

  const session: OperatorSession = { sub: body.user.id, name: body.user.name, students, exp };

  if (cache.size >= MAX_CACHE_ENTRIES) cache.clear();
  cache.set(key, { session, cachedAt: Date.now() });
  return session;
}
