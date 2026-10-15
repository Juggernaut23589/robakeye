import { auth } from "@/lib/auth";
import { listMySessions } from "@/actions/sessions";
import { SessionManager } from "@/components/ui/session-manager";

export default async function AccountSecurityPage() {
  const session = await auth();
  const sessions = await listMySessions();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="font-display text-2xl font-bold text-rk-navy">Active sessions</h1>
      <p className="mb-6 text-rk-n600">
        Devices currently signed in to your Robakeye account.
      </p>
      <SessionManager sessions={sessions} currentSessionId={session?.sessionId ?? null} />
    </main>
  );
}
