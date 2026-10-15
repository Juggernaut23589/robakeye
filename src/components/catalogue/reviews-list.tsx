type ReviewRow = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: Date;
  user: { name: string };
};

export function ReviewsList({ reviews }: { reviews: ReviewRow[] }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-display text-lg font-bold text-rk-navy">Reviews</h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-rk-n600">
          No reviews yet.
        </p>
      ) : (
        <ul className="grid gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-rk-md border border-rk-n200 p-3">
              <div className="flex items-center justify-between text-sm">
                <b className="text-rk-navy">{r.user.name}</b>
                <span className="text-rk-amber">
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </span>
              </div>
              {r.body && <p className="mt-1 text-sm text-rk-ink">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
