import { PrismaClient, BranchScope, Vertical, ProductClass } from "@prisma/client";
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

// 3 branches — see docs/information-architecture.html §location-aware inventory.
// TODO(client): placeholder lat/lng (approximate Ibadan coordinates), no
// confirmed phone numbers or hours yet — flagged in .env.example too.
const BRANCHES = [
  {
    slug: "ajadi",
    name: "Ologuneru Branch (Ajadi)",
    address:
      "New Eleyele Road (opposite Gabstab filling station), Ajadi Bus-stop/Junction, Ologuneru, Ibadan",
    lat: 7.4278,
    lng: 3.8398,
    services: ["PHARMACY", "SUPERMARKET"] as const,
  },
  {
    slug: "ojoo",
    name: "Ojoo Branch",
    address: "No. 10 Bethel House, Onila Aro Bus-stop, Lagos-Ojoo Express, Ibadan",
    lat: 7.4553,
    lng: 3.9206,
    services: ["PHARMACY", "SUPERMARKET"] as const,
  },
  {
    slug: "sheu",
    name: "Flagship Branch (Sheu)",
    address: "Along Ologuneru-Eruwa Road, Sheu Bus-stop, Ologuneru, Ibadan",
    lat: 7.4198,
    lng: 3.8295,
    services: ["PHARMACY", "SUPERMARKET", "VETERINARY"] as const,
  },
];

const CATEGORIES: { slug: string; name: string; vertical: Vertical }[] = [
  { slug: "pain-relief", name: "Pain Relief", vertical: Vertical.PHARMACY },
  { slug: "antibiotics", name: "Antibiotics", vertical: Vertical.PHARMACY },
  { slug: "vitamins-supplements", name: "Vitamins & Supplements", vertical: Vertical.PHARMACY },
  { slug: "first-aid", name: "First Aid", vertical: Vertical.PHARMACY },
  { slug: "pet-food", name: "Pet Food", vertical: Vertical.VETERINARY },
  { slug: "pet-medication", name: "Pet Medication", vertical: Vertical.VETERINARY },
  { slug: "grooming", name: "Grooming", vertical: Vertical.VETERINARY },
  { slug: "groceries", name: "Groceries", vertical: Vertical.SUPERMARKET },
  { slug: "household", name: "Household Essentials", vertical: Vertical.SUPERMARKET },
  { slug: "beverages", name: "Beverages", vertical: Vertical.SUPERMARKET },
];

// Development/demo catalogue data for Milestone 5 (product listing,
// filtering, location-aware stock). Generic OTC/pharmacy/grocery product
// names and plausible Naira prices — not real Robakeye SKUs or pricing,
// same "sample data" status as the branch hours/vet pricing flagged
// elsewhere in this project. Purely to exercise the real catalogue code
// against real rows instead of an empty table.
type SeedProduct = {
  sku: string;
  slug: string;
  name: string;
  description: string;
  vertical: Vertical;
  categorySlug: string;
  class: ProductClass;
  priceKobo: number;
  // Per-branch inventory pattern, keyed by branch slug — omitted branch =
  // no inventory row at all (e.g. vet products at non-vet branches).
  stock: Partial<Record<"ajadi" | "ojoo" | "sheu", number>>;
};

const PRODUCTS: SeedProduct[] = [
  // Pharmacy — pain relief
  {
    sku: "PH-PAIN-001", slug: "paracetamol-500mg", name: "Paracetamol 500mg (20 tablets)",
    description: "General pain and fever relief.", vertical: "PHARMACY", categorySlug: "pain-relief",
    class: "OTC", priceKobo: 85000, stock: { ajadi: 40, ojoo: 25, sheu: 60 },
  },
  {
    sku: "PH-PAIN-002", slug: "ibuprofen-400mg", name: "Ibuprofen 400mg (20 tablets)",
    description: "Anti-inflammatory pain relief.", vertical: "PHARMACY", categorySlug: "pain-relief",
    class: "OTC", priceKobo: 95000, stock: { ajadi: 0, ojoo: 18, sheu: 30 },
  },
  // Pharmacy — antibiotics (prescription-only)
  {
    sku: "PH-ABX-001", slug: "amoxicillin-500mg", name: "Amoxicillin 500mg (21 capsules)",
    description: "Broad-spectrum antibiotic. Requires an approved prescription.",
    vertical: "PHARMACY", categorySlug: "antibiotics", class: "POM",
    priceKobo: 280000, stock: { ajadi: 15, ojoo: 10, sheu: 20 },
  },
  {
    sku: "PH-ABX-002", slug: "ciprofloxacin-500mg", name: "Ciprofloxacin 500mg (10 tablets)",
    description: "Antibiotic for bacterial infections. Requires an approved prescription.",
    vertical: "PHARMACY", categorySlug: "antibiotics", class: "POM",
    priceKobo: 320000, stock: { ajadi: 0, ojoo: 0, sheu: 0 }, // deliberately unavailable everywhere — demos the "notify me" state
  },
  {
    sku: "PH-CTL-001", slug: "tramadol-50mg", name: "Tramadol 50mg",
    description: "Controlled analgesic — in-branch pharmacist consultation only, no online purchase path.",
    vertical: "PHARMACY", categorySlug: "antibiotics", class: "CONTROLLED",
    priceKobo: 450000, stock: { ajadi: 5, ojoo: 3, sheu: 8 },
  },
  // Pharmacy — vitamins & supplements
  {
    sku: "PH-VIT-001", slug: "vitamin-c-1000mg", name: "Vitamin C 1000mg (30 tablets)",
    description: "Immune support supplement.", vertical: "PHARMACY", categorySlug: "vitamins-supplements",
    class: "OTC", priceKobo: 320000, stock: { ajadi: 50, ojoo: 35, sheu: 45 },
  },
  {
    sku: "PH-VIT-002", slug: "multivitamin-complex", name: "Multivitamin Complex (60 tablets)",
    description: "Daily multivitamin for adults.", vertical: "PHARMACY", categorySlug: "vitamins-supplements",
    class: "OTC", priceKobo: 450000, stock: { ajadi: 22, ojoo: 4, sheu: 30 },
  },
  // Pharmacy — first aid
  {
    sku: "PH-AID-001", slug: "adhesive-bandages-pack", name: "Adhesive Bandages (100-pack)",
    description: "Assorted sizes, breathable fabric.", vertical: "PHARMACY", categorySlug: "first-aid",
    class: "OTC", priceKobo: 180000, stock: { ajadi: 60, ojoo: 40, sheu: 55 },
  },
  {
    sku: "PH-AID-002", slug: "antiseptic-wound-spray", name: "Antiseptic Wound Spray 100ml",
    description: "For minor cuts and grazes.", vertical: "PHARMACY", categorySlug: "first-aid",
    class: "OTC", priceKobo: 210000, stock: { ajadi: 28, ojoo: 19, sheu: 33 },
  },
  // Veterinary (Sheu flagship only — the only branch with vet services)
  {
    sku: "VT-FOOD-001", slug: "adult-dog-food-3kg", name: "Adult Dog Food, 3kg",
    description: "Complete balanced nutrition for adult dogs.", vertical: "VETERINARY", categorySlug: "pet-food",
    class: "OTC", priceKobo: 980000, stock: { sheu: 24 },
  },
  {
    sku: "VT-FOOD-002", slug: "cat-food-pouches-12pack", name: "Cat Food Pouches (12-pack)",
    description: "Wet food variety pack for adult cats.", vertical: "VETERINARY", categorySlug: "pet-food",
    class: "OTC", priceKobo: 620000, stock: { sheu: 18 },
  },
  {
    sku: "VT-MED-001", slug: "flea-tick-treatment", name: "Flea & Tick Spot Treatment",
    description: "Monthly topical flea and tick prevention.", vertical: "VETERINARY", categorySlug: "pet-medication",
    class: "OTC", priceKobo: 750000, stock: { sheu: 12 },
  },
  {
    sku: "VT-MED-002", slug: "dog-dewormer-tablets", name: "Dog Dewormer Tablets (4-pack)",
    description: "Broad-spectrum dewormer. Requires a vet-approved prescription.",
    vertical: "VETERINARY", categorySlug: "pet-medication", class: "POM",
    priceKobo: 420000, stock: { sheu: 9 },
  },
  {
    sku: "VT-GRM-001", slug: "pet-shampoo-500ml", name: "Pet Shampoo, 500ml",
    description: "Gentle oatmeal shampoo for dogs and cats.", vertical: "VETERINARY", categorySlug: "grooming",
    class: "OTC", priceKobo: 350000, stock: { sheu: 20 },
  },
  // Supermarket
  {
    sku: "SM-GRO-001", slug: "long-grain-rice-5kg", name: "Long-Grain Rice, 5kg",
    description: "Everyday long-grain white rice.", vertical: "SUPERMARKET", categorySlug: "groceries",
    class: "OTC", priceKobo: 1150000, stock: { ajadi: 80, ojoo: 55, sheu: 70 },
  },
  {
    sku: "SM-GRO-002", slug: "fresh-tomatoes-1kg", name: "Fresh Tomatoes, 1kg",
    description: "Locally sourced, sold by the kilo.", vertical: "SUPERMARKET", categorySlug: "groceries",
    class: "OTC", priceKobo: 240000, stock: { ajadi: 45, ojoo: 30, sheu: 50 },
  },
  {
    sku: "SM-GRO-003", slug: "vegetable-oil-1l", name: "Vegetable Oil, 1L",
    description: "Refined cooking oil.", vertical: "SUPERMARKET", categorySlug: "groceries",
    class: "OTC", priceKobo: 320000, stock: { ajadi: 38, ojoo: 0, sheu: 42 },
  },
  {
    sku: "SM-HH-001", slug: "liquid-dish-soap", name: "Liquid Dish Soap, 750ml",
    description: "Grease-cutting dish soap.", vertical: "SUPERMARKET", categorySlug: "household",
    class: "OTC", priceKobo: 180000, stock: { ajadi: 33, ojoo: 27, sheu: 29 },
  },
  {
    sku: "SM-HH-002", slug: "toilet-tissue-12pack", name: "Toilet Tissue (12-pack)",
    description: "2-ply soft tissue rolls.", vertical: "SUPERMARKET", categorySlug: "household",
    class: "OTC", priceKobo: 420000, stock: { ajadi: 50, ojoo: 36, sheu: 44 },
  },
  {
    sku: "SM-BEV-001", slug: "bottled-water-12pack", name: "Bottled Water (12 x 75cl)",
    description: "Purified bottled drinking water.", vertical: "SUPERMARKET", categorySlug: "beverages",
    class: "OTC", priceKobo: 280000, stock: { ajadi: 70, ojoo: 60, sheu: 65 },
  },
  {
    sku: "SM-BEV-002", slug: "orange-juice-1l", name: "Orange Juice, 1L",
    description: "100% orange juice, no added sugar.", vertical: "SUPERMARKET", categorySlug: "beverages",
    class: "OTC", priceKobo: 290000, stock: { ajadi: 24, ojoo: 15, sheu: 20 },
  },
];

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
        update: {},
        create: {
          slug: b.slug,
          name: b.name,
          address: b.address,
          lat: b.lat,
          lng: b.lng,
          services: b.services as unknown as Vertical[],
        },
      }),
    ),
  );

  console.log("Seeding categories...");
  const categoryRecords = await Promise.all(
    CATEGORIES.map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        update: {},
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

  console.log("Seeding products & inventory...");
  for (const p of PRODUCTS) {
    const category = categoryBySlug.get(p.categorySlug);
    if (!category) throw new Error(`Unknown category slug in seed data: ${p.categorySlug}`);

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        priceKobo: p.priceKobo,
        class: p.class,
        images: [`/demo-assets/products/${p.slug}.jpg`],
      },
      create: {
        sku: p.sku,
        slug: p.slug,
        name: p.name,
        description: p.description,
        vertical: p.vertical,
        class: p.class,
        categoryId: category.id,
        priceKobo: p.priceKobo,
        // Demo/sample imagery only — see public/demo-assets/README.md.
        // Swap for real product photography before this is a real catalogue.
        images: [`/demo-assets/products/${p.slug}.jpg`],
      },
    });

    for (const [branchSlug, quantity] of Object.entries(p.stock)) {
      const branch = branchBySlug.get(branchSlug);
      if (!branch) continue;
      await prisma.branchInventory.upsert({
        where: { branchId_productId: { branchId: branch.id, productId: product.id } },
        update: { quantity },
        create: { branchId: branch.id, productId: product.id, quantity, lowStockAt: 5 },
      });
    }
  }

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
