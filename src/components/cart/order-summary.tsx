import { formatNaira } from "@/lib/utils";
import type { OrderCalculation } from "@/lib/orderCalculation";

// Same fixed step order as docs/information-architecture.html §05's
// waterfall — rendered, never recomputed client-side.
export function OrderSummary({ quote }: { quote: OrderCalculation }) {
  const rows: { label: string; amount: number; show: boolean }[] = [
    { label: "Items subtotal", amount: quote.itemsSubtotalKobo, show: true },
    { label: "Combo discount", amount: -quote.comboDiscountKobo, show: quote.comboDiscountKobo > 0 },
    { label: "Promo discount", amount: -quote.promoDiscountKobo, show: quote.promoDiscountKobo > 0 },
    { label: "Loyalty points", amount: -quote.loyaltyDiscountKobo, show: quote.loyaltyDiscountKobo > 0 },
  ];

  return (
    <div className="rounded-rk-md border border-rk-n200 p-4">
      <h3 className="mb-3 font-display text-sm font-bold text-rk-navy">Order summary</h3>
      <div className="grid gap-1.5 text-sm">
        {rows
          .filter((r) => r.show)
          .map((r) => (
            <div key={r.label} className="flex justify-between">
              <span className="text-rk-n600">{r.label}</span>
              <span className={r.amount < 0 ? "text-rk-success" : "text-rk-ink"}>
                {r.amount < 0 ? "−" : ""}
                {formatNaira(Math.abs(r.amount))}
              </span>
            </div>
          ))}

        <div className="my-1 flex justify-between border-t border-rk-n200 pt-1.5 font-semibold">
          <span>Subtotal</span>
          <span>{formatNaira(quote.subtotalKobo)}</span>
        </div>

        {quote.subOrders.map((so) => (
          <div key={so.branchId} className="flex justify-between text-xs text-rk-n600">
            <span>
              Delivery — {so.branchName}
              {so.distanceKm !== null && ` (${so.distanceKm.toFixed(1)} km)`}
            </span>
            <span>{formatNaira(so.deliveryFeeKobo)}</span>
          </div>
        ))}
        {quote.subOrders.length === 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-rk-n600">Delivery fee</span>
            <span>{formatNaira(quote.deliveryFeeKobo)}</span>
          </div>
        )}

        {quote.serviceChargeKobo > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-rk-n600">Service fee</span>
            <span>{formatNaira(quote.serviceChargeKobo)}</span>
          </div>
        )}
        {quote.taxKobo > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-rk-n600">VAT / tax</span>
            <span>{formatNaira(quote.taxKobo)}</span>
          </div>
        )}

        <div className="mt-1.5 flex justify-between border-t border-rk-n200 pt-2 text-base font-bold text-rk-navy">
          <span>Total</span>
          <span>{formatNaira(quote.finalTotalKobo)}</span>
        </div>
      </div>

      {quote.subOrders.length > 1 && (
        <p className="mt-3 rounded-rk-sm bg-rk-amber-tint px-2.5 py-2 text-xs text-rk-amber-deep">
          This order ships from {quote.subOrders.length} branches as separate deliveries — one
          payment, {quote.subOrders.length} fulfilments.
        </p>
      )}
    </div>
  );
}
