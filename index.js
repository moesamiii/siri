// index.js
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const { detectSheetName, getAllBookings } = require("./helpers");

const app = express();
app.use(bodyParser.json());

// ---------------------------------------------
// Environment Variables
// ---------------------------------------------
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "siri_webhook_2024";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// ---------------------------------------------
// Startup logs
// ---------------------------------------------
console.log("🚀 Server starting...");
console.log("✅ VERIFY_TOKEN loaded:", !!VERIFY_TOKEN);
console.log("✅ WHATSAPP_TOKEN loaded:", !!WHATSAPP_TOKEN);
console.log("✅ PHONE_NUMBER_ID:", PHONE_NUMBER_ID || "❌ Not found");

// ---------------------------------------------
// Detect Google Sheet (optional)
// ---------------------------------------------
try {
  detectSheetName();
} catch (err) {
  console.error("⚠️ detectSheetName failed:", err.message);
}

// ---------------------------------------------
// Webhook Verification (Meta requirement)
// ---------------------------------------------
app.get("/api/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// ---------------------------------------------
// WhatsApp Webhook Listener (STABLE & SAFE)
// ---------------------------------------------
app.post("/api/webhook", async (req, res) => {
  // Always acknowledge immediately
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) return;

    // 🚫 Ignore messages sent by your own business number (echo fix)
    if (message.from === value.metadata.phone_number_id) return;

    // 🚫 Only text messages
    const text = message.text?.body;
    if (!text) return;

    const from = message.from;

    console.log("📩 Incoming WhatsApp message:", text);

    const reply =
      `👋 مرحبًا!\n` + `وصلت رسالتك: "${text}"\n` + `سنتواصل معك قريبًا.`;

    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

    await fetch(url, {
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

    console.log("✅ Reply sent to:", from);
  } catch (err) {
    console.error("❌ Webhook processing error:", err);
  }
});

// ---------------------------------------------
// Health check
// ---------------------------------------------
app.get("/", (req, res) => {
  res.send("✅ WhatsApp Webhook for Clinic is running on Vercel!");
});

// ---------------------------------------------
// Dashboard
// ---------------------------------------------
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

// ---------------------------------------------
// Bookings API
// ---------------------------------------------
app.get("/api/bookings", async (req, res) => {
  try {
    const data = await getAllBookings();
    res.json(data);
  } catch (err) {
    console.error("❌ Fetch bookings error:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// ---------------------------------------------
// WhatsApp Send API (TEXT + IMAGE)
// ---------------------------------------------
app.post("/sendWhatsApp", async (req, res) => {
  try {
    const { name, phone, service, appointment, image } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "Missing name or phone" });
    }

    const messageText =
      `👋 مرحبًا ${name}!\n` +
      `تم حجز موعدك لخدمة ${service} في Smile Clinic 🦷\n` +
      `📅 ${appointment}`;

    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    };

    // Image message (optional)
    if (image && image.startsWith("http")) {
      await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "image",
          image: {
            link: image,
            caption: messageText,
          },
        }),
      });
    }

    // Text message
    await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          body: messageText + "\n\n📞 تواصل معنا لأي استفسار",
        },
      }),
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ sendWhatsApp error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------
// Start Server
// ---------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
