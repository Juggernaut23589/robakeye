import { inngest, testPing } from "@/lib/inngest/client";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/inngest/functions/auth";
import { handleOrderPaid } from "@/lib/inngest/functions/order-paid";
import { handleOrderRefunded } from "@/lib/inngest/functions/order-refunded";
import { handlePrescriptionSubmitted, handlePrescriptionReviewed } from "@/lib/inngest/functions/prescription";
import { handleAppointmentBooked } from "@/lib/inngest/functions/appointment";
import { vaccinationDueReminder } from "@/lib/inngest/functions/vaccination-reminder";
import { productExpiryAlert } from "@/lib/inngest/functions/expiry-alert";
import { abandonedCartRecovery } from "@/lib/inngest/functions/abandoned-cart";
import { handleOrderDelivered } from "@/lib/inngest/functions/order-delivered";

// Milestone 1 smoke-test function only — confirms the Inngest pipeline
// (event send → function run → step.run) works end-to-end before any
// real job logic is written in later milestones. Trigger from a server
// action or route with: inngest.send(testPing.create({}))
export const ping = inngest.createFunction(
  { id: "ping", triggers: testPing },
  async ({ step }) => {
    await step.run("log-ping", async () => {
      console.log("[inngest] ping received", new Date().toISOString());
      return { ok: true };
    });
    return { ok: true };
  },
);

// Real job functions (prescription expiry sleep, vaccination cron,
// abandoned-cart sequence, etc.) are added here milestone by milestone
// and exported from this array.
export const functions = [
  ping,
  sendVerificationEmail,
  sendPasswordResetEmail,
  handleOrderPaid,
  handleOrderRefunded,
  handlePrescriptionSubmitted,
  handlePrescriptionReviewed,
  handleAppointmentBooked,
  vaccinationDueReminder,
  productExpiryAlert,
  abandonedCartRecovery,
  handleOrderDelivered,
];
