export default async function handler(req, res) {
  // =========================
  // 1️⃣ WEBHOOK VERIFICATION
  // =========================
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      console.log("✅ Webhook verified");
      return res.status(200).send(challenge);
    }

    console.log("❌ Webhook verification failed");
    return res.status(403).send("Forbidden");
  }

  // =========================
  // 2️⃣ INCOMING MESSAGES
  // =========================
  if (req.method === "POST") {
    try {
      const entry = req.body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      // Always ACK WhatsApp first
      res.sendStatus(200);

      if (!message) return;

      const from = message.from;
      const text = message.text?.body;

      console.log("📩 Incoming message:", text, "from:", from);

      const replyText = "✅ Webhook works! Reply received.";

      await fetch(
        `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: from,
            type: "text",
            text: { body: replyText },
          }),
        }
      );

      console.log("✅ Reply sent successfully");
      return;
    } catch (err) {
      console.error("❌ Webhook error:", err);
      return;
    }
  }

  return res.sendStatus(405);
}
