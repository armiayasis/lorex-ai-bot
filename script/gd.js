const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
  name: 'llamamusic',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['music2', 'ytaudio2'],
  description: "Play YouTube music using new API",
  usages: "ytmusic2 [song title]",
  credits: 'LLAMA (using Arychauhann API)',
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const userQuery = args.join(" ").trim();

  if (!userQuery) {
    return api.sendMessage("❌ Please enter a song title.", threadID, messageID);
  }

  try {
    api.sendMessage(`🔍 Searching for "${userQuery}"...`, threadID, async (err, info) => {
      if (err) return;

      const res = await axios.get(`https://arychauhann.onrender.com/api/youtubeplay?query=${encodeURIComponent(userQuery)}`);
      const data = res.data;

      if (!data || !data.downloadUrl) {
        return api.sendMessage("❌ No download URL found.", threadID, () => api.unsendMessage(info.messageID));
      }

      const filePath = path.join(__dirname, 'cache', `${Date.now()}_ytmusic2.mp3`);
      fs.ensureDirSync(path.dirname(filePath));

      const audio = await axios.get(data.downloadUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(filePath, Buffer.from(audio.data, 'binary'));

      const message = {
        body: `🎶 Now playing: ${data.title || "Unknown Title"}`,
        attachment: fs.createReadStream(filePath)
      };

      api.sendMessage(message, threadID, () => {
        fs.unlinkSync(filePath);
        api.unsendMessage(info.messageID);
      });
    });

  } catch (err) {
    console.error(err);
    api.sendMessage("❌ An error occurred while downloading audio.", threadID, messageID);
  }
};
