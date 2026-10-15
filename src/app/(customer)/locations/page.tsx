import { prisma } from "@/lib/prisma";

export default async function LocationsPage() {
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="font-display text-2xl font-bold text-rk-navy">Our Locations</h1>
      <div className="mt-6 grid gap-4">
        {branches.map((b) => (
          <div key={b.id} id={b.slug} className="rounded-rk-md border border-rk-n200 p-4">
            <h2 className="font-display text-lg font-bold text-rk-navy">{b.name}</h2>
            <p className="text-sm text-rk-n600">{b.address}</p>
            <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
              {b.services.map((s) => (
                <span key={s} className="rounded-rk-pill bg-rk-navy-tint px-2 py-0.5 text-rk-navy">
                  {s}
                </span>
              ))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
