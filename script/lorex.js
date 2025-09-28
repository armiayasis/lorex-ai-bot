const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

const USAGE_FILE = path.join(__dirname, "..", "cache", "ai_usage.json");
const USAGE_LIMIT = 9000;

module.exports.config = {
  name: "ai",
  version: "1.1.1",
  hasPermission: 0,
  usePrefix: true,
  aliases: ["lorex", "chat", "ask"],
  description: "Simple AI chat with Lorex + usage counter + timestamp",
  usages: "ai <iyong tanong>\nai reset",
  credits: "LlamaAI + DaikyuAPI + GPT4",
  cooldowns: 0
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const input = args.join(" ").trim();

  // Make sure cache dir exists
  const cacheDir = path.join(__dirname, "..", "cache");
  fs.ensureDirSync(cacheDir);

  // If file does not exist, initialize with 0
  if (!fs.existsSync(USAGE_FILE)) {
    fs.writeJsonSync(USAGE_FILE, { count: 0 });
  }

  // Load usage data
  let usageData = fs.readJsonSync(USAGE_FILE);
  let count = usageData.count || 0;

  // === Handle RESET command
  if (input.toLowerCase() === "reset") {
    fs.writeJsonSync(USAGE_FILE, { count: 0 });
    return api.sendMessage("🔄 Usage counter has been reset to 0/9000.", threadID, messageID);
  }

  // === If no input
  if (!input) {
    return api.sendMessage(
      "❌ Kulang ng input.\nGamitin: ai <iyong tanong>\nHalimbawa: ai Ano ang AI?",
      threadID,
      messageID
    );
  }

  // === Check usage limit
  if (count >= USAGE_LIMIT) {
    return api.sendMessage("⚠️ Usage limit reached (9000/9000). I-reset gamit: ai reset", threadID, messageID);
  }

  // === Connecting message
  const waitMsg = await api.sendMessage("⏳ Kumokonekta kay Lorex AI...", threadID);

  try {
    // === Call the API
    const res = await axios.get(`https://daikyu-api.up.railway.app/api/lorex-ai-personal`, {
      params: {
        ask: input,
        uid: senderID
      }
    });

    const replyText = res.data?.response || res.data?.reply || "⚠️ Walang sagot si Lorex.";

    // === Time (Asia/Manila)
    const timestamp = moment().tz("Asia/Manila").format("YYYY-MM-DD hh:mm A");

    // === Update and save usage
    count++;
    fs.writeJsonSync(USAGE_FILE, { count });

    // === Send final message
    api.sendMessage(
      `🤖 Lorex:\n${replyText}\n\n🕒 ${timestamp}\n📊 Usage: ${count}/${USAGE_LIMIT}`,
      threadID,
      waitMsg.messageID
    );
  } catch (err) {
    console.error("❌ Lorex API error:", err.message);
    api.sendMessage("❌ Error: Hindi makakonekta kay Lorex AI.", threadID, waitMsg.messageID);
  }
};
