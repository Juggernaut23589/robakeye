import { verifyEmail } from "@/actions/auth";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;

  if (!email || !token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6 text-center">
        <p className="text-rk-alert">This verification link is missing required information.</p>
      </main>
    );
  }

  const result = await verifyEmail(email, token);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6 text-center">
      {result.ok ? (
        <>
          <h1 className="font-display text-2xl font-bold text-rk-navy">Email verified</h1>
          <p className="text-rk-n600">Your account is active. You can now sign in.</p>
          <a href="/login" className="text-rk-blue">
            Sign in
          </a>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-bold text-rk-alert">
            Link invalid or expired
          </h1>
          <p className="text-rk-n600">{result.error}</p>
          <a href="/login" className="text-rk-blue">
            Back to sign in
          </a>
        </>
      )}
    </main>
  );
}
