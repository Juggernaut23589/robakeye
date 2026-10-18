import { inngest, productRestocked } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { productPath } from "@/lib/departments";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Fired by updateStock when a store's listing goes from 0 to >0 units.
// Subscriptions are per listing, so a shopper who asked about Ojoo's
// stock hears about Ojoo — not about another store restocking.
export const notifyRestockSubscribers = inngest.createFunction(
  { id: "notify-restock-subscribers", triggers: productRestocked, retries: 3 },
  async ({ event, step }) => {
    const { productId } = event.data;

    const product = await step.run("load-product", () =>
      prisma.product.findUnique({
        where: { id: productId },
        select: { name: true, slug: true, vertical: true, stockQuantity: true, isActive: true, branch: { select: { name: true, slug: true } } },
      }),
    );
    if (!product || !product.isActive || product.stockQuantity === 0) return { skipped: true };

    const subscribers = await step.run("load-subscribers", () =>
      prisma.restockSubscription.findMany({ where: { productId, notifiedAt: null }, select: { id: true, email: true } }),
    );

    const url = `${APP_URL}${productPath(product.branch.slug, product.vertical, product.slug)}`;
    let sent = 0;
    for (const sub of subscribers) {
      await step
        .run(`notify-${sub.id}`, async () => {
          const { error } = await getResend().emails.send({
            from: FROM_EMAIL,
            to: sub.email,
            subject: `${product.name} is back in stock at ${product.branch.name}`,
            html: `<p>Good news — <b>${product.name}</b> is back in stock at Robakeye ${product.branch.name}.</p><p><a href="${url}">Shop it now</a> while stock lasts.</p>`,
          });
          if (error) throw new Error(`Resend error: ${error.message}`);
          await prisma.restockSubscription.update({ where: { id: sub.id }, data: { notifiedAt: new Date() } });
        })
        .then(() => sent++)
        .catch((err) => console.error(`[restock] notify failed for ${sub.id}`, err));
    }
    return { sent, total: subscribers.length };
  },
);
