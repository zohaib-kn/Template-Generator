/**
 * /auth/required — shown when there is no valid operator session.
 * Operators sign in by opening the Template Generator from the CRM.
 */

const REASONS: Record<string, string> = {
  missing_token: "The sign-in link did not include a CRM token.",
  invalid_token: "Your CRM sign-in link is invalid or has expired.",
  server_config: "Sign-in is not configured on this server. Contact an administrator.",
};

export default async function AuthRequiredPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const detail = (reason && REASONS[reason]) || "Your session has expired or you are not signed in.";

  return (
    <main className="min-h-full flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Sign-in required</h1>
        <p className="mt-2 text-sm text-slate-600">{detail}</p>
        <p className="mt-4 text-sm text-slate-600">
          Open the Template Generator from the CRM to start a new session.
        </p>
      </div>
    </main>
  );
}
