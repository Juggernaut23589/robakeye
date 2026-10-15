import { cn } from "@/lib/utils";

// Shimmer respects prefers-reduced-motion via the `motion-reduce:animate-none`
// utility — per the design spec's accessibility checklist, loading
// animations shorten to near-static rather than disappearing outright.
function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-rk-sm bg-rk-n200 motion-reduce:animate-none",
        className,
      )}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex w-46 flex-none flex-col gap-2 rounded-rk-md border border-rk-n200 bg-white p-3">
      <Shimmer className="h-28 w-full rounded-rk-md" />
      <Shimmer className="h-3.5 w-4/5" />
      <Shimmer className="h-3 w-1/2" />
      <Shimmer className="h-4 w-14" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      role="status"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductCarouselSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden" role="status" aria-label="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
