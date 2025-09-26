const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "llamaaa",
  version: "2.0.0",
  hasPermission: 0,
  usePrefix: true,
  aliases: ["llama", "llamaa", "edit", "generate"],
  description: "Chat with LLaMA or edit image to Ghibli style.",
  usages: "llama generate <prompt> | llama edit (reply to image)",
  credits: "MANUELSON + Rômeo + OpenAI",
  cooldowns: 0
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  const subcommand = args[0];
  const input = args.slice(1).join(" ");

  // ----- 🧠 Text Generation: llama generate <message>
  if (subcommand === "generate") {
    if (!input) {
      return api.sendMessage(
        "❓ 𝗣𝗮𝗸𝗶𝗹𝗮𝗴𝗮𝘆 𝗮𝗻𝗴 𝗶𝘆𝗼𝗻𝗴 𝘁𝗮𝗻𝗼𝗻𝗴 𝗼 𝗺𝗲𝘀𝘀𝗮𝗵𝗲.\n\n📌 𝗚𝗮𝗺𝗶𝘁: llama generate <prompt>",
        threadID,
        messageID
      );
    }

    api.setMessageReaction("🚀", messageID, () => {}, true);

    try {
      const waitMsg = await api.sendMessage("⏳ 𝗞𝘂𝗺𝗼𝗸𝗼𝗻𝗲𝗸𝘁𝗮 𝘀𝗮 𝗟𝗹𝗮𝗺𝗮𝟵𝟬𝗕... 🤖", threadID);

      const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/Llama90b", {
        params: { ask: input, uid: senderID }
      });

      const answer = res.data?.response || "⚠️ Walang sagot mula sa LLaMA.";

      const finalReply =
        `🧠 𝗟𝗹𝗮𝗺𝗮𝟵𝟬𝗕 𝘀𝗮𝗴𝗼𝘁:\n━━━━━━━━━━━━━━━━━━━━━\n${answer}\n\n` +
        `🔧 CREATED BY MANUELSON | POWERED BY LLAMA 3 + META AI`;

      api.sendMessage(finalReply, threadID, waitMsg.messageID);
      api.setMessageReaction("✅", messageID, () => {}, true);
    } catch (error) {
      console.error(error);
      api.sendMessage("❌ Error while fetching response from LLaMA90B.", threadID, messageID);
      api.setMessageReaction("❌", messageID, () => {}, true);
    }

    return;
  }

  // ----- 🎨 Image Editing: llama edit (image reply)
  if (subcommand === "edit") {
    const reply = event.messageReply;
    if (!reply || !reply.attachments || reply.attachments[0].type !== "photo") {
      return api.sendMessage("❌ Please reply to an image to transform it.", threadID, messageID);
    }

    const imageURL = reply.attachments[0].url;

    try {
      const apiUrl = await getApiUrl();
      if (!apiUrl) {
        return api.sendMessage("❌ API is not available right now.", threadID, messageID);
      }

      api.setMessageReaction("⏳", messageID, () => {}, true);

      const { data } = await axios.get(`${apiUrl}/api/ghibli`, {
        params: { url: imageURL }
      });

      if (!data.output) {
        return api.sendMessage("❌ Failed to generate Ghibli-style image.", threadID, messageID);
      }

      const filePath = path.join(__dirname, "cache", `ghibli_${Date.now()}.jpg`);
      const imgRes = await axios.get(data.output, { responseType: "arraybuffer" });

      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, imgRes.data);

      api.setMessageReaction("✅", messageID, () => {}, true);

      return api.sendMessage({
        body: "✨ Here is your Ghibli-style image:",
        attachment: fs.createReadStream(filePath)
      }, threadID, () => {
        setTimeout(() => {
          fs.unlink(filePath, err => {
            if (err) console.error("Error deleting cached file:", err);
          });
        }, 5000);
      });

    } catch (err) {
      console.error(err);
      return api.sendMessage("❌ Error while generating Ghibli-style image.", threadID, messageID);
    }
  }

  // ----- ❌ Unknown or missing subcommand
  return api.sendMessage(
    "❓ Invalid usage.\n\n🔹 `llama generate <message>` – to chat with LLaMA\n🔹 `llama edit` (reply to image) – to get Ghibli-style art",
    threadID,
    messageID
  );
};

// 🔧 Helper function to fetch dynamic API URL for Ghibli
async function getApiUrl() {
  try {
    const { data } = await axios.get("https://raw.githubusercontent.com/romeoislamrasel/romeobot/refs/heads/main/api.json");
    return data.api;
  } catch (err) {
    console.error("Error fetching API URL:", err);
    return null;
  }
}
