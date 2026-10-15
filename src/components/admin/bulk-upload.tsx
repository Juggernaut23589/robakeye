"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { bulkUploadProducts } from "@/actions/products-admin";
import { Button } from "@/components/ui/button";

type Result = { row: number; sku?: string; ok: boolean; error?: string };

export function BulkUpload() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setResults(null);
    setError(null);
    setUploading(true);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        const result = await bulkUploadProducts(parsed.data);
        setUploading(false);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setResults(result.results);
        router.refresh();
      },
      error: (err) => {
        setUploading(false);
        setError(err.message);
      },
    });
  }

  return (
    <div className="rounded-rk-md border border-rk-n200 bg-white p-5">
      <h2 className="mb-2 font-semibold text-rk-navy">Bulk upload</h2>
      <p className="mb-3 text-xs text-rk-n600">
        CSV columns: sku, slug, name, vertical (PHARMACY/VETERINARY/SUPERMARKET), class (OTC/POM/CONTROLLED),
        categorySlug, priceNaira. Existing SKUs are updated; new ones are created.
      </p>
      <label>
        <Button asChild variant="outline" size="sm">
          <span>{uploading ? "Processing…" : "Choose CSV file"}</span>
        </Button>
        <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={uploading} className="hidden" />
      </label>

      {error && <p className="mt-3 text-sm text-rk-alert">{error}</p>}

      {results && (
        <div className="mt-4 max-h-56 overflow-y-auto text-sm">
          <p className="mb-1 text-rk-n600">
            {results.filter((r) => r.ok).length} succeeded, {results.filter((r) => !r.ok).length} failed
          </p>
          <ul className="grid gap-1">
            {results
              .filter((r) => !r.ok)
              .map((r) => (
                <li key={r.row} className="text-rk-alert">
                  Row {r.row} ({r.sku ?? "?"}): {r.error}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
