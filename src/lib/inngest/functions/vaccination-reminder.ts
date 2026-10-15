import { inngest } from "@/lib/inngest/client";
import { cron } from "inngest";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/termii";

// Daily CRON — no separate scheduler infrastructure needed, per the
// brief's explicit point about Inngest covering cron as well as events.
// Queries pets with a vaccination due in the next 14 days and reminds
// their owner once (reminderSentAt gates re-sending on subsequent runs).
export const vaccinationDueReminder = inngest.createFunction(
  { id: "vaccination-due-reminder", triggers: cron("0 7 * * *") }, // 7am daily
  async ({ step }) => {
    const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const dueRecords = await step.run("find-due-vaccinations", async () => {
      return prisma.vaccinationRecord.findMany({
        where: { dueAt: { lte: in14Days, gte: new Date() }, reminderSentAt: null },
        include: {
          pet: { select: { name: true, owner: { select: { name: true, email: true, phone: true } } } },
        },
      });
    });

    for (const record of dueRecords) {
      await step
        .run(`remind-${record.id}`, async () => {
          const dueDate = new Date(record.dueAt).toLocaleDateString("en-NG", { dateStyle: "medium" });
          if (record.pet.owner.phone) {
            await sendSms(
              record.pet.owner.phone,
              `Robakeye Vet: ${record.pet.name}'s ${record.vaccine} vaccination is due ${dueDate}. Book a visit at our Sheu flagship clinic.`,
            );
          }
          await prisma.vaccinationRecord.update({
            where: { id: record.id },
            data: { reminderSentAt: new Date() },
          });
        })
        .catch((err) => console.error(`[vaccination-reminder] failed for ${record.id}`, err));
    }

    return { remindersSent: dueRecords.length };
  },
);
