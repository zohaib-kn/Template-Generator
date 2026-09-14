/**
 * Generates a short, collision-resistant client-side identifier.
 *
 * Used to key repeatable list entries (EducationEntry.id, SkillEntry.id, …)
 * so React can reconcile list items correctly.
 *
 * This is NOT a UUID. It is intentionally short and fast for client-side use.
 * Once backend persistence is added, the authoritative ID will come from the server.
 */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
