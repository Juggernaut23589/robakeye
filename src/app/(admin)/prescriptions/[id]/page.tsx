import { notFound } from "next/navigation";
import { getPrescriptionForReview } from "@/actions/prescriptions";
import { ZoomableImage } from "@/components/prescriptions/zoomable-image";
import { PrescriptionLineDecision } from "@/components/prescriptions/line-decision";
import { Badge } from "@/components/ui/badge";

export default async function PrescriptionReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prescription = await getPrescriptionForReview(id);
  if (!prescription) notFound();

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="font-display text-2xl font-bold text-rk-navy">
        Prescription — {prescription.user.name}
      </h1>
      <p className="text-sm text-rk-n600">
        {prescription.user.email} · for <b className="text-rk-navy">{prescription.branch.name}</b>
      </p>

      <div className="mt-6 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 font-display text-sm font-bold text-rk-navy">Prescription image</h2>
          {prescription.imageUrl ? (
            <ZoomableImage src={prescription.imageUrl} alt="Prescription" />
          ) : (
            <p className="rounded-rk-md border border-dashed border-rk-n200 p-6 text-center text-sm text-rk-n600">
              Image preview unavailable — Cloudinary isn&apos;t configured in this environment.
            </p>
          )}
        </div>

        <div>
          <h2 className="mb-2 font-display text-sm font-bold text-rk-navy">Line items</h2>
          <div className="grid gap-3">
            {prescription.lines.map((line) => (
              <PrescriptionLineDecision key={line.id} line={line} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-2 font-display text-sm font-bold text-rk-navy">Decision history</h2>
        {prescription.audit.length === 0 ? (
          <p className="text-sm text-rk-n600">No decisions yet.</p>
        ) : (
          <ul className="grid gap-1.5 text-sm">
            {prescription.audit.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <Badge variant={a.action.includes("REJECT") ? "alert" : "success"}>
                  {a.action}
                </Badge>
                <span className="text-rk-n600">{new Date(a.createdAt).toLocaleString()}</span>
                {a.note && <span className="text-rk-ink">— {a.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
