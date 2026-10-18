import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getRememberedStore, getStores } from "@/lib/stores";
import { departmentPath, productPath, type VerticalKey } from "@/lib/departments";

// Before stores had their own catalogues, departments lived at /pharmacy,
// /supermarket and /veterinary. Old links and bookmarks land here and are
// sent into the store the visitor last used — or, if that store doesn't
// run this department, the first store that does — and otherwise to the
// store chooser on the home page.
export async function redirectLegacyDepartment(vertical: VerticalKey, productSlug?: string): Promise<never> {
  const remembered = await getRememberedStore();
  const stores = await getStores();
  const candidates = [remembered, ...stores].filter(
    (s): s is NonNullable<typeof s> => !!s && s.services.includes(vertical),
  );

  if (productSlug) {
    for (const store of candidates) {
      const listing = await prisma.product.findUnique({
        where: { branchId_slug: { branchId: store.id, slug: productSlug } },
        select: { isActive: true, vertical: true },
      });
      if (listing?.isActive) redirect(productPath(store.slug, listing.vertical, productSlug));
    }
  }

  const target = candidates[0];
  redirect(target ? departmentPath(target.slug, vertical) : "/");
}
