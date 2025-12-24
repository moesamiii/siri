// api/webhook.js - WhatsApp Webhook for Vercel

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "my_secret";

export default async function handler(req, res) {
  // GET - Webhook Verification
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified!");
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send("Forbidden");
    }
  }

  // POST - Receive Messages
  if (req.method === "POST") {
    try {
      console.log("📩 Incoming webhook:", JSON.stringify(req.body, null, 2));
      return res.status(200).send("OK");
    } catch (err) {
      console.error("❌ Webhook error:", err);
      return res.status(500).send("Error");
    }
  }

  return res.status(405).send("Method not allowed");
}
