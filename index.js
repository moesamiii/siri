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
console.log("✅ PHONE_NUMBER_ID loaded:", PHONE_NUMBER_ID || "❌ Not found");

// ---------------------------------------------
// Detect sheet name
// ---------------------------------------------
try {
  detectSheetName();
} catch (err) {
  console.error("⚠️ detectSheetName() failed:", err.message);
}

// ---------------------------------------------
// Global booking memory
// ---------------------------------------------
global.tempBookings = global.tempBookings || {};
const tempBookings = global.tempBookings;

// ---------------------------------------------
// WhatsApp Webhook Verification
// ---------------------------------------------
app.get("/api/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    return res.status(200).send(challenge);
  }
  return res.status(403).send("Forbidden");
});

// ---------------------------------------------
// WhatsApp Webhook Listener (REPLY ENABLED)
// ---------------------------------------------
app.post("/api/webhook", async (req, res) => {
  res.sendStatus(200); // IMPORTANT: respond immediately

  try {
    console.log("📩 Incoming webhook:", JSON.stringify(req.body, null, 2));

    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // Ignore non-message updates (statuses, etc.)
    if (!value?.messages) return;

    const message = value.messages[0];
    const text = message.text?.body;
    if (!text) return;

    const from = message.from;

    console.log("📩 Message text:", text);
    console.log("📩 From:", from);

    // 👇 SAME STYLE AS YOUR ORIGINAL PROJECT
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
    console.error("❌ Webhook error:", err);
  }
});

// ---------------------------------------------
// Basic routes
// ---------------------------------------------
app.get("/", (req, res) => {
  res.send("✅ WhatsApp Webhook for Clinic is running on Vercel!");
});

app.get("/dashboard", async (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

app.get("/api/bookings", async (req, res) => {
  try {
    const data = await getAllBookings();
    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching bookings:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// ---------------------------------------------
// WhatsApp Send API (UNCHANGED – WORKING)
// ---------------------------------------------
app.post("/sendWhatsApp", async (req, res) => {
  try {
    const { name, phone, service, appointment, image } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "Missing name or phone number" });
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

    if (image && image.startsWith("http")) {
      await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "image",
          image: { link: image, caption: messageText },
        }),
      });
    }

    await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          body: messageText + "\n\n📞 للحجز أو الاستفسار، تواصل معنا الآن!",
        },
      }),
    });

    res.json({ success: true });
  } catch (error) {
    console.error("🚨 Error sending WhatsApp message:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------
// Run Server
// ---------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
