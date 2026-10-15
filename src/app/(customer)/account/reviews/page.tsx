import { getReviewableOrders, getMyReviews } from "@/actions/reviews";
import { ReviewableOrdersClient } from "@/components/reviews/reviewable-orders-client";

export default async function MyReviewsPage() {
  const [reviewable, myReviews] = await Promise.all([getReviewableOrders(), getMyReviews()]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-rk-navy">Reviews</h1>
      <p className="mb-6 text-sm text-rk-n600">
        Delivered orders you haven&apos;t reviewed yet appear here — we also email a reminder a
        couple of hours after delivery.
      </p>

      <ReviewableOrdersClient orders={reviewable} />

      {myReviews.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 font-display text-lg font-bold text-rk-navy">Your reviews</h2>
          <ul className="grid gap-2">
            {myReviews.map((r) => (
              <li key={r.id} className="rounded-rk-md border border-rk-n200 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-rk-n600">{r.order?.orderNumber}</span>
                  <span className="text-rk-amber">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </span>
                </div>
                {r.body && <p className="mt-1 text-rk-ink">{r.body}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
