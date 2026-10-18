# Demo assets

Demo catalogue and banner imagery — **not Robakeye's own product
photography**, but real photos of the actual thing each file is used for
(a real photo of paracetamol tablets for the paracetamol listing, a real
supermarket display for the supermarket banner), sourced from Wikimedia
Commons. Full attribution and license per file in `SOURCES.md` — several
are CC BY/CC BY-SA, which require it. Swap for real Robakeye photography
before this is used with real customers.

- `products/<slug>.jpg` — one representative 800×800 photo per product
  slug in `prisma/seed.ts`. Every store's listing of the same product
  (e.g. Ojoo's and Sheu's rice) points at the same file.
- `banners/hero-supermarket.jpg`, `hero-pharmacy.jpg`, `hero-veterinary.jpg`
  — the three slides of the landing-page banner
  (`src/components/home/store-picker-hero.tsx`), the department tiles on
  each store's home page, and the stores' `coverImage`.

The real Robakeye logo lives separately in `public/brand/` and is **not**
a placeholder — it's the actual brand mark.
