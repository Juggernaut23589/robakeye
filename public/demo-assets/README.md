# Demo assets

Demo catalogue and homepage hero banner imagery — **not Robakeye's own
product photography**, but real photos of the actual thing each file is
used for (a real photo of ibuprofen tablets for the ibuprofen product, a
real supermarket aisle for the supermarket banner), sourced from Wikimedia
Commons. Full attribution and license per file in `SOURCES.md` — several
are CC BY/CC BY-SA, which require it. Same "sample data" status as the
fictional testimonials and sample vet pricing already flagged elsewhere in
this project: swap for real Robakeye product photography before this is
used with real customers.

- `products/<slug>.jpg` — one real, representative photo per seeded
  product in `prisma/seed.ts` (not the specific Robakeye-branded product,
  since that doesn't exist yet — a real photo of what the product *is*).
- `banners/<vertical>.jpg` — one real scene photo per vertical
  (pharmacy/veterinary/supermarket), used behind the homepage hero slides
  in `src/components/home/hero-slider.tsx`.

The real Robakeye logo lives separately in `public/brand/` (copied from
the source files in `/brand` at the repo root) and is **not** a
placeholder — it's the actual brand mark, already final.
