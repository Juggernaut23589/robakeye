"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, MapPin, Store as StoreIcon, Truck } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useCartQuote } from "@/hooks/use-cart-quote";
import { listAddresses } from "@/actions/addresses";
import { createOrder } from "@/actions/orders";
import { AddressForm } from "@/components/checkout/address-form";
import { PaystackPayButton } from "@/components/checkout/paystack-pay-button";
import { OrderSummary } from "@/components/cart/order-summary";
import { PromoCodeForm } from "@/components/cart/promo-code-form";
import { ProductImage } from "@/components/catalogue/product-image";
import { Button } from "@/components/ui/button";
import { haversineKm } from "@/lib/geo";
import { formatNaira } from "@/lib/utils";
import { storePath, storeShortName } from "@/lib/departments";
import type { Address } from "@prisma/client";
import type { DeliveryMethod, OrderCalculation } from "@/lib/orderCalculation";

const STEPS = ["Delivery", "Review", "Payment"] as const;

export type CheckoutStore = {
  id: string;
  slug: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  deliveryKm: number | null;
};

// Checks out ONE store's basket. The order is fulfilled entirely by that
// store — its stock, its delivery radius, its rider — and only that
// store's lines leave the basket once the order is placed.
export function CheckoutWizard({ store, initialPromoCode }: { store: CheckoutStore; initialPromoCode?: string }) {
  const router = useRouter();
  const allItems = useCartStore((s) => s.items);
  const items = useMemo(() => allItems.filter((i) => i.branchId === store.id), [allItems, store.id]);
  const clearStore = useCartStore((s) => s.clearStore);
  const short = storeShortName(store.name);

  const [step, setStep] = useState(0);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(store.deliveryKm ? "DELIVERY" : "PICKUP");
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [promoCode, setPromoCode] = useState(initialPromoCode);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [orderGroup, setOrderGroup] = useState<{
    groupId: string;
    orderNumbers: string[];
    totalKobo: number;
    quote: OrderCalculation;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    listAddresses().then((rows) => {
      setAddresses(rows);
      // Prefer the default address if it's inside this store's area.
      const inRange = (a: Address) =>
        a.lat == null || a.lng == null || !store.deliveryKm || haversineKm({ lat: a.lat, lng: a.lng }, store) <= store.deliveryKm;
      const pick = rows.find((a) => a.isDefault && inRange(a)) ?? rows.find(inRange) ?? rows[0];
      if (pick) setSelectedAddressId(pick.id);
      if (rows.length === 0) setShowAddressForm(true);
    });
  }, [store]);

  const { quote, error: quoteError, loading: quoteLoading } = useCartQuote(
    store.id,
    deliveryMethod,
    deliveryMethod === "DELIVERY" ? selectedAddressId : undefined,
    promoCode,
  );

  if (items.length === 0 && !orderGroup) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-rk-navy">Nothing to check out at {short}</h1>
        <p className="mt-2 text-rk-n600">Your {short} basket is empty.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/cart">View basket</Link>
          </Button>
          <Button asChild>
            <Link href={storePath(store.slug)}>Shop at {short}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const selectedAddress = addresses?.find((a) => a.id === selectedAddressId);
  const deliveryBlocked = deliveryMethod === "DELIVERY" && (!selectedAddressId || !!quote?.deliveryError);

  async function placeOrder() {
    setPlacing(true);
    setPlaceError(null);
    const result = await createOrder({
      branchId: store.id,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      deliveryMethod,
      addressId: deliveryMethod === "DELIVERY" ? selectedAddressId : undefined,
      promoCode,
    });
    setPlacing(false);
    if (!result.ok) {
      setPlaceError(result.error);
      return;
    }
    // The order now exists as PENDING_PAYMENT — this store's basket has
    // done its job; other stores' baskets stay put.
    setOrderGroup({
      groupId: result.groupId,
      orderNumbers: result.orderNumbers,
      totalKobo: quote!.finalTotalKobo,
      quote: quote!,
    });
    clearStore(store.id);
    setStep(2);
  }

  async function onPaymentSuccess(reference: string) {
    // Verify before redirecting so the order is reliably PAID (and
    // order.paid dispatched) rather than racing the webhook.
    try {
      await fetch(`/api/payments/verify/${encodeURIComponent(reference)}`);
    } catch {
      // Non-fatal — the webhook still lands independently.
    }
    router.push(`/checkout/confirmation?orders=${orderGroup!.orderNumbers.join(",")}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-rk-amber-deep uppercase">Checkout</p>
          <h1 className="font-display text-2xl font-bold text-rk-navy sm:text-3xl">{store.name}</h1>
        </div>
        <ol className="flex gap-2 text-xs font-semibold" aria-label="Checkout steps">
          {STEPS.map((label, i) => (
            <li
              key={label}
              aria-current={i === step ? "step" : undefined}
              className={`flex items-center gap-1.5 rounded-rk-pill px-3 py-1.5 ${
                i === step ? "bg-rk-navy text-white" : i < step ? "bg-rk-success-tint text-rk-success" : "bg-rk-n200/60 text-rk-n600"
              }`}
            >
              {i < step ? <CircleCheck className="size-3.5" aria-hidden /> : <span>{i + 1}</span>}
              {label}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {step === 0 && (
            <div className="grid gap-5">
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">How would you like to get your order?</legend>
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("DELIVERY")}
                  disabled={!store.deliveryKm}
                  aria-pressed={deliveryMethod === "DELIVERY"}
                  className={`flex items-start gap-3 rounded-rk-lg border-2 p-4 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${deliveryMethod === "DELIVERY" ? "border-rk-navy bg-rk-navy-tint" : "border-rk-n200 bg-white hover:border-rk-n400"}`}
                >
                  <Truck className="mt-0.5 size-5 flex-none text-rk-navy" aria-hidden />
                  <span>
                    <b className="block text-rk-navy">Delivery from {short}</b>
                    <span className="text-rk-n600">
                      {store.deliveryKm ? `To addresses within ${store.deliveryKm} km of the store` : "Not available at this store"}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("PICKUP")}
                  aria-pressed={deliveryMethod === "PICKUP"}
                  className={`flex items-start gap-3 rounded-rk-lg border-2 p-4 text-left text-sm transition-colors ${deliveryMethod === "PICKUP" ? "border-rk-navy bg-rk-navy-tint" : "border-rk-n200 bg-white hover:border-rk-n400"}`}
                >
                  <StoreIcon className="mt-0.5 size-5 flex-none text-rk-navy" aria-hidden />
                  <span>
                    <b className="block text-rk-navy">Pick up at {short}</b>
                    <span className="text-rk-n600">Free · {store.address}</span>
                  </span>
                </button>
              </fieldset>

              {deliveryMethod === "DELIVERY" && (
                <div className="grid gap-3">
                  <h2 className="font-display text-base font-bold text-rk-navy">Deliver to</h2>
                  {addresses === null && <div className="h-20 animate-pulse rounded-rk-lg bg-rk-n200 motion-reduce:animate-none" />}
                  {addresses?.map((a) => {
                    const km = a.lat != null && a.lng != null ? haversineKm({ lat: a.lat, lng: a.lng }, store) : null;
                    const outside = km !== null && store.deliveryKm !== null && km > store.deliveryKm;
                    return (
                      <button
                        type="button"
                        key={a.id}
                        onClick={() => setSelectedAddressId(a.id)}
                        aria-pressed={selectedAddressId === a.id}
                        className={`flex items-start gap-3 rounded-rk-lg border-2 p-4 text-left text-sm transition-colors ${selectedAddressId === a.id ? "border-rk-navy bg-rk-navy-tint" : "border-rk-n200 bg-white hover:border-rk-n400"}`}
                      >
                        <MapPin className="mt-0.5 size-4 flex-none text-rk-amber-deep" aria-hidden />
                        <span className="flex-1">
                          <b className="text-rk-navy">{a.label}</b>
                          <span className="block text-rk-n600">
                            {a.line1}
                            {a.line2 ? `, ${a.line2}` : ""}, {a.city}
                          </span>
                          {km === null ? (
                            <span className="mt-1 block text-xs text-rk-n600">Location not pinned — the standard delivery rate applies</span>
                          ) : outside ? (
                            <span className="mt-1 block text-xs font-semibold text-rk-alert">
                              About {km.toFixed(1)} km away — outside {short}&apos;s {store.deliveryKm} km delivery area
                            </span>
                          ) : (
                            <span className="mt-1 block text-xs text-rk-success">About {km.toFixed(1)} km from the store</span>
                          )}
                        </span>
                      </button>
                    );
                  })}

                  {showAddressForm ? (
                    <AddressForm
                      onCreated={(a) => {
                        setAddresses((prev) => [...(prev ?? []), a]);
                        setSelectedAddressId(a.id);
                        setShowAddressForm(false);
                      }}
                      onCancel={addresses && addresses.length > 0 ? () => setShowAddressForm(false) : undefined}
                    />
                  ) : (
                    <button type="button" onClick={() => setShowAddressForm(true)} className="w-fit text-sm font-semibold text-rk-blue hover:underline">
                      + Add a new address
                    </button>
                  )}

                  {quote?.deliveryError && (
                    <p role="alert" className="flex items-start gap-2 rounded-rk-md bg-rk-alert-tint p-3 text-sm text-rk-alert">
                      <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden />
                      <span>
                        {quote.deliveryError}{" "}
                        <button type="button" onClick={() => setDeliveryMethod("PICKUP")} className="font-semibold underline">
                          Switch to pickup
                        </button>
                      </span>
                    </p>
                  )}
                </div>
              )}

              <Button
                variant="amber"
                className="w-fit"
                disabled={deliveryBlocked || quoteLoading || !quote}
                onClick={() => setStep(1)}
              >
                Continue to review
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-5">
              <div className="rounded-rk-lg border border-rk-n200 bg-white p-4 text-sm">
                <p className="font-semibold text-rk-navy">
                  {deliveryMethod === "DELIVERY" ? "Delivering to" : "Picking up at"}
                </p>
                <p className="text-rk-n600">
                  {deliveryMethod === "DELIVERY"
                    ? `${selectedAddress?.label}: ${selectedAddress?.line1}${selectedAddress?.line2 ? `, ${selectedAddress.line2}` : ""}`
                    : `${store.name}, ${store.address}`}
                </p>
                <button type="button" onClick={() => setStep(0)} className="mt-1 text-xs font-semibold text-rk-blue hover:underline">
                  Change
                </button>
              </div>
              <ul className="divide-y divide-rk-n200 rounded-rk-lg border border-rk-n200 bg-white px-4">
                {items.map((i) => (
                  <li key={i.productId} className="flex items-center gap-3 py-3 text-sm">
                    <ProductImage src={i.image} alt="" className="size-12 flex-none rounded-rk-sm" />
                    <span className="flex-1">
                      {i.name}
                      <span className="block text-xs text-rk-n600">Qty {i.quantity}</span>
                    </span>
                    <span className="font-mono font-semibold text-rk-navy">{formatNaira(i.priceKobo * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              {placeError && (
                <p role="alert" className="rounded-rk-md bg-rk-alert-tint p-3 text-sm text-rk-alert">
                  {placeError}{" "}
                  <Link href="/cart" className="font-semibold underline">
                    Review basket
                  </Link>
                </p>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button variant="amber" onClick={placeOrder} loading={placing} disabled={!quote || !!quote.deliveryError}>
                  Place order &amp; pay
                </Button>
              </div>
            </div>
          )}

          {step === 2 && orderGroup && (
            <div className="grid gap-4 rounded-rk-lg border border-rk-n200 bg-white p-6">
              {verifying ? (
                <p className="text-sm text-rk-n600">Confirming your payment…</p>
              ) : (
                <>
                  <p className="text-sm text-rk-n600">
                    Order <b className="font-mono text-rk-navy">{orderGroup.orderNumbers.join(", ")}</b> is saved — pay{" "}
                    <b className="text-rk-navy">{formatNaira(orderGroup.totalKobo)}</b> to confirm it with {short}.
                  </p>
                  {paymentError && <p className="text-sm text-rk-alert">{paymentError}</p>}
                  <PaystackPayButton
                    groupId={orderGroup.groupId}
                    onVerifying={() => setVerifying(true)}
                    onSuccess={onPaymentSuccess}
                    onError={(message) => setPaymentError(message)}
                  />
                </>
              )}
            </div>
          )}
        </div>

        <aside className="grid content-start gap-4">
          {step < 2 && <PromoCodeForm appliedCode={promoCode} onApply={setPromoCode} error={quoteError} />}
          {(orderGroup?.quote ?? quote) ? (
            <OrderSummary quote={(orderGroup?.quote ?? quote)!} title={`${short} order`} />
          ) : (
            <div className="h-48 animate-pulse rounded-rk-lg bg-rk-n200 motion-reduce:animate-none" />
          )}
        </aside>
      </div>
    </div>
  );
}
