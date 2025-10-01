const axios = require("axios");

module.exports.config = {
  name: "opera",
  version: "1.0",
  hasPermission: 0,
  usePrefix: false,
  aliases: [],
  description: "Ask Aria any question using external AI API.",
  usages: "opera <question>",
  cooldowns: 0,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const question = args.join(" ").trim();

  if (!question) {
    return api.sendMessage("❗ Please provide a question.\n\nExample: aria Who made you?", threadID, messageID);
  }

  try {
    const encodedQuestion = encodeURIComponent(question);
    const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/Aria?ask=${encodedQuestion}&userid=${senderID}&stream=`;

    const response = await axios.get(apiUrl);

    if (response.data?.status === "200") {
      const answer = response.data.response;
      const followUps = response.data.extra_content?.follow_up_questions || [];

      let msg = `🤖 Aria says:\n${answer}`;

      if (followUps.length > 0) {
        msg += `\n\n💡 Follow-up questions:\n${followUps.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
      }

      return api.sendMessage(msg, threadID, messageID);
    } else {
      return api.sendMessage("❌ Failed to get a response from Aria.", threadID, messageID);
    }

  } catch (error) {
    console.error("❌ Aria API error:", error.message);
    return api.sendMessage("❌ Error contacting Aria API.", threadID, messageID);
  }
};
