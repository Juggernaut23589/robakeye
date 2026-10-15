export default function ForbiddenPage() {
  return (
    <main className="p-8">
      <h1 className="font-display text-2xl font-bold text-rk-alert">Access denied</h1>
      <p className="text-rk-n600">
        Your role doesn&apos;t have permission to view that page. Contact a branch manager or
        superadmin if you believe this is a mistake.
      </p>
    </main>
  );
}
