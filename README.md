# Robakeye

Multi-vertical e-commerce platform (Pharmacy + Veterinary + Supermarket) for
Robakeye, Ibadan — 3 branches: Ajadi, Ojoo, and the Sheu flagship (the only
branch with a full veterinary clinic).

Design/spec reference docs live in [`docs/`](./docs) and [`brand/`](./brand)
(brand guide, IA spec, homepage spec, technical architecture, pharmacy/vet
compliance, admin RBAC, revenue roadmap) — this app implements those specs
milestone by milestone.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router, TypeScript, Tailwind v4, Radix-based components) |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Background jobs / cron | Inngest |
| File storage | Cloudinary (private delivery type for prescriptions) |
| Payments | Paystack (Inline + Webhooks) |
| Maps | Google Maps JS API + Distance Matrix API |
| SMS/WhatsApp | Termii |
| Email | Resend |
| Hosting | Vercel |
| Database | Supabase Postgres (pooled runtime + direct migration URL) |
| ORM | Prisma 6 |
| Testing | Vitest (unit) + Playwright (E2E) |

> Tailwind v4 reads its theme from CSS, not `tailwind.config.ts` — the brand
> tokens (`--rk-navy`, `--rk-amber`, etc., from `brand/tokens.json`) live in
> `src/app/globals.css`, which is the equivalent of the old config file.

> Prisma defaults to v8's new hosted "Prisma Platform" CLI, which assumes
> Prisma's own managed Postgres. This project uses Prisma strictly as an ORM
> against our own Supabase database, so dependencies are pinned to the
> classic v6 CLI (`prisma generate` / `migrate dev` / `studio`).

## 1. Manual infrastructure setup (one-time, do this before first run)

### 1a. Supabase (database)

1. Create a project at [supabase.com](https://supabase.com) (region: pick
   one close to your Vercel deployment region).
2. Project Settings → Database → Connection string:
   - Copy the **Transaction pooler** string (port `6543`) → this is
     `DATABASE_URL`. Append `?pgbouncer=true` if not already present.
   - Copy the **Direct connection** string (port `5432`) → this is
     `DIRECT_URL`.
3. Paste both into `.env` (see step 4 below).

### 1b. Vercel (hosting)

1. Push this repo to GitHub (see step 5).
2. [vercel.com/new](https://vercel.com/new) → import the GitHub repo.
3. In the Vercel project → Settings → Environment Variables, add every
   variable from `.env.example` (Production + Preview). **Do not** set
   `INNGEST_DEV` in Vercel — that variable is local-dev-only.
4. Framework preset should auto-detect "Next.js" — leave build command as
   default (`next build`).

### 1c. Upstash (Redis — rate limiting, OTP throttling, distance-matrix cache)

1. Create a database at [upstash.com](https://upstash.com) (Redis, regional,
   same region as Vercel if possible).
2. Copy the **REST URL** and **REST Token** from the database's "REST API"
   tab → `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.

### 1d. Inngest (background jobs & cron)

1. Create an account/app at [app.inngest.com](https://app.inngest.com).
2. Create an app named `robakeye`.
3. Settings → Event Keys → copy the default key → `INNGEST_EVENT_KEY`.
4. Settings → Signing Keys → copy the key → `INNGEST_SIGNING_KEY`.
5. Add both to Vercel's environment variables (production only — local dev
   uses `INNGEST_DEV=1` instead and needs no keys).
6. After first deploy, add a new app in the Inngest dashboard pointing at
   `https://<your-domain>/api/inngest` so it can sync your functions.

### 1e. Cloudinary (images + prescription documents)

1. Create an account at [cloudinary.com](https://cloudinary.com).
2. Dashboard → copy **Cloud name**, **API Key**, **API Secret**.
3. Settings → Upload → Add upload preset:
   - Name: `robakeye-prescriptions`
   - **Delivery type: Private** (critical — this keeps prescription images
     unreachable by a guessed URL; see NDPA note in `.env.example`).
   - Signing mode: Signed.
4. Add a second, unsigned preset (e.g. `robakeye-products`) for ordinary
   public product images if you want client-side uploads from the admin
   dashboard.

### 1f. Paystack, Google Maps, Termii, Resend

Standard dashboard signup for each; copy the API keys into `.env`. These
are flagged as TODOs in `.env.example` because they need real business
registration details only the client can provide (Paystack settlement
account, Termii sender ID approval, etc.).

## 2. Local development

```bash
git clone <repo-url> robakeye && cd robakeye
npm install
cp .env.example .env   # fill in real values from step 1
npm run db:generate
npm run db:migrate     # creates tables in Supabase via DIRECT_URL
npm run db:seed        # seeds 3 stores, their own catalogues, roles, superadmin
npm run dev
```

### Tests

```bash
npm run test:unit      # Vitest — pricing, delivery radius, cart, URL helpers
# E2E (Playwright, installed Chrome) against a LOCAL database only:
DATABASE_URL=$LOCAL_DB DIRECT_URL=$LOCAL_DB npm run dev     # terminal 1
E2E_DATABASE_URL=$LOCAL_DB npm run test:e2e                 # terminal 2
```

The E2E global setup creates local-only test accounts (`*@robakeye.test`,
see `tests/e2e/fixtures.ts`) and refuses to run against a non-localhost
database.

In a second terminal, run the local Inngest dev server (discovers the app
automatically once `INNGEST_DEV=1` is set in `.env`):

```bash
npx inngest-cli@latest dev
```

Dev server UI: http://localhost:8288 — app: http://localhost:3000.

The seed script prints the generated superadmin email/password — **change
this password immediately** in any environment beyond localhost.

## 3. Production deploy checklist

- [ ] All `.env.example` variables set in Vercel (Production + Preview)
- [ ] Supabase migrations applied: `npm run db:deploy` (uses `DIRECT_URL`,
      run this from CI/CD or locally against the prod database — never from
      a Vercel serverless function)
- [ ] Inngest app registered against the deployed `/api/inngest` URL
- [ ] Cloudinary `robakeye-prescriptions` preset confirmed **private**
- [ ] Paystack keys are **live** (not `sk_test_`/`pk_test_`) before go-live
- [ ] Custom domain + SSL configured in Vercel

## Project structure

```
src/
  app/
    (customer)/      pharmacy, veterinary, supermarket, cart, checkout, account
    (admin)/         dashboard, orders, products, staff, prescriptions, appointments, settings
    api/             auth, products, orders, payments, webhooks/paystack, inngest
  components/        ui, layout, pharmacy, veterinary, supermarket, admin
  lib/               prisma.ts, auth.ts, cloudinary.ts, utils.ts, inngest/
  types/
  hooks/
  store/
prisma/
  schema.prisma
  seed.ts
```

## Regulatory notes (NDPA 2023 / PCN)

- Prescription images are personal health data under NDPA 2023 — stored
  with Cloudinary's **private** delivery type, never public.
- `ProductClass.CONTROLLED` products have no purchase path in the schema or
  UI at all, on any channel — see `docs/pharmacy-vet-compliance.html`.
- Prescription approval is per line item (`PrescriptionLine.status`), not
  all-or-nothing — see the same doc for the full workflow.

## Milestone status

- [x] **Milestone 1** — Infrastructure setup walkthrough, project scaffold,
      brand tokens, full Prisma schema (20 models), seed script, Inngest
      client/serve route wired and smoke-tested end-to-end locally.
- [x] **Milestone 2** — NextAuth v5 (Credentials + Google), registration with
      Resend email verification via Inngest, forgot/reset password via
      Inngest, role-based `proxy.ts` middleware gating `(admin)` routes by
      permission, TOTP 2FA for roles with `requires2FA` (SUPERADMIN,
      BRANCH_MANAGER), and a device/session manager (list, revoke one,
      "log out other devices", "log out everywhere") built on a custom
      `Session` table since Credentials auth requires JWT sessions, not the
      adapter's database sessions. Full flow (register → verify email →
      login → 2FA enrollment → 2FA-gated login → session revocation)
      browser-tested end to end against a real local Postgres.
- [x] **Milestone 3** — Sticky navbar (dismissible rotating announcement
      bar, mega-menu per vertical fed by real seeded categories, debounced
      search autosuggest against a real `/api/products/search` route,
      branch/location selector persisted via Zustand, cart icon with count,
      session-aware account dropdown) with a separate mobile nav (hamburger
      drawer with accordions, collapsing search). Footer with real branch
      data. `ui/button.tsx`, `badge.tsx`, `input.tsx` port the exact
      variant/state matrix from `docs/homepage-design-spec.html` §09.
      `(customer)/layout.tsx` wraps every customer route (including the
      homepage, moved into the `(customer)` group) in the shell. Found and
      removed an unfounded dark-mode auto-flip from Milestone 1 that broke
      text contrast site-wide — the real design spec is light-only.
      Browser-verified: mega-menu, location persistence, live search
      round-trip, and the authenticated account dropdown (incl. the
      staff-only dashboard link) all confirmed working.
- [x] **Milestone 4** — Hero slider (8 slides, 2 pharmacy/2 veterinary/4
      supermarket, embla-carousel with autoplay that respects
      `prefers-reduced-motion`, dot groups per vertical), three-pillar
      quick-access cards, location finder (real Google Maps integration
      that degrades to an honest placeholder without
      `GOOGLE_MAPS_API_KEY`, synced pin/card selection), featured-products
      carousel (real query, honest empty state pending Milestone 5),
      pharmacy trust strip, veterinary services grid (prices explicitly
      flagged as placeholders pending Milestone 9), promotions banner
      (static per the brief, live countdown UI only), and testimonials
      (explicitly marked as fictional samples, per the spec's own
      disclosure convention — no fabricated data presented as real
      anywhere on the page). Found and fixed a real bug: `Button`'s
      loading-spinner span broke Radix `Slot`'s single-child contract
      whenever `asChild` wrapped a `<Link>`, 500ing the whole homepage.
      Browser-verified live against a real seeded database.
- [x] **Milestone 5** — Product listing pages (`/pharmacy`, `/veterinary`,
      `/supermarket`) with category sidebar, debounced price filter,
      in-stock toggle, sort, grid/list toggle (all URL-param-driven, so
      filters are shareable/bookmarkable and don't need client state above
      the server-rendered list) and pagination. Product detail pages with
      an image gallery, real location-aware branch availability (ported
      exactly from `docs/information-architecture.html` §02's flowchart —
      primary match / fallback branch with "may add delivery fee" / fully
      unavailable with a real restock-notify capture), prescription gating
      (POM → "Consult Pharmacist" CTA, CONTROLLED → informational-only, no
      purchase path on any surface), add-to-cart wired to the Milestone 3
      cart store, related products, and an honest empty reviews state.
      `lib/distance.ts` implements `findAvailableBranches()` — the reusable
      server utility the brief names explicitly — with real Google Distance
      Matrix API calls (cached) degrading to a disclosed straight-line
      estimate when unconfigured, same honesty pattern as Milestone 4's
      map. Seeded 21 representative sample products (not real Robakeye
      SKUs — development/demo catalogue data, same status as the sample
      branch hours/vet pricing flagged elsewhere) covering every state:
      normal stock, out-of-stock-at-one-branch, out-of-stock-everywhere,
      POM, and one CONTROLLED item. Browser-verified live: filters, product
      detail page states (including CONTROLLED's correct render), add to
      cart updating the navbar badge, and a real restock subscription
      persisted to the database.
- [x] **Milestone 6** — `lib/orderCalculation.ts` ports
      `calculateOrderTotal()` from `docs/technical-architecture.html` §04
      line-for-line (itemsSubtotal → comboDiscount → promoDiscount →
      loyaltyDiscount → subtotal → per-branch delivery fees → serviceCharge
      → tax → finalTotal), with real promo-code validation against the
      `Promotion` table and real delivery-fee calculation (`DeliveryZone`
      base+per-km fee × actual distance). Combo discounts, loyalty points,
      and tax all honestly return 0 — no combo-rule engine, no points
      ledger, and no confirmed Nigerian per-category VAT codes exist yet,
      so computing a number for any of them would be inventing business
      policy, not implementing it. Cart page groups by branch with a
      split-fulfillment notice; checkout is a 2-step wizard (delivery
      method + address → review) that creates one `Order` row per branch
      sub-order sharing a `groupId`, atomically decrementing
      `BranchInventory` per the architecture doc's exact race-safe
      `UPDATE ... WHERE quantity >= $1` pattern. Cart state syncs to the
      DB for signed-in users (`CartSync`), merging a guest's local cart
      into their account once per browser session. Real payment
      (Paystack) is explicitly out of scope — orders are created
      `PENDING_PAYMENT`, ready for Milestone 7. Found and fixed two real
      bugs during live testing: the DB-cart merge was re-running (and
      additively double-counting quantities) on every page reload, not
      just actual login; and a product stocked at exactly one branch had
      no way to ever get its branch auto-selected, permanently disabling
      "Add to basket". Browser-verified end to end: mixed-branch cart,
      real promo code discount applied proportionally across split
      sub-orders, address save with honest "not geocoded" disclosure,
      order placement, and confirmed-correct inventory decrement in the
      database.
- [x] **Milestone 7** — Paystack Inline on checkout's new 3rd step,
      `/api/payments/initialize` (real server-side reference generation
      and Paystack API call), `/api/webhooks/paystack` (HMAC-SHA512
      signature verification, fast synchronous Payment/Order update, then
      dispatches `order.paid` and returns 200 — all slow fulfillment work
      happens in Inngest, not in the webhook handler), a polling
      `/api/payments/verify/[reference]` fallback, and an admin-triggered
      refund flow (`actions/refunds.ts`, Paystack refund API, dispatches
      `order.refunded`). `handleOrderPaid` runs the brief's 5 numbered
      steps, each independently retried. **Architectural correction from
      Milestone 6**: inventory now decrements here, at payment time — not
      at order creation — since the brief's step 1 ("decrement inventory")
      living inside the `order.paid` handler implies that's the right
      place; reserving stock for a `PENDING_PAYMENT` order would hold
      inventory hostage against an abandoned Paystack popup. `Payment` now
      links to a checkout `groupId` rather than a single `Order`, since
      one payment can cover several sub-orders. Found and fixed two real
      bugs: the email/SMS/branch-notify steps were sequential, so a single
      broken integration (Resend unconfigured) silently prevented the
      *other* two from ever running — fixed by making each step
      independent; and an admin `window.confirm()` on the refund button
      turned out to be a genuine automation/UX hazard (a blocking native
      dialog with no styling and no recovery path short of closing the
      tab) — replaced with an inline confirm state. Thoroughly verified
      with no real Paystack account: confirmed the init/verify/refund
      routes correctly call Paystack's real API and degrade honestly when
      rejected, then directly simulated a correctly-HMAC-signed webhook
      delivery to exercise the full async chain end to end — confirmed
      atomic inventory decrement, status history, and all three
      notification steps actually firing independently.
- [x] **Milestone 8** — Prescription upload (`actions/prescriptions.ts`,
      signed direct-to-Cloudinary upload baking `type: "private"` into the
      signature so it can't be tampered into a public upload),
      per-line-item pharmacist review (`PrescriptionAuditEntry` gives a
      full decision timeline, not just the latest status), 48h
      approval-token expiry via `step.sleep` in
      `handlePrescriptionReviewed`, and a "Talk to a Pharmacist" polling
      chat (`ConsultRequest`/`ConsultMessage`, 4s poll, per the brief's own
      stated MVP allowance). Closed the loop the brief didn't spell out
      explicitly: `getApprovedPrescriptionQuantity()` wired into
      `AddToCartButton` so an approved line actually unlocks a bounded
      quantity of real purchase, not just a review-only status change.
- [x] **Milestone 9** — Pet profiles + vaccination records
      (`actions/pets.ts`), vet booking (`actions/appointments.ts`,
      `lib/vetAvailability.ts` computes real bookable slots from admin-set
      `VetAvailability` windows minus existing appointments, re-validated
      at write time against the same race the cart/inventory code already
      guards), 24h-before reminder via `step.sleepUntil` (re-checks
      cancelled/already-reminded state on wake), and a daily vaccination-due
      CRON. Customer never picks a specific vet — any staff member free at
      that time counts — a deliberate scope simplification over a full
      per-vet calendar. Admin-side vet-staff availability management
      (weekly recurring windows, not per-date) and an appointments list.
- [x] **Milestone 10** — Admin dashboard core: role-filtered collapsible
      sidebar (`components/admin/sidebar.tsx`, filtered against the same
      18-flag permission set `proxy.ts` already gates routes with), KPI
      cards + 14-day revenue chart (Recharts) + low-stock alerts on
      `/dashboard`, a real filterable Order Management table (search,
      status, branch filters; status-transition state machine in
      `actions/orders-admin.ts`; CSV export) replacing the Milestone 7
      stub, Product Management (CRUD, per-branch inventory + expiry-date
      editor, signed Cloudinary image upload, bulk CSV upload via
      `papaparse` with per-row pass/fail reporting, category management),
      Staff Management (role + branch assignment), Customer Management
      (searchable list + full order/prescription/appointment history
      profile), and a daily `productExpiryAlert` Inngest CRON (90/60/30-day
      thresholds, new `AdminAlert` model for the in-app feed, emails the
      branch's own Branch Manager(s) plus every Inventory Manager — dedup'd
      per threshold so the same item is never double-alerted). Added a
      `customers` segment to `proxy.ts`'s route-permission map (it only
      covered 7 of the 8 sidebar sections before this). Live end-to-end
      verified in a throwaway local Postgres DB: real migration + seed,
      dashboard KPIs/chart/low-stock rendering actual seeded data, a
      complete pet→booking→Inngest-event→admin-visible-appointment chain
      (confirmed the `appointment/booked` run in the Inngest dev UI, and
      that the unconfigured-Resend email step failed in isolation without
      blocking the run — the Milestone 7 fault-isolation pattern holding
      up under a 3rd consumer), staff account creation, and bulk CSV
      product upload (2/2 rows succeeded, both visible in the list after).
- [x] **Milestone 11** — Promotions, delivery, abandoned cart & polish.
      Real combo-rule engine (`ComboDeal` model) filling the Milestone 6
      `applyComboRules` stub — a deal triggers once per complete product
      set found in the cart, fixed-price or percentage-off, feeding the
      calculation engine's existing combo-discount step. Promo codes
      gained a real `minSpendKobo` floor. Both manageable from a new
      `/promotions` admin page (codes list/create, combo deals with a
      product picker, "feature on homepage" toggle). The homepage promo
      banner (static since Milestone 4) now reads a live featured
      `ComboDeal` when one's configured, falling back to the original
      honestly-labelled sample when none is. Delivery got its own
      `/delivery` admin page: active-deliveries list with rider
      assignment (new `DeliveryPartner`/`Order.deliveryPartnerId`
      relation), delivery-partner CRUD, and per-branch delivery-zone fee
      editing (zones existed since Milestone 5 but had no admin UI).
      Abandoned-cart recovery is a real 15-minute Inngest cron
      (`abandoned-cart-recovery`) running a 1h/24h/72h email+SMS sequence
      off a new `Cart.lastActivityAt`/`abandonedStage` pair — deliberately
      NOT `Cart.updatedAt`, since Prisma's `@updatedAt` would've reset the
      clock on the cron's own stage-update write; the 72h stage
      auto-generates a single-use 10%-off code. "Polish" = a free-delivery
      progress bar on the cart page and a real `FREE_DELIVERY_THRESHOLD_KOBO`
      constant backing both it and the announcement bar's "orders above
      ₦X" copy (previously just hardcoded text with no actual fee waiver
      behind it), plus a proper post-delivery Reviews flow (`order/delivered`
      event — pre-declared since Milestone 1's event contracts but never
      dispatched until now — triggers a 2h-delayed review-request email;
      `/account/reviews` lets a customer rate/review any delivered,
      not-yet-reviewed order). Found and fixed a real bug before it ever
      shipped: the free-delivery constant was originally defined inside
      `lib/orderCalculation.ts`, which imports Prisma — importing it from
      the (client-side) announcement bar or cart progress bar would have
      bundled Prisma Client into the browser build; moved the constant to
      a plain `lib/constants.ts` with zero server-only deps, which both
      the server (`orderCalculation.ts`) and client components import
      from. Live-verified end to end in a throwaway local Postgres DB:
      created a real promo code and a real combo deal from the admin UI,
      confirmed the deal appeared live on the homepage banner (real
      countdown to its actual `endsAt`, no "sample" tag), added items to
      cart and watched the free-delivery bar flip from "add ₦X more" to
      "unlocked" at the real ₦15,000 threshold, applied the promo code and
      confirmed the discount math, created a delivery partner, and
      manually invoked the abandoned-cart cron from the Inngest dev UI
      (completed cleanly, 0 reminders sent — correctly below every
      threshold for a cart created minutes earlier).

## Store-owned catalogues (2026-10-18)

Each branch is now a separate store with its own catalogue, prices and
stock — a product row (`Product.branchId`) belongs to exactly one store, so
nothing can mix stores by accident.

- **Landing page** (`/`): navbar, one full-height banner with three slides
  (supermart, pharmacy, vet clinic) and the caption "Where would you like
  to shop today?" over the three location cards, then the footer. Optional
  "find the store nearest to me" uses the browser's location (never sent
  to the server).
- **Stores** live at `/store/<slug>` (home), `/store/<slug>/<department>`,
  `/store/<slug>/<department>/<product>` and `/store/<slug>/search`. A
  store only shows departments it runs (no vet clinic at Ajadi/Ojoo).
  Old `/pharmacy`, `/supermarket`, `/veterinary` links redirect into the
  last-visited store.
- **Schema** (`prisma/migrations/20261018143000_store_owned_catalogue`):
  `BranchInventory` folded into per-store `Product` rows (stock, low-stock
  level, expiry on the listing); slug/SKU unique per store; prescriptions,
  combo deals, store-specific promo codes and in-house riders all carry
  their store. The migration is data-preserving (every old inventory row
  became that store's listing; cart lines, order lines, restock and admin
  alerts were repointed to the right store's listing).
- **Basket & checkout**: one cart, split into a basket per store; each
  basket is checked out on its own (`/checkout?store=<slug>`) and becomes
  one order fulfilled entirely by that store. The server rejects lines from
  another store, controlled medicines, quantities above that store's stock
  and prescription-only medicines without an approved prescription.
- **Delivery**: each store delivers only within its own radius (largest
  `DeliveryZone.maxKm`); addresses beyond it are refused with a pickup
  option, addresses without coordinates pay the zone's base fee, fees are
  rounded up to the next ₦50. Addresses can be pinned with the browser's
  location. In-house riders belong to one store and can only be assigned
  that store's orders; shared couriers serve any store; an order can't go
  "out for delivery" without a rider; pickup orders skip the rider leg.
- **Staff**: branch-scoped roles (`branchScope = OWN`) only see and edit
  their own stores' products, stock, orders, prescriptions, deliveries,
  bundles and promo codes (`lib/staff-scope.ts`). Raising a listing's
  stock from zero emails that store's restock subscribers (Inngest
  `product/restocked`).

