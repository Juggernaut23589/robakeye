import { inngest, appointmentBooked } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { sendSms } from "@/lib/termii";

const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000; // 24h before the appointment

export const handleAppointmentBooked = inngest.createFunction(
  { id: "handle-appointment-booked", triggers: appointmentBooked, retries: 4 },
  async ({ event, step }) => {
    const { appointmentId } = event.data;

    const appt = await step.run("load-appointment", async () => {
      return prisma.vetAppointment.findUnique({
        where: { id: appointmentId },
        include: {
          pet: { select: { name: true } },
          owner: { select: { name: true, email: true, phone: true } },
          service: { select: { name: true } },
          branch: { select: { name: true, address: true } },
        },
      });
    });
    if (!appt) return { skipped: true, reason: "appointment not found" };

    const when = new Date(appt.startsAt).toLocaleString("en-NG", {
      dateStyle: "full",
      timeStyle: "short",
    });

    // Immediate confirmation — email and SMS run independently (same
    // isolation fix as order-paid: one channel's failure can't block the
    // other).
    await step
      .run("send-confirmation-email", async () => {
        const { error } = await getResend().emails.send({
          from: FROM_EMAIL,
          to: appt.owner.email,
          subject: `Vet appointment confirmed — ${appt.pet.name}, ${when}`,
          html: `
            <p>Hi ${appt.owner.name},</p>
            <p>${appt.service.name} for ${appt.pet.name} is confirmed for ${when} at ${appt.branch.name} (${appt.branch.address}).</p>
          `,
        });
        if (error) throw new Error(`Resend error: ${error.message}`);
      })
      .catch((err) => console.error("[appointment-booked] confirmation email failed", err));

    await step
      .run("send-confirmation-sms", async () => {
        if (!appt.owner.phone) return { skipped: true, reason: "no phone on file" };
        await sendSms(
          appt.owner.phone,
          `Robakeye Vet: ${appt.service.name} for ${appt.pet.name} confirmed, ${when} at ${appt.branch.name}.`,
        );
      })
      .catch((err) => console.error("[appointment-booked] confirmation SMS failed", err));

    // Delayed reminder — 24h before the appointment. sleepUntil with a
    // past timestamp (an appointment booked less than 24h out) resolves
    // immediately rather than erroring, so this doesn't need a branch for
    // "already too close to send a 24h-out reminder."
    const reminderAt = new Date(new Date(appt.startsAt).getTime() - REMINDER_LEAD_MS);
    await step.sleepUntil("wait-until-reminder-time", reminderAt);

    await step
      .run("send-reminder", async () => {
        const fresh = await prisma.vetAppointment.findUnique({ where: { id: appointmentId } });
        // Don't remind a cancelled or already-reminded appointment —
        // checked at wake time since a lot can change during the sleep.
        if (!fresh || fresh.status !== "CONFIRMED" || fresh.reminderSentAt) {
          return { skipped: true, reason: "cancelled or already reminded" };
        }

        if (appt.owner.phone) {
          await sendSms(
            appt.owner.phone,
            `Reminder: ${appt.service.name} for ${appt.pet.name} tomorrow, ${when} at ${appt.branch.name}.`,
          );
        }
        await prisma.vetAppointment.update({
          where: { id: appointmentId },
          data: { reminderSentAt: new Date() },
        });
      })
      .catch((err) => console.error("[appointment-booked] reminder failed", err));

    return { reminderScheduledFor: reminderAt.toISOString() };
  },
);
