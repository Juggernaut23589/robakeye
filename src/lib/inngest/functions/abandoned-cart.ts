import { inngest } from "@/lib/inngest/client";
import { cron } from "inngest";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/termii";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { formatNaira } from "@/lib/utils";

// docs/revenue-features-roadmap.html §02: "1h/24h/72h SMS+email sequence,
// the last one carrying a small incentive code." Reuses the existing
// Termii/Resend integrations — no new provider. Runs every 15 minutes so
// each stage fires reasonably close to its threshold without needing a
// per-cart scheduled job.
const STAGE_THRESHOLD_MS: Record<1 | 2 | 3, number> = {
  1: 1 * 60 * 60 * 1000,
  2: 24 * 60 * 60 * 1000,
  3: 72 * 60 * 60 * 1000,
};

export const abandonedCartRecovery = inngest.createFunction(
  { id: "abandoned-cart-recovery", triggers: cron("*/15 * * * *") },
  async ({ step }) => {
    let remindersSent = 0;

    for (const stage of [1, 2, 3] as const) {
      const cutoff = new Date(Date.now() - STAGE_THRESHOLD_MS[stage]);

      const carts = await step.run(`find-stage-${stage}-carts`, async () => {
        return prisma.cart.findMany({
          where: { abandonedStage: stage - 1, lastActivityAt: { lte: cutoff }, items: { some: {} } },
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            items: true,
          },
        });
      });

      for (const cart of carts) {
        await step
          .run(`remind-stage-${stage}-${cart.id}`, async () => {
            const products = await prisma.product.findMany({
              where: { id: { in: cart.items.map((i) => i.productId) } },
              select: { id: true, name: true, priceKobo: true },
            });
            const productById = new Map(products.map((p) => [p.id, p]));
            const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
            const subtotalKobo = cart.items.reduce(
              (sum, i) => sum + (productById.get(i.productId)?.priceKobo ?? 0) * i.quantity,
              0,
            );
            const firstItemName = productById.get(cart.items[0]?.productId)?.name ?? "your items";

            let incentiveCode: string | null = null;
            if (stage === 3) {
              incentiveCode = `COMEBACK${cart.userId.slice(-6).toUpperCase()}`;
              await prisma.promotion.upsert({
                where: { code: incentiveCode },
                create: {
                  code: incentiveCode,
                  type: "PERCENTAGE",
                  percentOff: 10,
                  startsAt: new Date(),
                  endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                  usageLimit: 1,
                  generatedForUserId: cart.userId,
                },
                update: {},
              });
            }

            const subject =
              stage === 1
                ? "You left something in your cart"
                : stage === 2
                  ? "Still thinking it over? Your cart's waiting"
                  : `10% off if you come back — code ${incentiveCode}`;
            const incentiveLine = incentiveCode
              ? `<p>Use code <b>${incentiveCode}</b> for 10% off — valid 7 days, one use.</p>`
              : "";
            const smsIncentive = incentiveCode ? ` Use ${incentiveCode} for 10% off.` : "";

            // Independent channels — one unconfigured/failing integration
            // can't block the other, same isolation pattern as every
            // other multi-channel Inngest function in this project.
            if (cart.user.email) {
              try {
                const { error } = await getResend().emails.send({
                  from: FROM_EMAIL,
                  to: cart.user.email,
                  subject,
                  html: `
                    <p>Hi ${cart.user.name},</p>
                    <p>You left ${itemCount} item(s) (including ${firstItemName}) worth ${formatNaira(subtotalKobo)} in your Robakeye cart.</p>
                    ${incentiveLine}
                  `,
                });
                if (error) throw new Error(`Resend error: ${error.message}`);
              } catch (err) {
                console.error(`[abandoned-cart] email failed for ${cart.user.email}`, err);
              }
            }

            if (cart.user.phone) {
              try {
                await sendSms(
                  cart.user.phone,
                  `Robakeye: You left ${itemCount} item(s) in your cart.${smsIncentive}`,
                );
              } catch (err) {
                console.error(`[abandoned-cart] SMS failed for ${cart.user.phone}`, err);
              }
            }

            // Only the reminder stage moves — lastActivityAt is untouched
            // here on purpose (see the schema comment on Cart).
            await prisma.cart.update({ where: { id: cart.id }, data: { abandonedStage: stage } });
          })
          .catch((err) => console.error(`[abandoned-cart] stage ${stage} failed for cart ${cart.id}`, err));
        remindersSent++;
      }
    }

    return { remindersSent };
  },
);
