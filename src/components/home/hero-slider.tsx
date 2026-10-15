"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// The 8 slides from docs/homepage-design-spec.html §02 "All 8 slides" table
// — 2 pharmacy, 2 veterinary, 4 supermarket, grouped in that order so the
// dot-groups below read left-to-right by vertical.
type Slide = {
  vertical: "pharmacy" | "veterinary" | "supermarket";
  kicker: string;
  headline: string;
  body: string;
  ctas: { label: string; href: string; variant: "amber" | "outline" }[];
};

const SLIDES: Slide[] = [
  {
    vertical: "pharmacy",
    kicker: "Pharmacy",
    headline: "Your Trusted Pharmacy in Ibadan",
    body: "Licensed pharmacists, genuine medication, and same-day delivery across Ibadan.",
    ctas: [
      { label: "Shop Pharmacy", href: "/pharmacy", variant: "amber" },
      { label: "Talk to a Pharmacist", href: "/pharmacy/consult", variant: "outline" },
    ],
  },
  {
    vertical: "pharmacy",
    kicker: "Pharmacy",
    headline: "Prescription? We've Got You Covered",
    body: "Upload your prescription and a licensed pharmacist reviews it, line by line.",
    ctas: [{ label: "Upload Prescription", href: "/account/prescriptions", variant: "amber" }],
  },
  {
    vertical: "veterinary",
    kicker: "Veterinary",
    headline: "Complete Pet Care at Our Flagship Clinic",
    body: "Checkups, vaccinations and surgery from our full veterinary team in Sheu.",
    ctas: [{ label: "Book a Vet Visit", href: "/veterinary/book", variant: "amber" }],
  },
  {
    vertical: "veterinary",
    kicker: "Veterinary",
    headline: "Everything Your Pet Needs",
    body: "Food, grooming supplies and medication for dogs, cats and more.",
    ctas: [{ label: "Shop Pet Supplies", href: "/veterinary", variant: "amber" }],
  },
  {
    vertical: "supermarket",
    kicker: "Supermarket",
    headline: "Fresh Groceries, Delivered Fast",
    body: "Produce, pantry staples and household essentials, same-day across Ibadan.",
    ctas: [{ label: "Shop Groceries", href: "/supermarket", variant: "amber" }],
  },
  {
    vertical: "supermarket",
    kicker: "Supermarket",
    headline: "This Week's Hot Deals & Combos",
    body: "Bundle pricing on everyday essentials, refreshed every week.",
    ctas: [{ label: "See This Week's Deals", href: "/supermarket/deals", variant: "amber" }],
  },
  {
    vertical: "supermarket",
    kicker: "Supermarket",
    headline: "Everything Under One Roof",
    body: "Household, beverages, snacks and more — one trip, one delivery.",
    ctas: [{ label: "Browse Supermarket", href: "/supermarket", variant: "amber" }],
  },
  {
    vertical: "supermarket",
    kicker: "Supermarket",
    headline: "Visit Our New Flagship Super-Store",
    body: "Pharmacy, supermarket and a full vet clinic — all in one Sheu location.",
    ctas: [{ label: "Get Directions", href: "/locations#sheu", variant: "outline" }],
  },
];

// Gradient is now a translucent scrim over a real demo photo (see
// public/demo-assets/README.md) rather than the sole background — kept so
// text stays readable against any photo and the vertical's brand colour
// still reads at a glance.
const VERTICAL_SCRIM: Record<Slide["vertical"], string> = {
  pharmacy: "bg-gradient-to-br from-rk-navy/90 to-rk-blue/80",
  veterinary: "bg-gradient-to-br from-rk-lavender-deep/90 to-rk-lavender/80",
  supermarket: "bg-gradient-to-br from-rk-amber-deep/90 to-rk-amber/80",
};
const VERTICAL_IMAGE: Record<Slide["vertical"], string> = {
  pharmacy: "/demo-assets/banners/pharmacy.jpg",
  veterinary: "/demo-assets/banners/veterinary.jpg",
  supermarket: "/demo-assets/banners/supermarket.jpg",
};

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function groupSizes(slides: Slide[]) {
  const sizes: Record<Slide["vertical"], number> = { pharmacy: 0, veterinary: 0, supermarket: 0 };
  for (const s of slides) sizes[s.vertical]++;
  return sizes;
}

export function HeroSlider() {
  // useSyncExternalStore is the React-sanctioned way to read a synchronous
  // external source (matchMedia) without a setState-in-effect.
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  // Autoplay plugin is only ever created once (ref-stable), but its
  // internal "stopOnInteraction"/delay options don't matter when
  // prefers-reduced-motion is set — we simply never call .play() below.
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 6500, stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const autoplay = emblaApi.plugins().autoplay;
    if (reducedMotion) autoplay?.stop();
    else autoplay?.play();
  }, [emblaApi, reducedMotion]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const sizes = groupSizes(SLIDES);
  let runningIndex = 0;
  const groups = (["pharmacy", "veterinary", "supermarket"] as const).map((v) => {
    const start = runningIndex;
    runningIndex += sizes[v];
    return { vertical: v, start, count: sizes[v] };
  });

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      className="relative"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {SLIDES.map((slide, i) => (
            <div key={i} className="relative min-w-0 flex-[0_0_100%]">
              <div
                className="flex min-h-80 flex-col justify-center gap-3 bg-cover bg-center px-8 py-16 text-white sm:min-h-[26rem] sm:px-16"
                style={{ backgroundImage: `url(${VERTICAL_IMAGE[slide.vertical]})` }}
              >
                <div className={`absolute inset-0 ${VERTICAL_SCRIM[slide.vertical]}`} aria-hidden="true" />
                <div className="relative z-10 flex flex-col gap-3">
                  <span className="text-sm font-bold text-rk-amber">{slide.kicker}</span>
                  <h2 className="max-w-xl font-display text-3xl font-extrabold sm:text-4xl">
                    {slide.headline}
                  </h2>
                  <p className="max-w-md text-white/85">{slide.body}</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {slide.ctas.map((cta) => (
                      <Button key={cta.label} asChild variant={cta.variant}>
                        <Link href={cta.href}>{cta.label}</Link>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={scrollPrev}
        aria-label="Previous slide"
        className="absolute top-1/2 left-3 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-rk-navy shadow"
      >
        ‹
      </button>
      <button
        onClick={scrollNext}
        aria-label="Next slide"
        className="absolute top-1/2 right-3 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-rk-navy shadow"
      >
        ›
      </button>

      <div className="flex items-center justify-center gap-4 bg-rk-n50 py-3 text-xs text-rk-n600">
        {groups.map((g) => (
          <div key={g.vertical} className="flex items-center gap-1.5">
            <span className="capitalize">{g.vertical}</span>
            <div className="flex gap-1">
              {Array.from({ length: g.count }).map((_, i) => {
                const slideIndex = g.start + i;
                return (
                  <span
                    key={i}
                    className={`size-1.5 rounded-full ${selectedIndex === slideIndex ? "bg-rk-amber" : "bg-rk-n200"}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
