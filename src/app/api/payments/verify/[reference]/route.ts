import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";
import { inngest, orderPaid } from "@/lib/inngest/client";

// Client-side polling fallback for when the webhook is delayed — per the
// brief. Calls Paystack directly (never trusts the client's own "it
// looked like it worked" signal) and runs the exact same idempotent
// update the webhook does, so whichever one lands first wins and the
// other is a no-op.
export async function GET(req: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { reference } = await params;
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  if (payment.status === "SUCCESS") {
    return NextResponse.json({ status: "SUCCESS" });
  }

  const { data } = await verifyTransaction(reference);

  if (data.status === "success") {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "SUCCESS", paystackRaw: data as unknown as object },
      }),
      prisma.order.updateMany({
        where: { groupId: payment.groupId },
        data: { status: "PAID" },
      }),
    ]);
    await inngest.send(orderPaid.create({ groupId: payment.groupId }));
    return NextResponse.json({ status: "SUCCESS" });
  }

  return NextResponse.json({ status: data.status.toUpperCase() });
}
