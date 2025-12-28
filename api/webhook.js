export default async function handler(req, res) {
  // ---------------------------
  // 1️⃣ Webhook verification
  // ---------------------------
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  }

  // ---------------------------
  // 2️⃣ Incoming messages
  // ---------------------------
  if (req.method === "POST") {
    res.status(200).json({ status: "received" });

    try {
      const entry = req.body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (!message) return;

      const from = message.from;
      const text = message.text?.body;

      console.log("📩 Incoming:", text, "from:", from);

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

      console.log("✅ Reply sent");
    } catch (err) {
      console.error("❌ Webhook error:", err);
    }
  }
}
