"use client";

import { useState } from "react";
import { ReviewForm } from "@/components/reviews/review-form";

type ReviewableOrder = {
  id: string;
  orderNumber: string;
  branch: { name: string };
  items: { product: { name: string }; quantity: number }[];
};

export function ReviewableOrdersClient({ orders }: { orders: ReviewableOrder[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (orders.length === 0) {
    return <p className="text-sm text-rk-n600">Nothing to review right now.</p>;
  }

  return (
    <div className="grid gap-3">
      {orders.map((o) => (
        <div key={o.id} className="rounded-rk-md border border-rk-n200 p-4">
          <div className="flex items-center justify-between">
            <b className="font-mono text-sm text-rk-navy">{o.orderNumber}</b>
            <span className="text-xs text-rk-n600">{o.branch.name}</span>
          </div>
          <p className="mt-1 text-sm text-rk-n600">
            {o.items.map((i) => `${i.quantity}× ${i.product.name}`).join(", ")}
          </p>
          {openId === o.id ? (
            <ReviewForm orderId={o.id} onDone={() => setOpenId(null)} />
          ) : (
            <button onClick={() => setOpenId(o.id)} className="mt-2 text-xs text-rk-blue underline">
              Leave a review
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
