const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

const USAGE_FILE = path.join(__dirname, "cache", "ai_usage.json");
const USAGE_LIMIT = 9000;

// Make sure usage file exists
fs.ensureFileSync(USAGE_FILE);
if (!fs.existsSync(USAGE_FILE)) {
  fs.writeJsonSync(USAGE_FILE, { count: 0 });
}

module.exports.config = {
  name: "ai",
  version: "1.1.0",
  hasPermission: 0,
  usePrefix: true,
  aliases: ["lorex", "ai", "ask"],
  description: "Simple AI chat with Lorex + usage limit + timestamp",
  usages: "ai <iyong tanong>\nai reset",
  credits: "LlamaAI + DaikyuAPI + GPT4",
  cooldowns: 0
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const input = args.join(" ").trim().toLowerCase();

  // === Handle "ai reset" command
  if (input === "reset") {
    fs.writeJsonSync(USAGE_FILE, { count: 0 });
    return api.sendMessage("🔄 Usage counter has been reset to 0/9000.", threadID, messageID);
  }

  // === Check usage count
  let usageData = fs.readJsonSync(USAGE_FILE);
  let currentCount = usageData.count || 0;

  if (currentCount >= USAGE_LIMIT) {
    return api.sendMessage("⚠️ Usage limit reached (9000/9000). Please reset using `ai reset`.", threadID, messageID);
  }

  if (!input) {
    return api.sendMessage(
      "❌ Kulang ng input.\nGamitin: ai <iyong tanong>\nHalimbawa: ai Anong masasabi mo sa teknolohiya?",
      threadID,
      messageID
    );
  }

  const waitMsg = await api.sendMessage("generating...", threadID);

  try {
    const url = `https://daikyu-api.up.railway.app/api/lorex-ai-personal`;
    const response = await axios.get(url, {
      params: {
        ask: input,
        uid: senderID
      }
    });

    const data = response.data;
    const replyText = data.response || data.reply || "⚠️ Walang sagot si Lorex.";

    // Get current time in Asia/Manila timezone
    const timestamp = moment().tz("Asia/Manila").format("YYYY-MM-DD hh:mm A");

    // Update usage count
    currentCount++;
    fs.writeJsonSync(USAGE_FILE, { count: currentCount });

    api.sendMessage(
      `🤖 Lorex:\n${replyText}\n\n🕒 ${timestamp} | 📊 Usage: ${currentCount}/${USAGE_LIMIT}`,
      threadID,
      waitMsg.messageID
    );
  } catch (err) {
    console.error("Lorex API error:", err);
    api.sendMessage("❌ Error: Hindi makakonekta kay Lorex AI.", threadID, waitMsg.messageID);
  }
};
