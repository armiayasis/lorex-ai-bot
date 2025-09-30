const axios = require('axios');

module.exports.config = {
  name: 'tiktoksearch',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['ttsearch','tiktok'],
  description: 'Search TikTok videos',
  usages: 'tiktoksearch <keyword>',
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const threadID = event.threadID;
  const messageID = event.messageID;
  const uid = event.senderID;

  const keyword = args.join(' ');
  if (!keyword) {
    return api.sendMessage('❌ Please provide a search keyword.\nUsage: tiktoksearch <keyword>', threadID, messageID);
  }

  // Send temporary message
  const temp = await new Promise((resolve, reject) => {
    api.sendMessage('🔍 Searching TikTok...', threadID, (err, info) => {
      if (err) return reject(err);
      resolve(info);
    });
  });

  try {
    const resp = await axios.get('https://arychauhann.onrender.com/api/tiktoksearch', {
      params: {
        q: keyword,
        count: 5
      }
    });

    const data = resp.data;
    if (data.code !== 0 || !data.data || !Array.isArray(data.data.videos) || data.data.videos.length === 0) {
      return api.editMessage('⚠️ No videos found.', temp.messageID, threadID);
    }

    // Build message text with results
    let msg = `📹 TikTok Search Results for "${keyword}":\n\n`;
    data.data.videos.forEach((video, i) => {
      msg += `🔢 ${i+1}. ${video.title}\n`;
      msg += `👤 By: ${video.author.nickname}\n`;
      msg += `▶️ ${video.play}\n\n`;
    });

    // Edit the temp message to show results
    return api.editMessage(msg.trim(), temp.messageID, threadID);
  } catch (err) {
    console.error('Error in tiktoksearch command:', err);
    return api.editMessage('❌ Error fetching TikTok videos.', temp.messageID, threadID);
  }
};
