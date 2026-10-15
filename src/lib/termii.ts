// Termii — Nigerian SMS gateway (docs/technical-architecture.html's
// integrations table: "DND-route support, needed for reliable delivery to
// Nigerian numbers"). Same honesty pattern as the other third-party
// integrations in this project: logs and returns rather than throwing
// when TERMII_API_KEY isn't configured, since Milestone 1's manual setup
// step for it hasn't happened yet — but Inngest still retries real
// failures (a non-2xx from Termii) via the thrown error.
export async function sendSms(to: string, message: string) {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) {
    console.log(`[termii] SMS not sent (TERMII_API_KEY unset) — would send to ${to}: "${message}"`);
    return { sent: false as const };
  }

  const res = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      to,
      from: process.env.TERMII_SENDER_ID ?? "Robakeye",
      sms: message,
      type: "plain",
      channel: "generic",
    }),
  });
  const data = await res.json();
  if (!res.ok || data.code !== "ok") {
    throw new Error(`Termii SMS failed: ${data.message ?? res.status}`);
  }
  return { sent: true as const };
}
