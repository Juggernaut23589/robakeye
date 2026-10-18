import { PrismaClient, BranchScope, BranchService, Vertical, ProductClass } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// The 18 permission flags from docs/admin-dashboard-rbac.html's roles×permissions
// matrix. Dot-namespaced so UI can group by resource.
const PERMISSIONS = [
  { key: "dashboard.view", label: "View dashboard overview" },
  { key: "orders.view", label: "View orders" },
  { key: "orders.update_status", label: "Update order status" },
  { key: "orders.refund", label: "Issue refunds" },
  { key: "products.view", label: "View products" },
  { key: "products.write", label: "Create/edit products" },
  { key: "inventory.view", label: "View branch inventory" },
  { key: "inventory.write", label: "Adjust branch inventory" },
  { key: "prescriptions.view", label: "View prescription queue" },
  { key: "prescriptions.review", label: "Approve/reject prescription lines" },
  { key: "appointments.view", label: "View vet appointments" },
  { key: "appointments.manage", label: "Manage vet appointments & availability" },
  { key: "promotions.manage", label: "Manage promotions & promo codes" },
  { key: "delivery.manage", label: "Manage delivery assignment & zones" },
  { key: "customers.view", label: "View customer records" },
  { key: "staff.manage", label: "Manage staff accounts & roles" },
  { key: "support.manage", label: "Manage support tickets" },
  { key: "settings.manage", label: "Manage platform settings" },
] as const;

// The 8 default roles. branchScope ALL = sees every branch regardless of
// StaffBranch assignment; OWN = scoped to assigned branch(es) only.
const ROLE_PERMISSIONS: Record<
  string,
  {
    description: string;
    branchScope: BranchScope;
    permissions: string[];
    requires2FA?: boolean;
  }
> = {
  SUPERADMIN: {
    description: "Full platform access across every branch.",
    branchScope: BranchScope.ALL,
    requires2FA: true,
    permissions: PERMISSIONS.map((p) => p.key),
  },
  BRANCH_MANAGER: {
    description: "Full operational control of their assigned branch(es).",
    branchScope: BranchScope.OWN,
    requires2FA: true,
    permissions: [
      "dashboard.view", "orders.view", "orders.update_status", "orders.refund",
      "products.view", "inventory.view", "inventory.write",
      "prescriptions.view", "appointments.view", "appointments.manage",
      "delivery.manage", "customers.view", "support.manage",
    ],
  },
  PHARMACIST: {
    description: "Reviews and approves prescriptions; read-only on orders/inventory.",
    branchScope: BranchScope.OWN,
    permissions: ["dashboard.view", "prescriptions.view", "prescriptions.review", "products.view", "inventory.view"],
  },
  VET_STAFF: {
    description: "Manages veterinary appointments and pet records at the flagship branch.",
    branchScope: BranchScope.OWN,
    permissions: ["dashboard.view", "appointments.view", "appointments.manage"],
  },
  INVENTORY_MANAGER: {
    description: "Manages stock levels and expiry across assigned branch(es).",
    branchScope: BranchScope.OWN,
    permissions: ["dashboard.view", "products.view", "products.write", "inventory.view", "inventory.write"],
  },
  CASHIER: {
    description: "Front-of-house order handling at a single branch.",
    branchScope: BranchScope.OWN,
    permissions: ["dashboard.view", "orders.view", "orders.update_status"],
  },
  CUSTOMER_SERVICE: {
    description: "Handles support tickets and customer records platform-wide.",
    branchScope: BranchScope.ALL,
    permissions: ["dashboard.view", "customers.view", "support.manage", "orders.view"],
  },
  DELIVERY_COORDINATOR: {
    description: "Assigns and tracks deliveries across assigned branch(es).",
    branchScope: BranchScope.OWN,
    permissions: ["dashboard.view", "orders.view", "delivery.manage"],
  },
};

// 3 branches — each one is its own store with its own catalogue.
// TODO(client): placeholder lat/lng (approximate Ibadan coordinates), no
// confirmed phone numbers or hours yet — flagged in .env.example too.
type StoreSlug = "ajadi" | "ojoo" | "sheu";

const BRANCHES: {
  slug: StoreSlug;
  name: string;
  address: string;
  lat: number;
  lng: number;
  services: readonly ("PHARMACY" | "SUPERMARKET" | "VETERINARY")[];
  tagline: string;
  coverImage: string;
}[] = [
  {
    slug: "ajadi",
    name: "Ologuneru Branch (Ajadi)",
    address:
      "New Eleyele Road (opposite Gabstab filling station), Ajadi Bus-stop/Junction, Ologuneru, Ibadan",
    lat: 7.4278,
    lng: 3.8398,
    services: ["PHARMACY", "SUPERMARKET"],
    tagline: "Your neighbourhood pharmacy & supermarket in Ologuneru",
    coverImage: "/demo-assets/banners/hero-pharmacy.jpg",
  },
  {
    slug: "ojoo",
    name: "Ojoo Branch",
    address: "No. 10 Bethel House, Onila Aro Bus-stop, Lagos-Ojoo Express, Ibadan",
    lat: 7.4553,
    lng: 3.9206,
    services: ["PHARMACY", "SUPERMARKET"],
    tagline: "Pharmacy & supermarket on the Lagos–Ojoo Expressway",
    coverImage: "/demo-assets/banners/hero-supermarket.jpg",
  },
  {
    slug: "sheu",
    name: "Flagship Branch (Sheu)",
    address: "Along Ologuneru-Eruwa Road, Sheu Bus-stop, Ologuneru, Ibadan",
    lat: 7.4198,
    lng: 3.8295,
    services: ["PHARMACY", "SUPERMARKET", "VETERINARY"],
    tagline: "Flagship store — pharmacy, supermarket & full veterinary clinic",
    coverImage: "/demo-assets/banners/hero-veterinary.jpg",
  },
];

const CATEGORIES: { slug: string; name: string; vertical: Vertical }[] = [
  { slug: "pain-relief", name: "Pain Relief", vertical: Vertical.PHARMACY },
  { slug: "antibiotics", name: "Antibiotics", vertical: Vertical.PHARMACY },
  { slug: "antimalarials", name: "Antimalarials", vertical: Vertical.PHARMACY },
  { slug: "cold-flu-allergy", name: "Cold, Flu & Allergy", vertical: Vertical.PHARMACY },
  { slug: "digestive-health", name: "Digestive Health", vertical: Vertical.PHARMACY },
  { slug: "chronic-care", name: "Chronic Care", vertical: Vertical.PHARMACY },
  { slug: "vitamins-supplements", name: "Vitamins & Supplements", vertical: Vertical.PHARMACY },
  { slug: "first-aid", name: "First Aid", vertical: Vertical.PHARMACY },
  { slug: "medical-devices", name: "Medical Devices", vertical: Vertical.PHARMACY },
  { slug: "pet-food", name: "Pet Food", vertical: Vertical.VETERINARY },
  { slug: "pet-medication", name: "Pet Medication", vertical: Vertical.VETERINARY },
  { slug: "grooming", name: "Grooming", vertical: Vertical.VETERINARY },
  { slug: "pet-accessories", name: "Pet Accessories", vertical: Vertical.VETERINARY },
  { slug: "fresh-produce", name: "Fresh Produce", vertical: Vertical.SUPERMARKET },
  { slug: "groceries", name: "Groceries", vertical: Vertical.SUPERMARKET },
  { slug: "breakfast-dairy", name: "Breakfast & Dairy", vertical: Vertical.SUPERMARKET },
  { slug: "beverages", name: "Beverages", vertical: Vertical.SUPERMARKET },
  { slug: "household", name: "Household Essentials", vertical: Vertical.SUPERMARKET },
  { slug: "personal-care", name: "Personal Care", vertical: Vertical.SUPERMARKET },
];

// Demo catalogue — generic product names and plausible Naira prices, not
// real Robakeye SKUs or pricing (same "sample data" status as the branch
// hours/vet pricing flagged elsewhere). Images are representative photos
// from public/demo-assets/products/<slug>.jpg — see SOURCES.md there.
type SeedProduct = {
  sku: string;
  slug: string;
  name: string;
  description: string;
  vertical: Vertical;
  categorySlug: string;
  class: ProductClass;
  priceKobo: number; // flagship price; other stores derive from it
};

const P = (
  sku: string, slug: string, name: string, description: string,
  vertical: Vertical, categorySlug: string, priceNaira: number, cls: ProductClass = "OTC",
): SeedProduct => ({ sku, slug, name, description, vertical, categorySlug, class: cls, priceKobo: priceNaira * 100 });

const PRODUCTS: SeedProduct[] = [
  // ── Pharmacy ────────────────────────────────────────────────────────
  P("PH-PAIN-001", "paracetamol-500mg", "Paracetamol 500mg (20 tablets)", "General pain and fever relief for adults and children over 12.", "PHARMACY", "pain-relief", 850),
  P("PH-PAIN-002", "ibuprofen-400mg", "Ibuprofen 400mg (20 tablets)", "Anti-inflammatory relief for headache, toothache, period and muscle pain.", "PHARMACY", "pain-relief", 950),
  P("PH-CTL-001", "tramadol-50mg", "Tramadol 50mg", "Controlled analgesic — dispensed in-store after a pharmacist consultation only. Not sold online.", "PHARMACY", "pain-relief", 4500, "CONTROLLED"),
  P("PH-ABX-001", "amoxicillin-500mg", "Amoxicillin 500mg (21 capsules)", "Broad-spectrum antibiotic. Requires an approved prescription.", "PHARMACY", "antibiotics", 2800, "POM"),
  P("PH-ABX-002", "ciprofloxacin-500mg", "Ciprofloxacin 500mg (10 tablets)", "Antibiotic for bacterial infections. Requires an approved prescription.", "PHARMACY", "antibiotics", 3200, "POM"),
  P("PH-MAL-001", "artemether-lumefantrine", "Artemether/Lumefantrine 20/120mg (24 tablets)", "Full adult course for uncomplicated malaria. Ask a pharmacist if unsure of the dose.", "PHARMACY", "antimalarials", 2500),
  P("PH-CFA-001", "cough-syrup-100ml", "Cough Syrup, 100ml", "Soothing relief for dry and tickly coughs.", "PHARMACY", "cold-flu-allergy", 1600),
  P("PH-CFA-002", "loratadine-10mg", "Loratadine 10mg (10 tablets)", "Non-drowsy 24-hour relief from hay fever and allergies.", "PHARMACY", "cold-flu-allergy", 1200),
  P("PH-DIG-001", "antacid-chewable", "Antacid Chewable Tablets (24)", "Fast relief from heartburn and indigestion.", "PHARMACY", "digestive-health", 1100),
  P("PH-DIG-002", "ors-sachets", "Oral Rehydration Salts (10 sachets)", "Replaces fluids and salts lost through diarrhoea or heat.", "PHARMACY", "digestive-health", 900),
  P("PH-CHR-001", "metformin-500mg", "Metformin 500mg (84 tablets)", "For type 2 diabetes management. Requires an approved prescription.", "PHARMACY", "chronic-care", 3500, "POM"),
  P("PH-VIT-001", "vitamin-c-1000mg", "Vitamin C 1000mg + Zinc (20 effervescent tablets)", "Immune support — dissolve one tablet in water daily.", "PHARMACY", "vitamins-supplements", 3200),
  P("PH-VIT-002", "multivitamin-complex", "Multivitamin Complex (60 tablets)", "Daily multivitamin and mineral support for adults.", "PHARMACY", "vitamins-supplements", 4500),
  P("PH-AID-001", "adhesive-bandages-pack", "Adhesive Bandages (100-pack)", "Assorted sizes, breathable fabric plasters.", "PHARMACY", "first-aid", 1800),
  P("PH-AID-002", "antiseptic-liquid-250ml", "Antiseptic Liquid, 250ml", "For cleaning cuts, grazes and household first aid.", "PHARMACY", "first-aid", 1700),
  P("PH-AID-003", "face-masks-50", "Disposable Face Masks (50-pack)", "3-ply masks with ear loops.", "PHARMACY", "first-aid", 2500),
  P("PH-DEV-001", "digital-thermometer", "Digital Thermometer", "Fast oral/underarm readings with fever alert.", "PHARMACY", "medical-devices", 3000),
  P("PH-DEV-002", "bp-monitor", "Automatic Blood Pressure Monitor", "Upper-arm digital monitor with memory for two users.", "PHARMACY", "medical-devices", 28000),

  // ── Supermarket ─────────────────────────────────────────────────────
  P("SM-FRS-001", "fresh-tomatoes-1kg", "Fresh Tomatoes, 1kg", "Locally sourced, sold by the kilo.", "SUPERMARKET", "fresh-produce", 2400),
  P("SM-FRS-002", "red-onions-1kg", "Red Onions, 1kg", "Firm, fresh red onions.", "SUPERMARKET", "fresh-produce", 1800),
  P("SM-FRS-003", "yam-tuber", "Yam Tuber (medium)", "A medium-sized tuber of white yam.", "SUPERMARKET", "fresh-produce", 3500),
  P("SM-FRS-004", "plantain-bunch", "Plantain (bunch of 5)", "Unripe plantain — ripens in a few days.", "SUPERMARKET", "fresh-produce", 2500),
  P("SM-GRO-001", "long-grain-rice-5kg", "Long-Grain Rice, 5kg", "Everyday parboiled long-grain rice.", "SUPERMARKET", "groceries", 11500),
  P("SM-GRO-002", "vegetable-oil-1l", "Vegetable Oil, 1L", "Refined cooking oil.", "SUPERMARKET", "groceries", 3200),
  P("SM-GRO-003", "palm-oil-1l", "Palm Oil, 1L", "Red palm oil for stews and soups.", "SUPERMARKET", "groceries", 2800),
  P("SM-GRO-004", "yellow-garri-2kg", "Yellow Garri, 2kg", "Crisp yellow garri for eba or soaking.", "SUPERMARKET", "groceries", 2600),
  P("SM-GRO-005", "semolina-1kg", "Semolina, 1kg", "Fine semolina for swallow.", "SUPERMARKET", "groceries", 1900),
  P("SM-GRO-006", "brown-beans-2kg", "Brown Beans, 2kg", "Cleaned brown beans for ewa and moin-moin.", "SUPERMARKET", "groceries", 4200),
  P("SM-GRO-007", "spaghetti-500g", "Spaghetti, 500g", "Durum wheat spaghetti.", "SUPERMARKET", "groceries", 1100),
  P("SM-GRO-008", "instant-noodles-carton", "Instant Noodles (carton of 40)", "Chicken-flavour instant noodles.", "SUPERMARKET", "groceries", 9800),
  P("SM-BRK-001", "sliced-bread", "Sliced Bread (large loaf)", "Soft white sliced bread, baked daily.", "SUPERMARKET", "breakfast-dairy", 1500),
  P("SM-BRK-002", "eggs-crate-30", "Eggs (crate of 30)", "Fresh farm eggs.", "SUPERMARKET", "breakfast-dairy", 5200),
  P("SM-BRK-003", "evaporated-milk-tin", "Evaporated Milk (tin)", "Full-cream evaporated milk.", "SUPERMARKET", "breakfast-dairy", 900),
  P("SM-BRK-004", "chocolate-malt-drink-500g", "Chocolate Malt Drink, 500g", "Chocolate malted drink powder — mix with hot or cold milk.", "SUPERMARKET", "breakfast-dairy", 3800),
  P("SM-BRK-005", "sugar-cubes-500g", "Sugar Cubes, 500g", "Refined white sugar cubes.", "SUPERMARKET", "breakfast-dairy", 1300),
  P("SM-BEV-001", "bottled-water-12pack", "Bottled Water (12 x 75cl)", "Purified bottled drinking water.", "SUPERMARKET", "beverages", 2800),
  P("SM-BEV-002", "orange-juice-1l", "Orange Juice, 1L", "100% orange juice, no added sugar.", "SUPERMARKET", "beverages", 2900),
  P("SM-BEV-003", "malt-drink-6pack", "Malt Drink (6 x 33cl)", "Non-alcoholic malt drink.", "SUPERMARKET", "beverages", 3600),
  P("SM-HH-001", "dishwashing-liquid-750ml", "Dishwashing Liquid, 750ml", "Grease-cutting dish soap.", "SUPERMARKET", "household", 1800),
  P("SM-HH-002", "toilet-tissue-12pack", "Toilet Tissue (12-pack)", "2-ply soft tissue rolls.", "SUPERMARKET", "household", 4200),
  P("SM-HH-003", "laundry-detergent-1kg", "Laundry Detergent Powder, 1kg", "For hand and machine washing.", "SUPERMARKET", "household", 2700),
  P("SM-PC-001", "bathing-soap-3pack", "Bathing Soap (3-pack)", "Moisturising bar soap.", "SUPERMARKET", "personal-care", 1500),

  // ── Veterinary (flagship only) ──────────────────────────────────────
  P("VT-FOOD-001", "adult-dog-food-3kg", "Adult Dog Food, 3kg", "Complete balanced dry food for adult dogs.", "VETERINARY", "pet-food", 9800),
  P("VT-FOOD-002", "dry-cat-food-2kg", "Dry Cat Food, 2kg", "Complete dry food for adult cats.", "VETERINARY", "pet-food", 7500),
  P("VT-FOOD-003", "wet-cat-food-12", "Wet Cat Food Pouches (12-pack)", "Variety pack of wet food for adult cats.", "VETERINARY", "pet-food", 6200),
  P("VT-FOOD-004", "bird-seed-1kg", "Bird Seed Mix, 1kg", "Seed blend for canaries, finches and budgies.", "VETERINARY", "pet-food", 2200),
  P("VT-FOOD-005", "fish-flakes", "Tropical Fish Flakes, 100g", "Daily flake food for aquarium fish.", "VETERINARY", "pet-food", 1800),
  P("VT-MED-001", "praziquantel-dewormer", "Praziquantel Dewormer for Dogs (4 tablets)", "Broad-spectrum dewormer. Requires a vet-approved prescription.", "VETERINARY", "pet-medication", 4200, "POM"),
  P("VT-GRM-001", "tick-flea-pet-shampoo", "Tick & Flea Pet Shampoo, 500ml", "Medicated wash that kills ticks and fleas on contact.", "VETERINARY", "grooming", 3500),
  P("VT-GRM-002", "coconut-pet-shampoo-bar", "Coconut Pet Shampoo Bar", "Gentle solid shampoo for dogs and cats.", "VETERINARY", "grooming", 1500),
  P("VT-ACC-001", "cat-litter-10l", "Clumping Cat Litter, 10L", "Odour-control clumping clay litter.", "VETERINARY", "pet-accessories", 5500),
  P("VT-ACC-002", "slow-feeder-bowl", "Slow Feeder Dog Bowl", "Maze bowl that slows fast eaters.", "VETERINARY", "pet-accessories", 3800),
  P("VT-ACC-003", "dog-chew-bone", "Dog Chew Bone", "Long-lasting chew for medium dogs.", "VETERINARY", "pet-accessories", 1600),
  P("VT-ACC-004", "pet-carrier", "Pet Travel Carrier", "Ventilated carrier for cats and small dogs.", "VETERINARY", "pet-accessories", 18500),
];

// Which products each store lists. Sheu (flagship) carries everything; the
// two neighbourhood stores carry a smaller assortment and no vet range.
const EXCLUDED: Record<StoreSlug, string[]> = {
  sheu: [],
  ajadi: [
    "bp-monitor", "digital-thermometer", "metformin-500mg", "ciprofloxacin-500mg",
    "eggs-crate-30", "sliced-bread", "malt-drink-6pack", "sugar-cubes-500g", "chocolate-malt-drink-500g",
  ],
  ojoo: [
    "tramadol-50mg", "antacid-chewable", "ors-sachets",
    "yam-tuber", "plantain-bunch", "palm-oil-1l", "yellow-garri-2kg",
  ],
};
const PRICE_FACTOR: Record<StoreSlug, number> = { sheu: 1, ajadi: 0.97, ojoo: 1.04 };

// Deliberate demo states: out of stock at one store but not another, low
// stock, and a few lines close to expiry for the admin expiry alert.
const STOCK_OVERRIDES: Partial<Record<StoreSlug, Record<string, number>>> = {
  ajadi: { "ibuprofen-400mg": 0 },
  sheu: { "ciprofloxacin-500mg": 0, "praziquantel-dewormer": 3 },
  ojoo: { "vegetable-oil-1l": 0, "multivitamin-complex": 4 },
};
const EXPIRY_DAYS: Partial<Record<StoreSlug, Record<string, number>>> = {
  ojoo: { "paracetamol-500mg": 45, "evaporated-milk-tin": 25 },
  sheu: { "amoxicillin-500mg": 20 },
  ajadi: { "orange-juice-1l": 10 },
};

function listsProduct(store: StoreSlug, p: SeedProduct) {
  if (p.vertical === "VETERINARY" && store !== "sheu") return false;
  return !EXCLUDED[store].includes(p.slug);
}

// Deterministic so re-seeding gives the same numbers: 6..60 units.
function demoStock(store: StoreSlug, slug: string) {
  const override = STOCK_OVERRIDES[store]?.[slug];
  if (override !== undefined) return override;
  let h = 0;
  for (const ch of `${store}:${slug}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 6 + (h % 55);
}

function storePrice(store: StoreSlug, baseKobo: number) {
  // Rounded to the nearest ₦50 so prices look like shelf prices.
  return Math.round((baseKobo * PRICE_FACTOR[store]) / 5000) * 5000;
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// One featured bundle per store, built only from that store's own listings.
const COMBOS: Record<StoreSlug, { name: string; headline: string; slugs: string[]; priceNaira: number }> = {
  sheu: {
    name: "Jollof Starter Pack",
    headline: "Rice, tomatoes & oil — everything for a pot of jollof",
    slugs: ["long-grain-rice-5kg", "fresh-tomatoes-1kg", "vegetable-oil-1l"],
    priceNaira: 15500,
  },
  ajadi: {
    name: "Eba & Stew Bundle",
    headline: "Garri and palm oil together for less",
    slugs: ["yellow-garri-2kg", "palm-oil-1l"],
    priceNaira: 4900,
  },
  ojoo: {
    name: "Breakfast Bundle",
    headline: "Bread, milk & chocolate malt — breakfast sorted",
    slugs: ["sliced-bread", "evaporated-milk-tin", "chocolate-malt-drink-500g"],
    priceNaira: 5800,
  },
};

async function main() {
  console.log("Seeding permissions...");
  const permissionRecords = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: { label: p.label },
        create: p,
      }),
    ),
  );
  const permissionByKey = new Map(permissionRecords.map((p) => [p.key, p]));

  console.log("Seeding roles...");
  for (const [name, config] of Object.entries(ROLE_PERMISSIONS)) {
    await prisma.role.upsert({
      where: { name },
      update: {
        description: config.description,
        branchScope: config.branchScope,
        requires2FA: config.requires2FA ?? false,
        permissions: {
          set: config.permissions.map((key) => ({ id: permissionByKey.get(key)!.id })),
        },
      },
      create: {
        name,
        description: config.description,
        isSystem: true,
        branchScope: config.branchScope,
        requires2FA: config.requires2FA ?? false,
        permissions: {
          connect: config.permissions.map((key) => ({ id: permissionByKey.get(key)!.id })),
        },
      },
    });
  }

  console.log("Seeding branches...");
  const branchRecords = await Promise.all(
    BRANCHES.map((b) =>
      prisma.branch.upsert({
        where: { slug: b.slug },
        update: { tagline: b.tagline, coverImage: b.coverImage },
        create: {
          slug: b.slug,
          name: b.name,
          address: b.address,
          lat: b.lat,
          lng: b.lng,
          services: b.services as unknown as BranchService[],
          tagline: b.tagline,
          coverImage: b.coverImage,
        },
      }),
    ),
  );

  console.log("Seeding categories...");
  const categoryRecords = await Promise.all(
    CATEGORIES.map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        update: { name: c.name },
        create: c,
      }),
    ),
  );
  const categoryBySlug = new Map(categoryRecords.map((c) => [c.slug, c]));
  const branchBySlug = new Map(branchRecords.map((b) => [b.slug, b]));

  console.log("Seeding delivery zones...");
  // Radii are placeholders — docs/information-architecture.html §02 flags
  // this explicitly as a per-branch admin setting the business must
  // confirm, not a hardcoded constant. Sheu (flagship) gets a larger
  // radius here only as a reasonable illustrative default.
  const ZONE_KM: Record<string, number> = { ajadi: 8, ojoo: 8, sheu: 12 };
  for (const b of branchRecords) {
    await prisma.deliveryZone.upsert({
      where: { id: `${b.id}-default-zone` }, // deterministic id so re-seeding doesn't duplicate
      update: { maxKm: ZONE_KM[b.slug] },
      create: {
        id: `${b.id}-default-zone`,
        branchId: b.id,
        name: "Standard delivery",
        maxKm: ZONE_KM[b.slug],
        baseFeeKobo: 100000,
        perKmFeeKobo: 15000,
      },
    });
  }

  console.log("Seeding delivery partners...");
  // One in-house rider per store (only assignable to that store's orders)
  // plus one shared courier any store can dispatch. Names are generic
  // placeholders, no phone numbers — the business adds its real riders.
  for (const b of branchRecords) {
    await prisma.deliveryPartner.upsert({
      where: { id: `seed-rider-${b.slug}` },
      update: { branchId: b.id },
      create: { id: `seed-rider-${b.slug}`, name: `${b.name.split(" (")[0]} in-house rider`, branchId: b.id },
    });
  }
  await prisma.deliveryPartner.upsert({
    where: { id: "seed-courier-shared" },
    update: {},
    create: { id: "seed-courier-shared", name: "Third-party courier", branchId: null },
  });

  console.log("Seeding store catalogues...");
  const listingId = new Map<string, string>(); // `${store}:${slug}` -> product id
  for (const b of BRANCHES) {
    const branch = branchBySlug.get(b.slug)!;
    const seeded = new Set<string>();

    // SKUs were renumbered when the catalogue grew, so an old row can hold
    // a SKU a different product now uses. Park every existing SKU on a
    // unique placeholder first; the upserts below set the real ones.
    await prisma.$executeRaw`UPDATE "Product" SET "sku" = 'TMP-' || "id" WHERE "branchId" = ${branch.id}`;

    for (const p of PRODUCTS) {
      if (!listsProduct(b.slug, p)) continue;
      // A store only sells departments it actually runs.
      if (!b.services.includes(p.vertical as (typeof b.services)[number])) continue;
      const category = categoryBySlug.get(p.categorySlug);
      if (!category) throw new Error(`Unknown category slug in seed data: ${p.categorySlug}`);

      const expiryDays = EXPIRY_DAYS[b.slug]?.[p.slug];
      const fields = {
        sku: p.sku,
        name: p.name,
        description: p.description,
        vertical: p.vertical,
        class: p.class,
        categoryId: category.id,
        priceKobo: storePrice(b.slug, p.priceKobo),
        // Demo/sample imagery only — see public/demo-assets/README.md.
        images: [`/demo-assets/products/${p.slug}.jpg`],
        isActive: true,
        stockQuantity: demoStock(b.slug, p.slug),
        lowStockAt: 5,
        expiryDate: expiryDays !== undefined ? daysFromNow(expiryDays) : null,
      };
      const product = await prisma.product.upsert({
        where: { branchId_slug: { branchId: branch.id, slug: p.slug } },
        update: fields,
        create: { ...fields, slug: p.slug, branchId: branch.id },
      });
      listingId.set(`${b.slug}:${p.slug}`, product.id);
      seeded.add(p.slug);
    }

    // Listings from older seeds that this store no longer carries are
    // hidden, never deleted — past orders and reviews still reference them.
    const retired = await prisma.product.updateMany({
      where: { branchId: branch.id, slug: { notIn: [...seeded] }, isActive: true },
      data: { isActive: false },
    });
    await prisma.$executeRaw`UPDATE "Product" SET "sku" = 'RETIRED-' || "slug" WHERE "branchId" = ${branch.id} AND "sku" LIKE 'TMP-%'`;
    console.log(`  ${b.slug}: ${seeded.size} listings${retired.count ? `, ${retired.count} retired` : ""}`);
  }

  console.log("Seeding featured combo deals...");
  for (const b of BRANCHES) {
    const combo = COMBOS[b.slug];
    const productIds = combo.slugs.map((slug) => {
      const id = listingId.get(`${b.slug}:${slug}`);
      if (!id) throw new Error(`Combo for ${b.slug} references ${slug}, which that store doesn't list`);
      return id;
    });
    const data = {
      name: combo.name,
      branchId: branchBySlug.get(b.slug)!.id,
      productIds,
      discountType: "FIXED_PRICE" as const,
      valueKobo: combo.priceNaira * 100,
      percentOff: null,
      startsAt: daysFromNow(-1),
      endsAt: daysFromNow(14),
      isActive: true,
      isFeatured: true,
      bannerHeadline: combo.headline,
    };
    await prisma.comboDeal.upsert({
      where: { id: `seed-combo-${b.slug}` },
      update: data,
      create: { id: `seed-combo-${b.slug}`, ...data },
    });
  }
  // Any older featured deals (e.g. the pre-store-split homepage banner)
  // stop competing with the seeded per-store ones.
  await prisma.comboDeal.updateMany({
    where: { isFeatured: true, id: { notIn: BRANCHES.map((b) => `seed-combo-${b.slug}`) } },
    data: { isFeatured: false },
  });

  console.log("Seeding superadmin user...");
  const superadminEmail = process.env.SEED_SUPERADMIN_EMAIL ?? "admin@robakeye.com";
  const superadminPassword = process.env.SEED_SUPERADMIN_PASSWORD ?? "ChangeMe123!";
  const superadminRole = await prisma.role.findUniqueOrThrow({ where: { name: "SUPERADMIN" } });

  const superadminUser = await prisma.user.upsert({
    where: { email: superadminEmail },
    update: {},
    create: {
      kind: "STAFF",
      name: "Robakeye Super Admin",
      email: superadminEmail,
      emailVerified: new Date(),
      passwordHash: await bcrypt.hash(superadminPassword, 12),
    },
  });

  await prisma.staff.upsert({
    where: { userId: superadminUser.id },
    update: {},
    create: {
      userId: superadminUser.id,
      roleId: superadminRole.id,
      branches: {
        create: branchRecords.map((b) => ({ branchId: b.id })),
      },
    },
  });

  console.log("Seeding vet services...");
  // Pricing is a placeholder — same "sample data" status flagged on the
  // homepage's vet-services section (Milestone 4) and in the compliance
  // doc; confirm real prices with the business before launch.
  const VET_SERVICES = [
    { name: "Vaccination", description: "Core & booster shots for dogs and cats", durationMinutes: 20, priceKobo: 650000 },
    { name: "General Checkup", description: "Full physical exam and health review", durationMinutes: 30, priceKobo: 500000 },
    { name: "Grooming", description: "Bath, trim and nail care", durationMinutes: 45, priceKobo: 400000 },
    { name: "Surgery Consultation", description: "Pre-surgical assessment for routine procedures", durationMinutes: 30, priceKobo: 2500000 },
  ];
  await Promise.all(
    VET_SERVICES.map((s) =>
      prisma.vetService.upsert({
        where: { id: `seed-${s.name.toLowerCase().replace(/\s+/g, "-")}` },
        update: { priceKobo: s.priceKobo, durationMinutes: s.durationMinutes },
        create: { id: `seed-${s.name.toLowerCase().replace(/\s+/g, "-")}`, ...s },
      }),
    ),
  );

  console.log("Seeding vet staff + availability...");
  const vetStaffRole = await prisma.role.findUniqueOrThrow({ where: { name: "VET_STAFF" } });
  const sheuBranch = branchBySlug.get("sheu")!;

  const vetStaffEmail = "vet@robakeye.com";
  const vetStaffUser = await prisma.user.upsert({
    where: { email: vetStaffEmail },
    update: {},
    create: {
      kind: "STAFF",
      name: "Dr. Funke Adewale",
      email: vetStaffEmail,
      emailVerified: new Date(),
      passwordHash: await bcrypt.hash("ChangeMe123!", 12),
    },
  });
  const vetStaff = await prisma.staff.upsert({
    where: { userId: vetStaffUser.id },
    update: {},
    create: {
      userId: vetStaffUser.id,
      roleId: vetStaffRole.id,
      branches: { create: [{ branchId: sheuBranch.id }] },
    },
  });

  // Mon–Fri 9am–5pm, Sat 9am–1pm — a reasonable illustrative default, not
  // a confirmed business hours commitment (same TODO status as branch
  // hours flagged elsewhere in this project).
  const WEEKDAY_SLOTS = [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: "09:00", endTime: "17:00" }));
  const SATURDAY_SLOT = { dayOfWeek: 6, startTime: "09:00", endTime: "13:00" };
  for (const slot of [...WEEKDAY_SLOTS, SATURDAY_SLOT]) {
    await prisma.vetAvailability.upsert({
      where: { id: `seed-vet-avail-${slot.dayOfWeek}` },
      update: slot,
      create: { id: `seed-vet-avail-${slot.dayOfWeek}`, staffId: vetStaff.id, ...slot },
    });
  }
  console.log(
    `\nSeed complete.\n  Superadmin login: ${superadminEmail} / ${superadminPassword}\n  Vet staff login: ${vetStaffEmail} / ChangeMe123!\n  CHANGE THESE PASSWORDS before deploying anywhere but localhost.\n`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
