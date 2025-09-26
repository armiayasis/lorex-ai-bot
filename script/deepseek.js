const axios = require("axios");

module.exports.config = {
  name: "deepseek",
  version: "1.0.0",
  hasPermission: 0,
  usePrefix: true,
  aliases: ["dseek", "ds"],
  description: "Chat with DeepSeek v3 AI",
  usages: "deepseek <your question>",
  credits: "You + Daikyu API",
  cooldowns: 0
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const question = args.join(" ");

  if (!question) {
    return api.sendMessage("❓ Gamitin: deepseek <iyong tanong>", threadID, messageID);
  }

  api.setMessageReaction("🤖", messageID, () => {}, true);

  try {
    const res = await axios.get("https://daikyu-api.up.railway.app/api/deepseekv3", {
      params: {
        ask: question,
        uid: senderID
      },
      timeout: 15000
    });

    const reply = res.data?.response || "⚠️ Walang sagot mula sa DeepSeek.";
    return api.sendMessage(`🤖 DeepSeek says:\n\n${reply}`, threadID, messageID);
  } catch (err) {
    console.error("❌ DeepSeek Error:", err.message || err);
    return api.sendMessage("❌ Error: Hindi makakonekta sa DeepSeek API.", threadID, messageID);
  }
};
