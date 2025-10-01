const axios = require("axios");
const fs = require("fs");
const path = require("path");

const activeThreads = new Set();

module.exports.config = {
  name: "spotify",
  version: "1.6",
  hasPermission: 0,
  usePrefix: false,
  aliases: ["spotify", "sp"],
  description: "Play YouTube music using Aryan API",
  usages: "spotify [song title]",
  credits: "GPT-5",
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  if (!args.length) {
    return api.sendMessage("❗ Usage: spotify [title]", threadID, messageID);
  }

  if (activeThreads.has(threadID)) {
    return api.sendMessage(
      "⚠️ Please wait for the current song to finish processing.",
      threadID,
      messageID
    );
  }

  activeThreads.add(threadID);

  const title = args.join(" ");
  const apiUrl = `https://aryanapi.up.railway.app/api/youtubeplay?query=${encodeURIComponent(title)}`;

  try {
    api.setMessageReaction("⏳", messageID, () => {}, true);

    // Call Aryan API
    const res = await axios.get(apiUrl);
    const data = res.data;

    if (!data || !data.status || !data.data || !data.data.audio) {
      activeThreads.delete(threadID);
      return api.sendMessage("❌ Failed to get music data.", threadID, messageID);
    }

    const audioUrl = data.data.audio;
    const filePath = path.join(__dirname, `cache`, `${Date.now()}_spotify.mp3`);

    // Ensure cache folder exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    const writer = fs.createWriteStream(filePath);

    // Download audio stream
    const audioStream = await axios({
      url: audioUrl,
      method: "GET",
      responseType: "stream"
    });

    audioStream.data.pipe(writer);

    writer.on("finish", () => {
      api.sendMessage(
        { attachment: fs.createReadStream(filePath) },
        threadID,
        () => {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error("⚠️ Failed to delete cache file:", err.message);
          }
          api.setMessageReaction("✅", messageID, () => {}, true);
          activeThreads.delete(threadID);
        }
      );
    });

    writer.on("error", (err) => {
      console.error("❌ File write error:", err);
      api.sendMessage("❌ Failed to save MP3 file.", threadID, messageID);
      activeThreads.delete(threadID);
    });

  } catch (err) {
    console.error("❌ API Error:", err.message);
    api.sendMessage("❌ Error: " + err.message, threadID, messageID);
    api.setMessageReaction("❌", messageID, () => {}, true);
    activeThreads.delete(threadID);
  }
};
