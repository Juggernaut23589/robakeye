import { formatNaira } from "@/lib/utils";
import type { OrderCalculation } from "@/lib/orderCalculation";

// Same fixed step order as docs/information-architecture.html §05's
// waterfall — rendered, never recomputed client-side.
export function OrderSummary({
  quote,
  showDelivery = true,
  title = "Order summary",
}: {
  quote: OrderCalculation;
  showDelivery?: boolean;
  title?: string;
}) {
  const rows: { label: string; amount: number; show: boolean }[] = [
    { label: "Items", amount: quote.itemsSubtotalKobo, show: true },
    { label: "Bundle discount", amount: -quote.comboDiscountKobo, show: quote.comboDiscountKobo > 0 },
    { label: "Promo code", amount: -quote.promoDiscountKobo, show: quote.promoDiscountKobo > 0 },
    { label: "Loyalty points", amount: -quote.loyaltyDiscountKobo, show: quote.loyaltyDiscountKobo > 0 },
  ];

  let deliveryLabel: React.ReactNode;
  if (quote.deliveryMethod === "PICKUP") deliveryLabel = "Free (pickup)";
  else if (quote.deliveryError) deliveryLabel = "Unavailable";
  else if (quote.deliveryFeeKobo === 0) deliveryLabel = "Free";
  else deliveryLabel = formatNaira(quote.deliveryFeeKobo);

  return (
    <div className="rounded-rk-lg border border-rk-n200 bg-white p-4">
      <h3 className="mb-3 font-display text-sm font-bold text-rk-navy">{title}</h3>
      <dl className="grid gap-1.5 text-sm">
        {rows
          .filter((r) => r.show)
          .map((r) => (
            <div key={r.label} className="flex justify-between">
              <dt className="text-rk-n600">{r.label}</dt>
              <dd className={r.amount < 0 ? "font-mono text-rk-success" : "font-mono text-rk-ink"}>
                {r.amount < 0 ? "−" : ""}
                {formatNaira(Math.abs(r.amount))}
              </dd>
            </div>
          ))}

        {showDelivery && (
          <div className="flex justify-between">
            <dt className="text-rk-n600">
              Delivery
              {quote.deliveryMethod === "DELIVERY" && quote.distanceKm !== null && !quote.deliveryError && (
                <span className="text-xs"> · {quote.distanceKm.toFixed(1)} km</span>
              )}
              {quote.deliveryEstimated && quote.deliveryMethod === "DELIVERY" && !quote.deliveryError && (
                <span className="text-xs"> · standard rate</span>
              )}
            </dt>
            <dd className={quote.deliveryError ? "text-rk-alert" : "font-mono text-rk-ink"}>{deliveryLabel}</dd>
          </div>
        )}
        {quote.serviceChargeKobo > 0 && (
          <div className="flex justify-between">
            <dt className="text-rk-n600">Service fee</dt>
            <dd className="font-mono">{formatNaira(quote.serviceChargeKobo)}</dd>
          </div>
        )}
        {quote.taxKobo > 0 && (
          <div className="flex justify-between">
            <dt className="text-rk-n600">VAT / tax</dt>
            <dd className="font-mono">{formatNaira(quote.taxKobo)}</dd>
          </div>
        )}

        <div className="mt-1.5 flex justify-between border-t border-rk-n200 pt-2 text-base font-bold text-rk-navy">
          <dt>{showDelivery ? "Total" : "Subtotal"}</dt>
          <dd className="font-mono">
            {formatNaira(showDelivery ? quote.finalTotalKobo : quote.subtotalKobo)}
          </dd>
        </div>
      </dl>
      {!showDelivery && <p className="mt-2 text-xs text-rk-n600">Delivery is worked out at checkout from your address.</p>}
    </div>
  );
}
