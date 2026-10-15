"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { useCartQuote } from "@/hooks/use-cart-quote";
import { listAddresses } from "@/actions/addresses";
import { createOrder } from "@/actions/orders";
import { AddressForm } from "@/components/checkout/address-form";
import { PaystackPayButton } from "@/components/checkout/paystack-pay-button";
import { OrderSummary } from "@/components/cart/order-summary";
import { PromoCodeForm } from "@/components/cart/promo-code-form";
import { Button } from "@/components/ui/button";
import type { Address } from "@prisma/client";
import type { DeliveryMethod } from "@/lib/orderCalculation";

const STEPS = ["Delivery", "Review", "Payment"] as const;

export function CheckoutWizard({ initialPromoCode }: { initialPromoCode?: string }) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);

  const [step, setStep] = useState(0);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("DELIVERY");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [promoCode, setPromoCode] = useState(initialPromoCode);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [orderGroup, setOrderGroup] = useState<{ groupId: string; orderNumbers: string[] } | null>(
    null,
  );
  const [verifying, setVerifying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    listAddresses().then((rows) => {
      setAddresses(rows);
      const def = rows.find((a) => a.isDefault) ?? rows[0];
      if (def) setSelectedAddressId(def.id);
    });
  }, []);

  const { quote, error: quoteError } = useCartQuote(
    deliveryMethod,
    deliveryMethod === "DELIVERY" ? selectedAddressId : undefined,
    promoCode,
  );

  if (items.length === 0 && !orderGroup) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-rk-n600">Your cart is empty.</p>
      </div>
    );
  }

  async function placeOrder() {
    setPlacing(true);
    setPlaceError(null);
    const result = await createOrder({
      items: items.map((i) => ({ productId: i.productId, branchId: i.branchId, quantity: i.quantity })),
      deliveryMethod,
      addressId: deliveryMethod === "DELIVERY" ? selectedAddressId : undefined,
      promoCode,
    });
    setPlacing(false);
    if (!result.ok) {
      setPlaceError(result.error);
      return;
    }
    // Orders now exist as real PENDING_PAYMENT rows — clear the cart (its
    // job is done) but don't redirect yet; the customer still has to pay.
    clearCart();
    setOrderGroup({ groupId: result.groupId, orderNumbers: result.orderNumbers });
    setStep(2);
  }

  async function onPaymentSuccess(reference: string) {
    // The inline popup's own callback fires on the client the instant
    // Paystack approves the charge — before our webhook has necessarily
    // landed. Call the verify endpoint so the order is reliably marked
    // PAID (and order.paid dispatched) before we send the customer to the
    // confirmation page, rather than racing the webhook.
    try {
      await fetch(`/api/payments/verify/${encodeURIComponent(reference)}`);
    } catch {
      // Non-fatal — the webhook will still land independently.
    }
    router.push(`/checkout/confirmation?orders=${orderGroup!.orderNumbers.join(",")}`);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <ol className="mb-6 flex gap-4 text-sm font-medium">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? "text-rk-navy" : "text-rk-n400"}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {step === 0 && (
            <div className="grid gap-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setDeliveryMethod("DELIVERY")}
                  className={`flex-1 rounded-rk-md border p-3 text-left text-sm ${deliveryMethod === "DELIVERY" ? "border-rk-navy bg-rk-navy-tint" : "border-rk-n200"}`}
                >
                  <b className="block text-rk-navy">Delivery</b>
                  <span className="text-rk-n600">Delivered to your address</span>
                </button>
                <button
                  onClick={() => setDeliveryMethod("PICKUP")}
                  className={`flex-1 rounded-rk-md border p-3 text-left text-sm ${deliveryMethod === "PICKUP" ? "border-rk-navy bg-rk-navy-tint" : "border-rk-n200"}`}
                >
                  <b className="block text-rk-navy">Pickup</b>
                  <span className="text-rk-n600">Collect in-branch, no delivery fee</span>
                </button>
              </div>

              {deliveryMethod === "DELIVERY" && (
                <div className="grid gap-3">
                  {addresses.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setSelectedAddressId(a.id)}
                      className={`rounded-rk-md border p-3 text-left text-sm ${selectedAddressId === a.id ? "border-rk-navy bg-rk-navy-tint" : "border-rk-n200"}`}
                    >
                      <b className="text-rk-navy">{a.label}</b>
                      <p className="text-rk-n600">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}</p>
                      {!a.lat && (
                        <p className="mt-1 text-xs text-rk-n400">
                          Location not geocoded — delivery fee estimate unavailable
                        </p>
                      )}
                    </button>
                  ))}

                  {showAddressForm ? (
                    <AddressForm
                      onCreated={(a) => {
                        setAddresses((prev) => [...prev, a]);
                        setSelectedAddressId(a.id);
                        setShowAddressForm(false);
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="w-fit text-sm text-rk-blue underline"
                    >
                      + Add a new address
                    </button>
                  )}
                </div>
              )}

              <Button
                variant="amber"
                className="w-fit"
                disabled={deliveryMethod === "DELIVERY" && !selectedAddressId}
                onClick={() => setStep(1)}
              >
                Continue to review
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4">
              <p className="text-sm text-rk-n600">
                {deliveryMethod === "DELIVERY"
                  ? `Delivering to ${addresses.find((a) => a.id === selectedAddressId)?.line1 ?? ""}`
                  : "Pickup in-branch"}
              </p>
              {placeError && <p className="text-sm text-rk-alert">{placeError}</p>}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button variant="amber" onClick={placeOrder} loading={placing}>
                  Continue to payment
                </Button>
              </div>
            </div>
          )}

          {step === 2 && orderGroup && (
            <div className="grid gap-4">
              {verifying ? (
                <p className="text-sm text-rk-n600">Confirming your payment…</p>
              ) : (
                <>
                  <p className="text-sm text-rk-n600">
                    Order{orderGroup.orderNumbers.length > 1 ? "s" : ""}{" "}
                    <b className="text-rk-navy">{orderGroup.orderNumbers.join(", ")}</b> saved —
                    complete payment to confirm.
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

        <div className="grid gap-4">
          <PromoCodeForm appliedCode={promoCode} onApply={setPromoCode} error={quoteError} />
          {quote && <OrderSummary quote={quote} />}
        </div>
      </div>
    </div>
  );
}
