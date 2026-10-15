# Demo assets

Placeholder imagery for the demo catalogue and homepage hero banner — **not
real product photography or branded campaign imagery.** Same "sample data"
status as the fictional testimonials and sample vet pricing already flagged
elsewhere in this project.

- `products/<slug>.jpg` — one stable (seeded) random photo per seeded
  product in `prisma/seed.ts`, sourced from [Lorem Picsum](https://picsum.photos).
  Same slug always resolves to the same photo, but the photo itself has no
  relationship to the actual product.
- `banners/<vertical>.jpg` — one background photo per vertical
  (pharmacy/veterinary/supermarket), used behind the homepage hero slides in
  `src/components/home/hero-slider.tsx`.

Swap every file in here for real photography before this app is used with
real customers. The real Robakeye logo lives separately in `public/brand/`
(copied from the source files in `/brand` at the repo root) and is **not**
a placeholder.
