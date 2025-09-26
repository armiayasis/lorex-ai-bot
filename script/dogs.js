const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
  name: 'gen',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  aliases: [],
  description: "Generate an image using Aryan Chauhan's web-extracter API",
  usages: "gen [prompt]",
  credits: 'Aryan Chauhan',
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const prompt = args.join(" ").trim();

  if (!prompt) {
    return api.sendMessage("❌ Please provide a prompt.\nExample: gen dog", threadID, messageID);
  }

  try {
    const time = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${time}_gen.png`;
    const cacheDir = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir);
    }
    const filePath = path.join(cacheDir, fileName);

    api.sendMessage(`🔄 Generating image...`, threadID, async (err, info) => {
      if (err) return;

      try {
        // Call the API with prompt encoded
        const response = await axios.get(`https://arychauhann.onrender.com/api/gen?prompt=${encodeURIComponent(prompt)}`, {
          responseType: 'arraybuffer',
          timeout: 15000
        });

        // Save the image locally
        fs.writeFileSync(filePath, Buffer.from(response.data, 'binary'));

        // Send the image
        api.sendMessage({
          attachment: fs.createReadStream(filePath)
        }, threadID, () => {
          // Delete temp file after sending
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.warn("Failed to delete temp file:", e);
          }
          // Remove "Generating image" message
          api.unsendMessage(info.messageID);
        });

      } catch (error) {
        console.error(error);
        api.sendMessage("❌ Failed to generate image. Try again later.", threadID, messageID);
        api.unsendMessage(info.messageID);
      }
    });

  } catch (err) {
    console.error(err);
    api.sendMessage("❌ Unexpected error occurred.", threadID, messageID);
  }
};
