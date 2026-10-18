import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStoreBySlug } from "@/lib/stores";
import { departmentByKey, departmentPath } from "@/lib/departments";
import { ProductListing, type ListingSearchParams } from "@/components/catalogue/product-listing";

export async function generateMetadata({ params }: PageProps<"/store/[store]/[department]">): Promise<Metadata> {
  const dept = departmentByKey((await params).department);
  return dept ? { title: dept.label } : {};
}

export default async function DepartmentPage({ params, searchParams }: PageProps<"/store/[store]/[department]">) {
  const { store: storeSlug, department } = await params;
  const [store, dept] = [await getStoreBySlug(storeSlug), departmentByKey(department)];
  // A department this store doesn't run (e.g. the vet clinic at Ojoo) is
  // simply not a page here.
  if (!store || !dept || !store.services.includes(dept.vertical)) notFound();

  return (
    <ProductListing
      store={{ id: store.id, slug: store.slug, name: store.name }}
      vertical={dept.vertical}
      title={dept.label}
      basePath={departmentPath(store.slug, dept.vertical)}
      searchParams={(await searchParams) as ListingSearchParams}
    />
  );
}
