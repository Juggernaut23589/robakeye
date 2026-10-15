import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listMySessions } from "@/actions/sessions";
import { SessionManager } from "@/components/ui/session-manager";
import { TwoFactorSetup } from "@/components/ui/two-factor-setup";

export default async function AdminSecurityPage() {
  const session = await auth();
  const sessions = await listMySessions();
  const dbUser = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { twoFactorEnabled: true },
      })
    : null;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="font-display text-2xl font-bold text-rk-navy">Security</h1>

      <section className="mt-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-rk-ink">
          Two-factor authentication
        </h2>
        <TwoFactorSetup initiallyEnabled={dbUser?.twoFactorEnabled ?? false} />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-display text-lg font-semibold text-rk-ink">Active sessions</h2>
        <SessionManager sessions={sessions} currentSessionId={session?.sessionId ?? null} />
      </section>
    </main>
  );
}
