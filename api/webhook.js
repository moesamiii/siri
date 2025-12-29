// api/webhook.js - FIXED VERSION (using axios instead of fetch)
// This works on all Node.js versions

export default async function handler(req, res) {
  console.log(
    `🔔 ${req.method} request received at ${new Date().toISOString()}`
  );

  // ===============================
  // 1️⃣ WEBHOOK VERIFICATION (GET)
  // ===============================
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("🔐 Verification attempt:", { mode, token, challenge });

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      console.log("✅ Webhook verified successfully");
      return res.status(200).send(challenge);
    }

    console.log("❌ Verification failed - token mismatch");
    return res.status(403).send("Forbidden");
  }

  // ===============================
  // 2️⃣ INCOMING MESSAGES (POST)
  // ===============================
  if (req.method === "POST") {
    console.log("📦 Webhook payload:", JSON.stringify(req.body, null, 2));

    try {
      // Extract message data
      const entry = req.body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      // Handle status updates (delivered, read, etc.)
      if (value?.statuses) {
        console.log("📊 Status update received:", value.statuses);
        return res.status(200).json({ received: true });
      }

      // No message to process
      if (!message) {
        console.log("⚠️ No message in webhook payload");
        return res.status(200).json({ received: true });
      }

      // Extract message details
      const from = message.from;
      const messageId = message.id;
      const timestamp = message.timestamp;
      const messageType = message.type;

      let messageText = "";

      // Handle different message types
      switch (messageType) {
        case "text":
          messageText = message.text?.body || "";
          break;
        case "image":
          console.log("🖼️ Image received:", message.image);
          messageText = "[Image]";
          break;
        case "audio":
          console.log("🎵 Audio received:", message.audio);
          messageText = "[Audio]";
          break;
        case "document":
          console.log("📄 Document received:", message.document);
          messageText = "[Document]";
          break;
        case "location":
          console.log("📍 Location received:", message.location);
          messageText = "[Location]";
          break;
        default:
          messageText = `[${messageType}]`;
      }

      console.log(
        `📨 Message from ${from}: "${messageText}" (Type: ${messageType})`
      );

      // ===============================
      // 3️⃣ GENERATE REPLY
      // ===============================
      let replyText = "";

      // Simple greeting detection
      const lowerText = messageText.toLowerCase();
      if (/^(hi|hello|hey|مرحبا|السلام عليكم)/.test(lowerText)) {
        replyText =
          "👋 Hello! Welcome to our service. How can I help you today?";
      }
      // Location request
      else if (/location|address|موقع|عنوان/.test(lowerText)) {
        replyText =
          "📍 Our location: Amman, Jordan\n\nGoogle Maps: [Add your link here]";
      }
      // Booking request
      else if (/book|appointment|حجز|موعد/.test(lowerText)) {
        replyText =
          "📅 To book an appointment, please call: +962 X XXX XXXX\n\nOr visit our website: [Add your link]";
      }
      // Offers request
      else if (/offer|deal|عرض|خصم/.test(lowerText)) {
        replyText =
          "🎉 Current Offers:\n\n1. Special Discount - 20% OFF\n2. Buy 1 Get 1 Free\n\nValid until [date]";
      }
      // Doctors/Services
      else if (/doctor|specialist|طبيب|دكتور/.test(lowerText)) {
        replyText =
          "👨‍⚕️ Our Specialists:\n\n1. Dr. Ahmad - Cardiology\n2. Dr. Sara - Pediatrics\n3. Dr. Omar - General Practice\n\nWould you like to book an appointment?";
      }
      // Default response
      else {
        replyText = `✅ Message received: "${messageText}"\n\nHow can I assist you?\n\n• Say "location" for our address\n• Say "book" to schedule an appointment\n• Say "offers" to see current deals\n• Say "doctors" to see our specialists`;
      }

      // ===============================
      // 4️⃣ SEND REPLY TO WHATSAPP
      // ===============================
      console.log(`📤 Sending reply to ${from}: "${replyText}"`);

      const whatsappApiUrl = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

      // Using https module instead of fetch (works on all Node versions)
      const https = await import("https");

      const postData = JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: from,
        type: "text",
        text: {
          preview_url: true,
          body: replyText,
        },
      });

      const options = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      // Send message using https
      await new Promise((resolve, reject) => {
        const req = https.request(whatsappApiUrl, options, (response) => {
          let data = "";

          response.on("data", (chunk) => {
            data += chunk;
          });

          response.on("end", () => {
            try {
              const result = JSON.parse(data);
              if (response.statusCode === 200) {
                console.log("✅ Reply sent successfully:", result);
              } else {
                console.error("❌ Failed to send reply:", result);
              }
              resolve(result);
            } catch (e) {
              console.error("❌ Error parsing response:", e);
              resolve();
            }
          });
        });

        req.on("error", (error) => {
          console.error("❌ Request error:", error);
          reject(error);
        });

        req.write(postData);
        req.end();
      });

      // Mark message as read
      const readData = JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      });

      await new Promise((resolve) => {
        const req = https.request(
          whatsappApiUrl,
          {
            ...options,
            headers: {
              ...options.headers,
              "Content-Length": Buffer.byteLength(readData),
            },
          },
          () => {
            console.log("✅ Message marked as read");
            resolve();
          }
        );

        req.on("error", (error) => {
          console.error("❌ Error marking as read:", error);
          resolve();
        });

        req.write(readData);
        req.end();
      });

      // Always return 200 to acknowledge receipt
      return res.status(200).json({
        received: true,
        processed: true,
        messageId: messageId,
      });
    } catch (error) {
      console.error("❌ Error processing webhook:", error);
      console.error("Error stack:", error.stack);

      // Still return 200 to prevent Meta from retrying
      return res.status(200).json({
        received: true,
        error: error.message,
      });
    }
  }

  // ===============================
  // 5️⃣ UNSUPPORTED METHOD
  // ===============================
  console.log(`⚠️ Unsupported method: ${req.method}`);
  return res.status(405).json({ error: "Method not allowed" });
}
