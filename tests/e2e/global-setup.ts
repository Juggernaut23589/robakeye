import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { E2E_SHOPPER, E2E_STAFF, e2eDatabaseUrl } from "./fixtures";

// Puts the local E2E database into a known state: a verified test shopper
// with one address near Ojoo and one far outside every delivery area, an
// empty server cart, and the stock levels the tests rely on.
export default async function globalSetup() {
  const prisma = new PrismaClient({ datasources: { db: { url: e2eDatabaseUrl() } } });
  try {
    const user = await prisma.user.upsert({
      where: { email: E2E_SHOPPER.email },
      update: { passwordHash: await bcrypt.hash(E2E_SHOPPER.password, 10) },
      create: {
        kind: "CUSTOMER",
        name: E2E_SHOPPER.name,
        email: E2E_SHOPPER.email,
        emailVerified: new Date(),
        passwordHash: await bcrypt.hash(E2E_SHOPPER.password, 10),
      },
    });
    await prisma.cart.deleteMany({ where: { userId: user.id } });

    const ojoo = await prisma.branch.findUniqueOrThrow({ where: { slug: "ojoo" } });
    await prisma.address.deleteMany({ where: { userId: user.id, orders: { none: {} } } });
    await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    await prisma.address.createMany({
      data: [
        { userId: user.id, label: "E2E near Ojoo", line1: "1 Test Close, Ojoo", lat: ojoo.lat + 0.01, lng: ojoo.lng, isDefault: true },
        // Lagos — far outside every Ibadan store's radius.
        { userId: user.id, label: "E2E far away", line1: "1 Test Street, Lagos", city: "Lagos", lat: 6.52, lng: 3.37 },
      ],
    });

    for (const staff of Object.values(E2E_STAFF)) {
      const role = await prisma.role.findUniqueOrThrow({ where: { name: staff.role } });
      const staffUser = await prisma.user.upsert({
        where: { email: staff.email },
        update: { passwordHash: await bcrypt.hash(E2E_SHOPPER.password, 10) },
        create: {
          kind: "STAFF",
          name: `E2E ${staff.role}`,
          email: staff.email,
          emailVerified: new Date(),
          passwordHash: await bcrypt.hash(E2E_SHOPPER.password, 10),
        },
      });
      await prisma.staff.upsert({
        where: { userId: staffUser.id },
        update: { roleId: role.id, isActive: true, branches: { deleteMany: {}, create: [{ branchId: ojoo.id }] } },
        create: { userId: staffUser.id, roleId: role.id, branches: { create: [{ branchId: ojoo.id }] } },
      });
    }

    const setStock = (store: string, slug: string, stockQuantity: number) =>
      prisma.product.updateMany({ where: { slug, branch: { slug: store } }, data: { stockQuantity, isActive: true } });
    await setStock("ojoo", "sliced-bread", 25);
    await setStock("ojoo", "vegetable-oil-1l", 0);
    await setStock("sheu", "long-grain-rice-5kg", 25);
  } finally {
    await prisma.$disconnect();
  }
}
