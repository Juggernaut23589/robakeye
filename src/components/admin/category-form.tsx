"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCategory } from "@/actions/products-admin";
import { Button } from "@/components/ui/button";

export function CategoryForm({ parents }: { parents: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [vertical, setVertical] = useState<"PHARMACY" | "VETERINARY" | "SUPERMARKET">("SUPERMARKET");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createCategory({ name, slug, vertical, parentId: parentId || undefined });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    setSlug("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-rk-md border border-rk-n200 bg-white p-5 sm:grid-cols-5 sm:items-end sm:gap-2">
      <label className="text-xs text-rk-n600">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5" />
      </label>
      <label className="text-xs text-rk-n600">
        Slug
        <input value={slug} onChange={(e) => setSlug(e.target.value)} required className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5" />
      </label>
      <label className="text-xs text-rk-n600">
        Vertical
        <select value={vertical} onChange={(e) => setVertical(e.target.value as typeof vertical)} className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5">
          <option value="PHARMACY">Pharmacy</option>
          <option value="VETERINARY">Veterinary</option>
          <option value="SUPERMARKET">Supermarket</option>
        </select>
      </label>
      <label className="text-xs text-rk-n600">
        Parent (optional)
        <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="mt-0.5 block w-full rounded-rk-sm border border-rk-n200 px-2 py-1.5">
          <option value="">None</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" size="sm" loading={pending}>
        Add category
      </Button>
      {error && <p className="col-span-5 text-sm text-rk-alert">{error}</p>}
    </form>
  );
}
