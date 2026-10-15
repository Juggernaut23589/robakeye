"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getUploadSignature, submitPrescription } from "@/actions/prescriptions";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB per the brief
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export function PrescriptionUploadForm({ initialProductId }: { initialProductId?: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Only JPG, PNG or PDF files are accepted.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("File is larger than 10MB.");
      return;
    }
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !initialProductId) {
      setError("Choose a file first.");
      return;
    }
    setUploading(true);
    setError(null);

    const sig = await getUploadSignature();
    if (!sig.ok) {
      setUploading(false);
      setError(sig.error);
      return;
    }

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey!);
      form.append("timestamp", String(sig.timestamp));
      form.append("signature", sig.signature);
      form.append("folder", sig.folder);
      form.append("type", "private");

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`, {
        method: "POST",
        body: form,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error?.message ?? "Upload failed");

      const result = await submitPrescription({
        imagePublicId: uploadData.public_id,
        lines: [{ productId: initialProductId, quantity }],
      });
      setUploading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/account/prescriptions");
    } catch (err) {
      setUploading(false);
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-rk-md border border-rk-n200 p-4">
      <label className="grid gap-1 text-sm">
        Prescription file (JPG, PNG or PDF, max 10MB)
        <input
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={onFileChange}
          className="rounded-rk-sm border border-rk-n200 px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Quantity
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-24 rounded-rk-sm border border-rk-n200 px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-rk-alert">{error}</p>}
      <Button type="submit" variant="amber" disabled={!file} loading={uploading} className="w-fit">
        Submit for review
      </Button>
    </form>
  );
}
