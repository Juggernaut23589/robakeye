"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct, updateProduct, getImageUploadSignature } from "@/actions/products-admin";
import { Button } from "@/components/ui/button";

type Category = { id: string; name: string; vertical: string };
type Branch = { id: string; name: string; services: string[] };

type ProductFormValues = {
  id?: string;
  branchId: string;
  stockQuantity: number;
  sku: string;
  slug: string;
  name: string;
  description: string;
  vertical: "PHARMACY" | "VETERINARY" | "SUPERMARKET";
  class: "OTC" | "POM" | "CONTROLLED";
  categoryId: string;
  priceNaira: number;
  images: string[];
  isActive: boolean;
};

export function ProductForm({
  categories,
  branches,
  initial,
}: {
  categories: Category[];
  branches: Branch[];
  initial?: Partial<ProductFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>({
    branchId: initial?.branchId ?? branches[0]?.id ?? "",
    stockQuantity: initial?.stockQuantity ?? 0,
    sku: initial?.sku ?? "",
    slug: initial?.slug ?? "",
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    vertical: initial?.vertical ?? "SUPERMARKET",
    class: initial?.class ?? "OTC",
    categoryId: initial?.categoryId ?? categories.find((c) => c.vertical === (initial?.vertical ?? "SUPERMARKET"))?.id ?? "",
    priceNaira: initial?.priceNaira ?? 0,
    images: initial?.images ?? [],
    isActive: initial?.isActive ?? true,
  });
  const selectedBranch = branches.find((b) => b.id === values.branchId);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const sig = await getImageUploadSignature();
      if (!sig.ok) throw new Error(sig.error);
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.signature.apiKey!);
      form.append("timestamp", String(sig.signature.timestamp));
      form.append("signature", sig.signature.signature);
      form.append("folder", sig.signature.folder);
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.signature.cloudName}/image/upload`, {
        method: "POST",
        body: form,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error?.message ?? "Upload failed");
      setValues((v) => ({ ...v, images: [...v.images, uploadData.secure_url] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    setValues((v) => ({ ...v, images: v.images.filter((i) => i !== url) }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...(initial?.id ? {} : { branchId: values.branchId, stockQuantity: values.stockQuantity }),
      sku: values.sku,
      slug: values.slug,
      name: values.name,
      description: values.description || undefined,
      vertical: values.vertical,
      class: values.class,
      categoryId: values.categoryId,
      priceKobo: Math.round(values.priceNaira * 100),
      images: values.images,
      isActive: values.isActive,
    };
    const result = initial?.id ? await updateProduct(initial.id, payload) : await createProduct(payload);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(initial?.id ? "/products" : `/products/${"productId" in result ? result.productId : ""}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-rk-md border border-rk-n200 bg-white p-5">
      <label className="grid gap-1 text-sm">
        Store
        <select
          value={values.branchId}
          disabled={!!initial?.id}
          onChange={(e) => {
            const branch = branches.find((b) => b.id === e.target.value);
            setValues((v) => {
              const vertical = branch && !branch.services.includes(v.vertical) ? (branch.services[0] as ProductFormValues["vertical"]) : v.vertical;
              const categoryId = categories.find((c) => c.id === v.categoryId)?.vertical === vertical ? v.categoryId : (categories.find((c) => c.vertical === vertical)?.id ?? "");
              return { ...v, branchId: e.target.value, vertical, categoryId };
            });
          }}
          className="rounded-rk-sm border border-rk-n200 px-3 py-2 disabled:bg-rk-n50"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-rk-n600">
          {initial?.id
            ? "A listing always belongs to one store. To sell it elsewhere, use “Also sell at” below."
            : "The listing belongs to this store only, with its own price and stock."}
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          SKU
          <input
            value={values.sku}
            onChange={(e) => setValues((v) => ({ ...v, sku: e.target.value }))}
            required
            className="rounded-rk-sm border border-rk-n200 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Slug
          <input
            value={values.slug}
            onChange={(e) => setValues((v) => ({ ...v, slug: e.target.value }))}
            required
            className="rounded-rk-sm border border-rk-n200 px-3 py-2"
          />
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        Name
        <input
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          required
          className="rounded-rk-sm border border-rk-n200 px-3 py-2"
        />
      </label>

      <label className="grid gap-1 text-sm">
        Description
        <textarea
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          rows={3}
          className="rounded-rk-sm border border-rk-n200 px-3 py-2"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          Vertical
          <select
            value={values.vertical}
            onChange={(e) => {
              const vertical = e.target.value as ProductFormValues["vertical"];
              setValues((v) => ({ ...v, vertical, categoryId: categories.find((c) => c.vertical === vertical)?.id ?? "" }));
            }}
            className="rounded-rk-sm border border-rk-n200 px-3 py-2"
          >
            {(["PHARMACY", "VETERINARY", "SUPERMARKET"] as const)
              .filter((v) => selectedBranch?.services.includes(v) ?? true)
              .map((v) => (
                <option key={v} value={v}>
                  {v === "PHARMACY" ? "Pharmacy" : v === "VETERINARY" ? "Veterinary" : "Supermarket"}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Class
          <select
            value={values.class}
            onChange={(e) => setValues((v) => ({ ...v, class: e.target.value as ProductFormValues["class"] }))}
            className="rounded-rk-sm border border-rk-n200 px-3 py-2"
          >
            <option value="OTC">OTC — add to cart</option>
            <option value="POM">POM — prescription only</option>
            <option value="CONTROLLED">Controlled — never purchasable</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Category
          <select
            value={values.categoryId}
            onChange={(e) => setValues((v) => ({ ...v, categoryId: e.target.value }))}
            className="rounded-rk-sm border border-rk-n200 px-3 py-2"
          >
            {categories
              .filter((c) => c.vertical === values.vertical)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-4">
      <label className="grid gap-1 text-sm">
        Price (₦)
        <input
          type="number"
          min={0}
          step="0.01"
          value={values.priceNaira}
          onChange={(e) => setValues((v) => ({ ...v, priceNaira: Number(e.target.value) }))}
          required
          className="w-40 rounded-rk-sm border border-rk-n200 px-3 py-2"
        />
      </label>
      {!initial?.id && (
        <label className="grid gap-1 text-sm">
          Opening stock
          <input
            type="number"
            min={0}
            value={values.stockQuantity}
            onChange={(e) => setValues((v) => ({ ...v, stockQuantity: Math.max(0, Number(e.target.value)) }))}
            className="w-32 rounded-rk-sm border border-rk-n200 px-3 py-2"
          />
        </label>
      )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-rk-navy">Images</p>
        <div className="flex flex-wrap gap-3">
          {values.images.map((url) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-20 rounded-rk-sm object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute -right-1 -top-1 size-5 rounded-full bg-rk-alert text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
          <label className="flex size-20 cursor-pointer items-center justify-center rounded-rk-sm border border-dashed border-rk-n200 text-xs text-rk-n600">
            {uploading ? "…" : "+ Add"}
            <input type="file" accept="image/*" onChange={onUploadImage} disabled={uploading} className="hidden" />
          </label>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.checked }))}
        />
        Active (visible in storefront)
      </label>

      {error && <p className="text-sm text-rk-alert">{error}</p>}

      <Button type="submit" loading={saving} className="w-fit">
        {initial?.id ? "Save changes" : "Create product"}
      </Button>
    </form>
  );
}
