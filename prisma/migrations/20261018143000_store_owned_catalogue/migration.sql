-- Store-owned catalogue.
--
-- Before: one global Product table + BranchInventory(branch, product, qty).
-- After:  every Product row belongs to exactly one store (Product.branchId)
--         and carries its own stock. The same real-world item sold at two
--         stores is two rows.
--
-- This migration is data-preserving: each existing BranchInventory row
-- becomes its own store listing, and every reference that knows which
-- store it was about (cart lines, order lines, restock and admin alerts)
-- is repointed at that store's listing before the old table is dropped.

-- ── 1. Additive columns (nullable/defaulted so existing rows survive) ────
ALTER TABLE "Branch" ADD COLUMN "coverImage" TEXT,
ADD COLUMN "tagline" TEXT;

ALTER TABLE "Product" ADD COLUMN "branchId" TEXT,
ADD COLUMN "expiryDate" TIMESTAMP(3),
ADD COLUMN "lowStockAt" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "stockQuantity" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "DeliveryPartner" ADD COLUMN "branchId" TEXT,
ADD COLUMN "phone" TEXT;

ALTER TABLE "Promotion" ADD COLUMN "branchId" TEXT;
ALTER TABLE "ComboDeal" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Prescription" ADD COLUMN "branchId" TEXT;

-- A featured deal is now featured on its own store's page, not a single
-- site-wide homepage banner.
ALTER TABLE "ComboDeal" RENAME COLUMN "isFeaturedOnHomepage" TO "isFeatured";

-- Global slug/sku uniqueness has to go before per-store copies can exist.
DROP INDEX "Product_sku_key";
DROP INDEX "Product_slug_key";
DROP INDEX "Product_vertical_class_idx";

-- ── 2. One listing per (product, branch) inventory row ───────────────────
-- The first row per product (ordered by branch id) keeps the original
-- product id, so references with no store context (prescription lines,
-- reviews, consult requests, combo deals) still point at a real listing.
CREATE TEMP TABLE "_listing_map" AS
SELECT
  bi."productId" AS old_id,
  bi."branchId" AS branch_id,
  bi."quantity" AS quantity,
  bi."lowStockAt" AS low_stock_at,
  bi."expiryDate" AS expiry_date,
  CASE
    WHEN row_number() OVER (PARTITION BY bi."productId" ORDER BY bi."branchId") = 1
      THEN bi."productId"
    ELSE 'lst_' || md5(bi."productId" || ':' || bi."branchId")
  END AS new_id
FROM "BranchInventory" bi;

INSERT INTO "Product" (
  "id", "branchId", "sku", "slug", "name", "description", "vertical", "class",
  "categoryId", "priceKobo", "images", "isActive",
  "stockQuantity", "lowStockAt", "expiryDate", "createdAt", "updatedAt"
)
SELECT
  m.new_id, m.branch_id, p."sku", p."slug", p."name", p."description", p."vertical", p."class",
  p."categoryId", p."priceKobo", p."images", p."isActive",
  m.quantity, m.low_stock_at, m.expiry_date, p."createdAt", CURRENT_TIMESTAMP
FROM "_listing_map" m
JOIN "Product" p ON p."id" = m.old_id
WHERE m.new_id <> m.old_id;

UPDATE "Product" p
SET "branchId" = m.branch_id,
    "stockQuantity" = m.quantity,
    "lowStockAt" = m.low_stock_at,
    "expiryDate" = m.expiry_date
FROM "_listing_map" m
WHERE m.new_id = p."id" AND m.old_id = p."id";

-- Products never stocked anywhere go to the flagship (the store offering
-- the most departments), falling back to the oldest store.
UPDATE "Product"
SET "branchId" = (
  SELECT b."id" FROM "Branch" b
  ORDER BY cardinality(b."services") DESC, b."createdAt" ASC
  LIMIT 1
)
WHERE "branchId" IS NULL;

-- ── 3. Repoint store-aware references at the right store's listing ───────
UPDATE "CartItem" ci
SET "productId" = m.new_id
FROM "_listing_map" m
WHERE m.old_id = ci."productId" AND m.branch_id = ci."branchId";

UPDATE "OrderItem" oi
SET "productId" = m.new_id
FROM "Order" o, "_listing_map" m
WHERE o."id" = oi."orderId" AND m.old_id = oi."productId" AND m.branch_id = o."branchId";

UPDATE "RestockSubscription" rs
SET "productId" = m.new_id
FROM "_listing_map" m
WHERE m.old_id = rs."productId" AND m.branch_id = rs."branchId";

UPDATE "AdminAlert" a
SET "productId" = m.new_id
FROM "_listing_map" m
WHERE m.old_id = a."productId" AND m.branch_id = a."branchId";

-- Cart lines pointing at products that no longer exist can't satisfy the
-- new foreign key; they were already unbuyable.
DELETE FROM "CartItem" WHERE "productId" NOT IN (SELECT "id" FROM "Product");

-- Collapse any (cart, product) duplicates into one line before the new
-- unique index, summing quantities rather than dropping any.
UPDATE "CartItem" keep
SET "quantity" = dup.total
FROM (
  SELECT "cartId", "productId", MIN("id") AS keep_id, SUM("quantity") AS total
  FROM "CartItem" GROUP BY "cartId", "productId" HAVING COUNT(*) > 1
) dup
WHERE keep."id" = dup.keep_id;

DELETE FROM "CartItem" c
USING (
  SELECT "cartId", "productId", MIN("id") AS keep_id
  FROM "CartItem" GROUP BY "cartId", "productId" HAVING COUNT(*) > 1
) dup
WHERE c."cartId" = dup."cartId" AND c."productId" = dup."productId" AND c."id" <> dup.keep_id;

DELETE FROM "RestockSubscription" r
USING (
  SELECT "productId", "email", MIN("id") AS keep_id
  FROM "RestockSubscription" GROUP BY "productId", "email" HAVING COUNT(*) > 1
) dup
WHERE r."productId" = dup."productId" AND r."email" = dup."email" AND r."id" <> dup.keep_id;

-- ── 4. Store ownership for prescriptions and combo deals ─────────────────
UPDATE "Prescription" pr
SET "branchId" = sub.branch_id
FROM (
  SELECT DISTINCT ON (pl."prescriptionId") pl."prescriptionId" AS prescription_id, p."branchId" AS branch_id
  FROM "PrescriptionLine" pl
  JOIN "Product" p ON p."id" = pl."productId"
  ORDER BY pl."prescriptionId", pl."id"
) sub
WHERE sub.prescription_id = pr."id";

UPDATE "ComboDeal" cd
SET "branchId" = p."branchId"
FROM "Product" p
WHERE p."id" = cd."productIds"[1];

UPDATE "Prescription"
SET "branchId" = (SELECT b."id" FROM "Branch" b ORDER BY cardinality(b."services") DESC, b."createdAt" ASC LIMIT 1)
WHERE "branchId" IS NULL;

UPDATE "ComboDeal"
SET "branchId" = (SELECT b."id" FROM "Branch" b ORDER BY cardinality(b."services") DESC, b."createdAt" ASC LIMIT 1)
WHERE "branchId" IS NULL;

DROP TABLE "_listing_map";

-- ── 5. Lock in the new shape ─────────────────────────────────────────────
ALTER TABLE "Product" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "Prescription" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "ComboDeal" ALTER COLUMN "branchId" SET NOT NULL;

ALTER TABLE "BranchInventory" DROP CONSTRAINT "BranchInventory_branchId_fkey";
ALTER TABLE "BranchInventory" DROP CONSTRAINT "BranchInventory_productId_fkey";
DROP TABLE "BranchInventory";

ALTER TABLE "RestockSubscription" DROP CONSTRAINT "RestockSubscription_branchId_fkey";
DROP INDEX "RestockSubscription_productId_branchId_email_key";
ALTER TABLE "RestockSubscription" DROP COLUMN "branchId";

DROP INDEX "CartItem_cartId_productId_branchId_key";
ALTER TABLE "CartItem" DROP COLUMN "branchId";

CREATE UNIQUE INDEX "CartItem_cartId_productId_key" ON "CartItem"("cartId", "productId");
CREATE INDEX "Product_branchId_vertical_isActive_idx" ON "Product"("branchId", "vertical", "isActive");
CREATE INDEX "Product_expiryDate_idx" ON "Product"("expiryDate");
CREATE UNIQUE INDEX "Product_branchId_slug_key" ON "Product"("branchId", "slug");
CREATE UNIQUE INDEX "Product_branchId_sku_key" ON "Product"("branchId", "sku");
CREATE UNIQUE INDEX "RestockSubscription_productId_email_key" ON "RestockSubscription"("productId", "email");

ALTER TABLE "Product" ADD CONSTRAINT "Product_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComboDeal" ADD CONSTRAINT "ComboDeal_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryPartner" ADD CONSTRAINT "DeliveryPartner_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
