// Safe for server and client import. A store's departments map 1:1 to
// the Vertical enum; the URL uses the lowercase key.

export type DepartmentKey = "pharmacy" | "supermarket" | "veterinary";
export type VerticalKey = "PHARMACY" | "SUPERMARKET" | "VETERINARY";

export const DEPARTMENTS: {
  key: DepartmentKey;
  vertical: VerticalKey;
  label: string;
  shortLabel: string;
  blurb: string;
  image: string;
}[] = [
  {
    key: "supermarket",
    vertical: "SUPERMARKET",
    label: "Supermarket",
    shortLabel: "Supermart",
    blurb: "Fresh produce, groceries and household essentials",
    image: "/demo-assets/banners/hero-supermarket.jpg",
  },
  {
    key: "pharmacy",
    vertical: "PHARMACY",
    label: "Pharmacy",
    shortLabel: "Pharmacy",
    blurb: "Medicines, health devices and pharmacist advice",
    image: "/demo-assets/banners/hero-pharmacy.jpg",
  },
  {
    key: "veterinary",
    vertical: "VETERINARY",
    label: "Vet Clinic",
    shortLabel: "Vet",
    blurb: "Pet food, care products and vet appointments",
    image: "/demo-assets/banners/hero-veterinary.jpg",
  },
];

export function departmentByKey(key: string) {
  return DEPARTMENTS.find((d) => d.key === key) ?? null;
}

export function departmentByVertical(vertical: string) {
  return DEPARTMENTS.find((d) => d.vertical === vertical) ?? null;
}

// Store URLs live in one place so a route change is a one-line edit.
export const storePath = (store: string) => `/store/${store}`;
export const departmentPath = (store: string, vertical: string) =>
  `/store/${store}/${departmentByVertical(vertical)?.key ?? vertical.toLowerCase()}`;
export const productPath = (store: string, vertical: string, slug: string) =>
  `${departmentPath(store, vertical)}/${slug}`;

export const STORE_COOKIE = "robakeye-branch";

// "Flagship Branch (Sheu)" -> "Sheu", "Ologuneru Branch (Ajadi)" -> "Ajadi", "Ojoo Branch" -> "Ojoo"
export function storeShortName(name: string) {
  const paren = name.match(/\(([^)]+)\)/);
  if (paren) return paren[1];
  return name.replace(/\s*Branch\s*/i, "").trim();
}
