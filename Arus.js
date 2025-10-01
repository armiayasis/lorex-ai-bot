const axios = require('axios');

function getPHTime() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const phTime = new Date(utc + 8 * 3600000);
  const h = phTime.getHours(), m = phTime.getMinutes();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hour12}:${m < 10 ? '0' + m : m} ${ampm}`;
}

module.exports.config = {
  name: 'aria',
  version: '1.0.2',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['aria'],
  description: "Chat with Aria AI",
  usages: "aria [your question]",
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const input = args.join(' ').trim();
  const uid = event.senderID;
  const threadID = event.threadID;

  if (!input) {
    return api.sendMessage(
      "Hello! I'm Aria, your friendly AI assistant. How can I help you today? Let's explore some interesting topics together!", 
      threadID, 
      event.messageID
    );
  }

  try {
    const encodedQuery = encodeURIComponent(input);
    const ariaApiUrl = `https://daikyu-api.up.railway.app/api/aria-ai?query=${encodedQuery}&uid=${uid}`;
    const { data } = await axios.get(ariaApiUrl);

    if (!data || !data.response) {
      return api.sendMessage(
        "❌ Sorry, no response from Aria AI. Please try again later.", 
        threadID, 
        event.messageID
      );
    }

    const replyMsg = 
      `🟢 Aria AI\n\n` +
      `You asked:\n> ${input}\n\n` +
      `Aria's reply:\n${data.response}\n\n` +
      `⏰ Time: ${getPHTime()}`;

    const sentMsg = await new Promise((resolve, reject) => {
      api.sendMessage(replyMsg, threadID, (err, info) => {
        if (err) reject(err);
        else resolve(info);
      });
    });

    // Auto unsend message after 24 hours (86,400,000 ms)
    setTimeout(() => {
      api.unsendMessage(sentMsg.messageID).catch(() => {});
    }, 86400000);

  } catch (error) {
    console.error(error);
    return api.sendMessage(
      "❌ An error occurred while contacting Aria AI. Please try again later.", 
      threadID, 
      event.messageID
    );
  }
};
