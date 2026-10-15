import { prisma } from "@/lib/prisma";
import { HeroSlider } from "@/components/home/hero-slider";
import { Pillars } from "@/components/home/pillars";
import { LocationFinder } from "@/components/home/location-finder";
import { FeaturedProducts } from "@/components/home/featured-products";
import { TrustStrip } from "@/components/home/trust-strip";
import { VetServices } from "@/components/home/vet-services";
import { PromoBanner } from "@/components/home/promo-banner";
import { Testimonials } from "@/components/home/testimonials";

export default async function Home() {
  const now = new Date();
  const [branches, products, featuredCombo] = await Promise.all([
    prisma.branch.findMany({
      select: { id: true, slug: true, name: true, address: true, lat: true, lng: true, services: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true, priceKobo: true, vertical: true, images: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.comboDeal.findFirst({
      where: { isActive: true, isFeaturedOnHomepage: true, startsAt: { lte: now }, endsAt: { gte: now } },
    }),
  ]);

  return (
    <>
      <HeroSlider />
      <Pillars />
      <LocationFinder branches={branches} />
      <FeaturedProducts products={products} />
      <TrustStrip />
      <VetServices />
      <PromoBanner
        featured={
          featuredCombo
            ? {
                headline: featuredCombo.bannerHeadline ?? featuredCombo.name,
                description: null,
                endsAt: featuredCombo.endsAt.toISOString(),
              }
            : null
        }
      />
      <Testimonials />
    </>
  );
}
