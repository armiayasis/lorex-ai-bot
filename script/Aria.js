const axios = require('axios');

// Convert normal text to bold Unicode
function convertToBold(text) {
  const boldMap = {
    'a': '𝗮','b': '𝗯','c': '𝗰','d': '𝗱','e': '𝗲','f': '𝗳','g': '𝗴','h': '𝗵','i': '𝗶','j': '𝗷',
    'k': '𝗸','l': '𝗹','m': '𝗺','n': '𝗻','o': '𝗼','p': '𝗽','q': '𝗾','r': '𝗿','s': '𝘀','t': '𝘁',
    'u': '𝘂','v': '𝘃','w': '𝘄','x': '𝘅','y': '𝘆','z': '𝘇',
    'A': '𝗔','B': '𝗕','C': '𝗖','D': '𝗗','E': '𝗘','F': '𝗙','G': '𝗚','H': '𝗛','I': '𝗜','J': '𝗝',
    'K': '𝗞','L': '𝗟','M': '𝗠','N': '𝗡','O': '𝗢','P': '𝗣','Q': '𝗤','R': '𝗥','S': '𝗦','T': '𝗧',
    'U': '𝗨','V': '𝗩','W': '𝗪','X': '𝗫','Y': '𝗬','Z': '𝗭',
  };
  return text.split('').map(char => boldMap[char] || char).join('');
}

const responseOpeners = [
  "🤖 𝗔𝗿𝗶𝗮 𝗔𝗜",
  "✨ 𝗔𝗿𝗶𝗮 𝘀𝗮𝘆𝘀",
  "💡 𝗜𝗻𝘁𝗲𝗹𝗹𝗶𝗴𝗲𝗻𝗰𝗲 𝗳𝗿𝗼𝗺 𝗔𝗿𝗶𝗮"
];

module.exports.config = {
  name: 'mesaria',
  version: '1.1.1',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['aria', 'ariaai'],
  description: "Aria AI via Kaiz API",
  usages: "ai2 [prompt]",
  credits: 'LorexAi',
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const prompt = args.join(' ');
  const uid = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;

  if (!prompt) {
    return api.sendMessage(
      "🌟Greetings! I am 𝘼𝙧𝙞𝙖 𝘼𝙞, your gateway to Pro intelligence. I am here to assist you.",
      threadID,
      messageID
    );
  }

  const loadingMsg = await new Promise(resolve => {
    api.sendMessage("🔄 Searching...", threadID, (err, info) => resolve(info));
  });

  try {
    // ✅ Gamit ang bagong API URL na may `prompt`, `uid`, at `apikey`
    const url = `https://kaiz-apis.gleeze.com/api/aria?ask=${encodeURIComponent(prompt)}&uid=${uid}&apikey=5ce15f34-7e46-4e7e-8ee7-5e934afe563b`;

    const { data } = await axios.get(url);

    const raw = data?.response;
    if (!raw || raw.trim() === '') {
      return api.editMessage("⚠️ No response received from Aria API.", loadingMsg.messageID, threadID);
    }

    // ✅ Format text with bold and cleanup
    const formatted = raw
      .replace(/\*\*(.*?)\*\*/g, (_, t) => convertToBold(t))
      .replace(/##(.*?)##/g, (_, t) => convertToBold(t))
      .replace(/###\s*/g, '')
      .replace(/\n{3,}/g, '\n\n');

    // ✅ Random opener (optional)
    const opener = responseOpeners[Math.floor(Math.random() * responseOpeners.length)];

    return api.editMessage(`${opener}\n\n${formatted}`, loadingMsg.messageID, threadID);

  } catch (error) {
    console.error("❌ Aria API Error:", error.message);
    return api.editMessage("❌ Error while contacting Aria API.", loadingMsg.messageID, threadID);
  }
};
