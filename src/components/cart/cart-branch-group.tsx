import { Badge } from "@/components/ui/badge";
import { CartLineItem } from "@/components/cart/cart-line-item";
import type { CartItem } from "@/store/cart";

// Groups by branch first per docs/information-architecture.html §05 —
// "this is also how checkout will split fulfilment."
export function CartBranchGroup({
  branchName,
  items,
}: {
  branchName: string;
  items: CartItem[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 pb-1">
        <b className="font-display text-sm text-rk-navy">{branchName}</b>
        <Badge variant="amber">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </Badge>
      </div>
      <div className="divide-y divide-rk-n200">
        {items.map((item) => (
          <CartLineItem key={`${item.productId}:${item.branchId}`} item={item} />
        ))}
      </div>
    </div>
  );
}
