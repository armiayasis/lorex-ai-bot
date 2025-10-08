
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
  name: 'opera',
  version: '1.0.5', // updated version
  hasPermission: 0,
  usePrefix: false,
  aliases: ['opera'],
  description: "Chat with Aria AI (via Kaiz API) with personality",
  usages: "aria [your question]",
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const input = args.join(' ').trim();
  const uid = event.senderID;
  const threadID = event.threadID;
  const apikey = "585674da-1b3b-4eed-bb58-13710096c461";

  // Greeting if no question
  if (!input) {
    return api.sendMessage(
      "Hello! 😊 I'm Aria, your friendly AI assistant. You can ask me anything — from fun facts to deep thoughts. What’s on your mind today?",
      threadID,
      event.messageID
    );
  }

  try {
    // Show typing indicator
    api.sendTypingIndicator(threadID);

    // Send "Thinking..." message
    const thinkingMsg = await new Promise((resolve, reject) => {
      api.sendMessage("💭 Hmm... I'm thinking about your question...", threadID, (err, info) => {
        if (err) reject(err);
        else resolve(info);
      });
    });

    // Prepare API request
    const encodedQuery = encodeURIComponent(input);
    const ariaApiUrl = `https://kaiz-apis.gleeze.com/api/aria?ask=${encodedQuery}&uid=${uid}&apikey=${apikey}`;
    
    // Call Kaiz API with 10s timeout
    const { data } = await axios.get(ariaApiUrl, { timeout: 10000 });

    if (!data || !data.response) {
      // Remove thinking message
      await api.unsendMessage(thinkingMsg.messageID).catch(() => {});
      return api.sendMessage(
        "❌ Sorry, no response from Aria AI (Kaiz API). Please try again later.",
        threadID,
        event.messageID
      );
    }

    // Delay for realism
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Delete "Thinking..." message and send final answer
    await api.unsendMessage(thinkingMsg.messageID).catch(() => {});

    const replyMsg =
      `🟢 Aria AI\n\n` +
      `📩 You asked:\n> ${input}\n\n` +
      `🤖 Aria's reply:\n${data.response}\n\n` +
      `⏰ Time: ${getPHTime()}`;

    const sentMsg = await new Promise((resolve, reject) => {
      api.sendMessage(replyMsg, threadID, (err, info) => {
        if (err) reject(err);
        else resolve(info);
      });
    });

    // Auto unsend after 24 hours
    setTimeout(() => {
      api.unsendMessage(sentMsg.messageID).catch(() => {});
    }, 86400000);

  } catch (error) {
    console.error(error);

    return api.sendMessage(
      "❌ Oops! Something went wrong while connecting to Aria API. Please try again later.",
      threadID,
      event.messageID
    );
  }
};
