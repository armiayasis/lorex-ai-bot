const axios = require('axios');

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
  "🦙 𝗟𝗟𝗔𝗠𝗔 𝟳𝟬𝗕 𝗥𝗘𝗦𝗣𝗢𝗡𝗦𝗘"
];

module.exports.config = {
  name: 'llama',
  version: '1.1.0',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['llama70b', 'llm'],
  description: "Ask the LLaMA 70B model, with optional image input",
  usages: "llama [prompt] (with optional image)",
  credits: 'SwordSlush + LorexAi',
  cooldowns: 0
};

async function sendTemp(api, threadID, message) {
  return new Promise((resolve, reject) => {
    api.sendMessage(message, threadID, (err, info) => {
      if (err) return reject(err);
      resolve(info);
    });
  });
}

module.exports.run = async function({ api, event, args }) {
  const input = args.join(' ');
  const uid = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;

  const isPhotoReply = event.type === "message_reply"
    && Array.isArray(event.messageReply?.attachments)
    && event.messageReply.attachments.some(att => att.type === "photo");

  // 🖼️ Image + Prompt Mode
  if (isPhotoReply) {
    const photoUrl = event.messageReply.attachments?.[0]?.url;
    if (!photoUrl) return api.sendMessage("❌ Walang nakuhang image URL.", threadID, messageID);
    if (!input) return api.sendMessage("📸 Paki-lagay ng prompt kasama ng image.", threadID, messageID);

    const tempMsg = await sendTemp(api, threadID, "🔍 Analyzing image with LLaMA 70B...");

    try {
      const { data } = await axios.get('https://betadash-api-swordslush-production.up.railway.app/Llama70b', {
        params: {
          ask: input,
          imgUrl: photoUrl,
          uid: uid
        }
      });

      if (!data || !data.response) {
        return api.editMessage("❌ Walang sagot na nakuha mula sa image analysis.", tempMsg.messageID, threadID);
      }

      const formatted = data.response
        .replace(/\*\*(.*?)\*\*/g, (_, t) => convertToBold(t))
        .replace(/##(.*?)##/g, (_, t) => convertToBold(t))
        .replace(/###\s*/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const opener = responseOpeners[Math.floor(Math.random() * responseOpeners.length)];
      return api.editMessage(`${opener}\n\n${formatted}`, tempMsg.messageID, threadID);

    } catch (err) {
      console.error("Image analysis error:", err);
      return api.editMessage("❌ Error habang ini-analyze ang image.", tempMsg.messageID, threadID);
    }
  }

  // 📝 Text-Only Prompt Mode
  if (!input) {
    return api.sendMessage("❌ Paki-type ang tanong mo.\n\nExample: llama ano ang AI?", threadID, messageID);
  }

  const tempMsg = await sendTemp(api, threadID, "⏳ Querying LLaMA 70B...");

  try {
    const { data } = await axios.get('https://betadash-api-swordslush-production.up.railway.app/Llama70b', {
      params: {
        ask: input,
        uid: uid
      }
    });

    if (!data || !data.response) {
      return api.editMessage("❌ Walang sagot na nakuha. Subukan muli.", tempMsg.messageID, threadID);
    }

    const formatted = data.response
      .replace(/\*\*(.*?)\*\*/g, (_, t) => convertToBold(t))
      .replace(/##(.*?)##/g, (_, t) => convertToBold(t))
      .replace(/###\s*/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const opener = responseOpeners[Math.floor(Math.random() * responseOpeners.length)];
    return api.editMessage(`${opener}\n\n${formatted}`, tempMsg.messageID, threadID);

  } catch (err) {
    console.error("LLaMA API Error:", err);
    return api.editMessage("⚠️ May nangyaring error habang kumukuha ng sagot.", tempMsg.messageID, threadID);
  }
};
