const axios = require('axios');

module.exports.config = {
  name: 'yts',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['ytsearch', 'youtube'],
  description: "Search YouTube videos using Aryan Chauhan's YouTube Search API",
  usages: "yts [search query]",
  credits: 'Aryan Chauhan',
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const query = args.join(" ").trim();

  if (!query) {
    return api.sendMessage("❌ Please provide a search query.\nExample: yts Uhaw", threadID, messageID);
  }

  try {
    const res = await axios.get(`https://arychauhann.onrender.com/api/youtubesearch?q=${encodeURIComponent(query)}&count=8`);
    const data = res.data;

    if (!data.status || !data.result || data.result.length === 0) {
      return api.sendMessage("❌ No results found for your query.", threadID, messageID);
    }

    // Build message with results
    let message = `🔍 YouTube Search results for: "${query}"\n\n`;
    data.result.forEach((video, index) => {
      message += `${index + 1}. ${video.title}\n`;
      message += `▶️ Duration: ${video.timestamp} | Views: ${video.views.toLocaleString()} | Published: ${video.published}\n`;
      message += `👤 Author: ${video.author}\n`;
      message += `🔗 Link: ${video.url}\n\n`;
    });

    api.sendMessage(message.trim(), threadID, messageID);

  } catch (error) {
    console.error(error);
    api.sendMessage("❌ Failed to fetch YouTube search results. Try again later.", threadID, messageID);
  }
};
