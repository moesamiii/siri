export default async function handler(req, res) {
  // ===============================
  // 1️⃣ WEBHOOK VERIFICATION (META)
  // ===============================
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("🔎 Verify attempt:", mode, token);

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      console.log("✅ Webhook verified");
      return res.status(200).send(challenge);
    }

    console.log("❌ Verification failed");
    return res.status(403).send("Forbidden");
  }

  // ===============================
  // 2️⃣ INCOMING MESSAGES
  // ===============================
  if (req.method === "POST") {
    res.status(200).json({ ok: true }); // respond immediately

    try {
      const entry = req.body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (!message) {
        console.log("ℹ️ No message in payload");
        return;
      }

      const from = message.from;
      const text = message.text?.body;

      console.log("📩 Message received:", text, "from:", from);

      const reply = "✅ Webhook is working perfectly!";

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
            text: { body: reply },
          }),
        }
      );

      console.log("✅ Reply sent");
    } catch (err) {
      console.error("❌ Webhook error:", err);
    }
  }
}
