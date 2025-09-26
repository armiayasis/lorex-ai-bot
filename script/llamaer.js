const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "lllama",
  version: "4.0.0",
  hasPermission: 0,
  usePrefix: true,
  aliases: ["llama", "edit", "generate", "poli", "remini", "enhance", "rem"],
  description: "AI toolbox: LLaMA chat, Ghibli art, AI art, and image enhancement",
  usages: "llama <generate|edit|poli|remini>",
  credits: "MANUELSON + Rômeo + Pollinations + LorexAi + OpenAI",
  cooldowns: 0
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID, messageReply } = event;
  const subcommand = args[0];
  const input = args.slice(1).join(" ");

  // === 🧠 llama generate
  if (subcommand === "generate") {
    if (!input) return api.sendMessage("❓ Gamitin: llama generate <iyong tanong>", threadID, messageID);
    api.setMessageReaction("🚀", messageID, () => {}, true);

    try {
      const waitMsg = await api.sendMessage("⏳ Kumokonekta sa LLaMA90B...", threadID);
      const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/Llama90b", {
        params: { ask: input, uid: senderID }
      });

      const answer = res.data?.response || "⚠️ Walang sagot mula sa LLaMA.";
      const reply = `🧠 Sagot ni LLaMA:\n━━━━━━━━━━━━━━━━━━━━━\n${answer}\n\n🔧 Powered by LLaMA 3`;

      api.sendMessage(reply, threadID, waitMsg.messageID);
      api.setMessageReaction("✅", messageID, () => {}, true);
    } catch (error) {
      console.error(error);
      api.sendMessage("❌ Error: Hindi makakonekta sa LLaMA90B.", threadID, messageID);
      api.setMessageReaction("❌", messageID, () => {}, true);
    }

    return;
  }

  // === 🎨 llama edit (reply to image)
  if (subcommand === "edit") {
    if (!messageReply || !messageReply.attachments[0]?.type.includes("photo"))
      return api.sendMessage("❌ Reply to an image to use Ghibli effect.", threadID, messageID);

    const imageURL = messageReply.attachments[0].url;
    try {
      const apiUrl = await getApiUrl();
      if (!apiUrl) return api.sendMessage("❌ Ghibli API unavailable.", threadID, messageID);

      api.setMessageReaction("⏳", messageID, () => {}, true);

      const { data } = await axios.get(`${apiUrl}/api/ghibli`, { params: { url: imageURL } });
      if (!data.output) return api.sendMessage("❌ Failed to create Ghibli-style image.", threadID, messageID);

      const filePath = path.join(__dirname, "cache", `ghibli_${Date.now()}.jpg`);
      const imgData = await axios.get(data.output, { responseType: "arraybuffer" });

      fs.ensureDirSync(path.dirname(filePath));
      fs.writeFileSync(filePath, imgData.data);

      api.setMessageReaction("✅", messageID, () => {}, true);
      return api.sendMessage({
        body: "✨ Ghibli-style image:",
        attachment: fs.createReadStream(filePath)
      }, threadID, () => setTimeout(() => fs.unlink(filePath, () => {}), 5000));
    } catch (err) {
      console.error(err);
      return api.sendMessage("❌ Error generating Ghibli image.", threadID, messageID);
    }
  }

  // === 🖼️ llama poli <prompt>
  if (subcommand === "poli") {
    if (!input) return api.sendMessage("❌ Gamitin: llama poli <prompt>", threadID, messageID);

    try {
      const time = new Date().toISOString().replace(/[:.]/g, "-");
      const filePath = path.join(__dirname, "cache", `poli_${time}.png`);

      api.sendMessage(`🎨 Generating image for: ${input}`, threadID, messageID);

      const response = await axios.get(`https://image.pollinations.ai/prompt/${encodeURIComponent(input)}`, {
        responseType: "arraybuffer"
      });

      fs.writeFileSync(filePath, Buffer.from(response.data, 'utf-8'));

      return api.sendMessage({
        body: "✅ Image from Pollinations AI:",
        attachment: fs.createReadStream(filePath)
      }, threadID, () => setTimeout(() => fs.unlink(filePath, () => {}), 5000));
    } catch (error) {
      console.error(error);
      return api.sendMessage("❌ Error generating image with Pollinations AI.", threadID, messageID);
    }
  }

  // === 🧼 llama remini (reply to image)
  if (subcommand === "remini") {
    const isPhotoReply = messageReply?.attachments?.[0]?.type === "photo";
    if (!isPhotoReply) return api.sendMessage("❌ Reply to an image to enhance it.", threadID, messageID);

    const imageUrl = messageReply.attachments[0].url;
    const time = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `remini_${time}.png`;
    const filePath = path.join(__dirname, "cache", fileName);

    fs.ensureDirSync(path.dirname(filePath));

    api.sendMessage("🛠️ Enhancing image...", threadID, async (err, info) => {
      if (err) return;

      try {
        const response = await axios.get(`https://daikyu-api.up.railway.app/api/remini?imageUrl=${encodeURIComponent(imageUrl)}`, {
          responseType: "arraybuffer"
        });

        fs.writeFileSync(filePath, Buffer.from(response.data, 'binary'));

        api.sendMessage({
          attachment: fs.createReadStream(filePath)
        }, threadID, () => {
          fs.unlink(filePath, () => {});
          api.unsendMessage(info.messageID);
        });

      } catch (error) {
        console.error(error);
        api.sendMessage("❌ Failed to enhance image. Try again later.", threadID, messageID);
        api.unsendMessage(info.messageID);
      }
    });

    return;
  }

  // === ❓ Unknown subcommand
  return api.sendMessage(
    `🧠 LLlaMA AI Toolkit Help:\n\n` +
    `📌 lllama generate <text> - chat with LLaMA\n` +
    `🎨 lllama edit (reply) - Ghibli-style art\n` +
    `🖼️ lllama poli <prompt> - AI art from prompt\n` +
    `🧼 lllama remini (reply) - enhance image\n`,
    threadID,
    messageID
  );
};

// Helper to get Ghibli API URL
async function getApiUrl() {
  try {
    const { data } = await axios.get("https://raw.githubusercontent.com/romeoislamrasel/romeobot/refs/heads/main/api.json");
    return data.api;
  } catch (err) {
    console.error("Ghibli API URL fetch failed:", err);
    return null;
  }
}
