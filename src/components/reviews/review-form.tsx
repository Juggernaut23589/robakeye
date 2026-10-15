"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitReview } from "@/actions/reviews";
import { Button } from "@/components/ui/button";

export function ReviewForm({ orderId, onDone }: { orderId: string; onDone?: () => void }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await submitReview({ orderId, rating, body: body || undefined });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone?.();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 grid gap-2 rounded-rk-sm bg-rk-n50 p-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={`text-xl ${n <= rating ? "text-rk-amber" : "text-rk-n200"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="How was it? (optional)"
        className="rounded-rk-sm border border-rk-n200 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-rk-alert">{error}</p>}
      <Button type="submit" size="sm" loading={pending} className="w-fit">
        Submit review
      </Button>
    </form>
  );
}
