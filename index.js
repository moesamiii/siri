const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

// Dynamic fetch for Vercel
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(bodyParser.json());

// ---------------------------------------------
// Environment Variables
// ---------------------------------------------
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "siri_webhook_2024";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// ---------------------------------------------
console.log("🚀 Server starting...");
console.log("✅ VERIFY_TOKEN:", !!VERIFY_TOKEN);
console.log("✅ WHATSAPP_TOKEN:", !!WHATSAPP_TOKEN);
console.log("✅ PHONE_NUMBER_ID:", PHONE_NUMBER_ID || "❌");

// ---------------------------------------------
// Webhook verification (GET)
// ---------------------------------------------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }

  console.log("❌ Webhook verification failed");
  return res.sendStatus(403);
});

// ---------------------------------------------
// Webhook listener (POST) – AUTO REPLY
// ---------------------------------------------
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // respond immediately

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value?.messages) return;

    const message = value.messages[0];
    const text = message.text?.body;
    if (!text) return;

    const from = message.from;

    console.log("📩 Incoming message:", text, "from", from);

    const reply =
      "مرحباً بك 👋\n" +
      "يسعدنا مساعدتك في عيادة ابتسامة الطبية 🦷\n\n" +
      "هل ترغب بحجز موعد أم الاستفسار عن خدماتنا؟";

    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: from,
        type: "text",
        text: { body: reply },
      }),
    });

    const data = await response.json();
    console.log("✅ Reply sent:", data);
  } catch (err) {
    console.error("❌ Webhook reply failed:", err);
  }
});

// ---------------------------------------------
app.get("/", (req, res) => {
  res.send("WhatsApp webhook running ✅");
});

// ---------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
