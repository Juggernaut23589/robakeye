import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CheckoutWizard } from "@/components/checkout/checkout-wizard";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ promo?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/checkout");

  const { promo } = await searchParams;
  return <CheckoutWizard initialPromoCode={promo} />;
}
