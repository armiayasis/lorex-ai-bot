const axios = require("axios");
const fs = require("fs");
const path = require("path");

const activeThreads = new Set();

module.exports = {
  config: {
    name: "music",
    version: "1.6",
    author: "Nikox",
    countDown: 0,
    role: 0,
    shortDescription: "Play YouTube music",
    longDescription: "Download and play YouTube music using Aryan API",
    category: "media",
    guide: "{p}music [title]"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    if (!args.length) {
      return api.sendMessage("❗ Usage: music [title]", threadID, messageID);
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
      // Set reaction to "loading"
      await new Promise((resolve) =>
        api.setMessageReaction("⏳", messageID, () => resolve(), true)
      );

      // Call Aryan API to get audio URL
      const { data } = await axios.get(apiUrl);

      if (!data || !data.status || !data.data || !data.data.audio) {
        activeThreads.delete(threadID);
        return api.sendMessage("❌ Failed to get music data.", threadID, messageID);
      }

      const audioUrl = data.data.audio;
      const filePath = path.join(__dirname, `cache-${Date.now()}.mp3`);

      // Download MP3 stream and save to file
      const response = await axios({
        url: audioUrl,
        method: "GET",
        responseType: "stream"
      });

      // Wrap stream piping in Promise to wait until finished
      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // Send MP3 file to thread
      await new Promise((resolve) =>
        api.sendMessage(
          { attachment: fs.createReadStream(filePath) },
          threadID,
          () => resolve()
        )
      );

      // Clean up file and update reaction
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("⚠️ Failed to delete cache file:", err.message);
      }

      await new Promise((resolve) =>
        api.setMessageReaction("✅", messageID, () => resolve(), true)
      );
    } catch (err) {
      console.error("❌ Error:", err.message);

      api.sendMessage("❌ Error: " + err.message, threadID, messageID);
      api.setMessageReaction("❌", messageID, () => {}, true);
    } finally {
      activeThreads.delete(threadID);
    }
  }
};
