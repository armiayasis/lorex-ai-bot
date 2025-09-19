const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "image",
  version: "1.1",
  hasPermission: 0,
  usePrefix: false,
  aliases: [],
  description: "Generate or edit an image using Gemini-Edit AI.",
  usages: "image <prompt> (reply to image optional)",
  credits: "Romeo",
  cooldowns: 0
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, messageReply } = event;
  const prompt = args.join(" ");
  const apiurl = "https://gemini-edit-omega.vercel.app/edit";

  if (!prompt) {
    return api.sendMessage("❌ Please provide a prompt to generate or edit an image.", threadID, messageID);
  }

  api.setMessageReaction("⏳", messageID, () => {}, true);

  try {
    const params = { prompt };

    if (
      messageReply &&
      Array.isArray(messageReply.attachments) &&
      messageReply.attachments[0]?.type === "photo"
    ) {
      params.imgurl = messageReply.attachments[0].url;
    }

    const res = await axios.get(apiurl, { params });

    if (!res.data || !res.data.images || !res.data.images[0]) {
      api.setMessageReaction("❌", messageID, () => {}, true);
      return api.sendMessage("❌ Failed to generate or edit image.", threadID, messageID);
    }

    const base64Image = res.data.images[0].replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Image, "base64");

    const cacheDir = path.join(__dirname, "cache");
    fs.ensureDirSync(cacheDir);

    const imagePath = path.join(cacheDir, `${Date.now()}_gemini.png`);
    fs.writeFileSync(imagePath, imageBuffer);

    api.setMessageReaction("✅", messageID, () => {}, true);

    api.sendMessage({
      attachment: fs.createReadStream(imagePath)
    }, threadID, () => {
      fs.unlinkSync(imagePath);
    }, messageID);

  } catch (error) {
    console.error("❌ Gemini-Edit Error:", error.response?.data || error.message);
    api.setMessageReaction("❌", messageID, () => {}, true);
    return api.sendMessage("❌ Error generating/editing image. Try again later.", threadID, messageID);
  }
};
