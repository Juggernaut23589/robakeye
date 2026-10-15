import { formatNaira } from "@/lib/utils";
import { FREE_DELIVERY_THRESHOLD_KOBO } from "@/lib/constants";

// "Cart free-delivery progress bar" — docs/revenue-features-roadmap.html
// §02: reads the threshold already in the order calculation engine, no
// recommendation logic. itemsSubtotalKobo (pre-discount) is what qualifies,
// matching calculateDeliveryFee's own waiver check.
export function FreeDeliveryBar({ itemsSubtotalKobo }: { itemsSubtotalKobo: number }) {
  const remaining = FREE_DELIVERY_THRESHOLD_KOBO - itemsSubtotalKobo;
  const pct = Math.min(100, Math.round((itemsSubtotalKobo / FREE_DELIVERY_THRESHOLD_KOBO) * 100));

  if (remaining <= 0) {
    return (
      <div className="rounded-rk-md border border-rk-success bg-rk-success-tint px-4 py-3 text-sm font-semibold text-rk-success">
        You&apos;ve unlocked free delivery 🎉
      </div>
    );
  }

  return (
    <div className="rounded-rk-md border border-rk-n200 px-4 py-3">
      <p className="text-sm text-rk-n600">
        Add <b className="text-rk-navy">{formatNaira(remaining)}</b> more for free delivery
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-rk-pill bg-rk-n200">
        <div className="h-full rounded-rk-pill bg-rk-amber transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
