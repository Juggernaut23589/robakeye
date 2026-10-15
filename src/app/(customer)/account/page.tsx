import Link from "next/link";
import { auth } from "@/lib/auth";

const LINKS = [
  { href: "/account/pets", label: "My pets" },
  { href: "/account/appointments", label: "My appointments" },
  { href: "/account/prescriptions", label: "My prescriptions" },
  { href: "/account/reviews", label: "Reviews" },
  { href: "/account/security", label: "Sessions & security" },
];

export default async function AccountPage() {
  const session = await auth();

  return (
    <main className="p-8">
      <h1 className="mb-1 font-display text-2xl font-bold text-rk-navy">
        Welcome, {session?.user?.name}
      </h1>
      <p className="mb-6 text-rk-n600">Order tracking and saved addresses are still on the roadmap.</p>
      <div className="grid max-w-sm gap-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-rk-md border border-rk-n200 px-4 py-3 text-sm text-rk-navy hover:bg-rk-n50"
          >
            {l.label} →
          </Link>
        ))}
      </div>
    </main>
  );
}
