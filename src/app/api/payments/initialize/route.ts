import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initializeTransaction } from "@/lib/paystack";

const bodySchema = z.object({ groupId: z.string() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where: { groupId: parsed.data.groupId, userId: session.user.id },
  });
  if (orders.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (orders.some((o) => o.status !== "PENDING_PAYMENT")) {
    return NextResponse.json({ error: "This order has already been paid or cancelled" }, { status: 409 });
  }

  if (!process.env.PAYSTACK_SECRET_KEY || !process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
    // Honest, distinct error rather than letting this crash on a missing
    // env var — Milestone 1's manual Paystack signup step hasn't happened
    // in this environment yet.
    return NextResponse.json(
      { error: "Payment processing isn't configured in this environment yet." },
      { status: 503 },
    );
  }

  const amountKobo = orders.reduce((sum, o) => sum + o.totalKobo, 0);
  // Server-side reference generation, per the brief — never trust a
  // client-supplied reference for what gets charged.
  const reference = `RK-${parsed.data.groupId.slice(0, 8)}-${Date.now()}`;

  let data;
  try {
    ({ data } = await initializeTransaction({
      email: session.user.email!,
      amountKobo,
      reference,
      metadata: { groupId: parsed.data.groupId, orderNumbers: orders.map((o) => o.orderNumber) },
    }));
  } catch (err) {
    console.error("Paystack initialize failed", err);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 502 });
  }

  await prisma.payment.create({
    data: {
      orderId: orders[0].id,
      groupId: parsed.data.groupId,
      reference,
      amountKobo,
      status: "INITIALIZED",
    },
  });

  return NextResponse.json({
    reference,
    accessCode: data.access_code,
    amountKobo,
    email: session.user.email,
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
  });
}
