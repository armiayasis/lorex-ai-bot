const axios = require('axios');

// Optional bold text formatter
function convertToBold(text) {
  const boldMap = {
    'a': '𝗮','b': '𝗯','c': '𝗰','d': '𝗱','e': '𝗲','f': '𝗳','g': '𝗴','h': '𝗵','i': '𝗶','j': '𝗷',
    'k': '𝗸','l': '𝗹','m': '𝗺','n': '𝗻','o': '𝗼','p': '𝗽','q': '𝗾','r': '𝗿','s': '𝘀','t': '𝘁',
    'u': '𝘂','v': '𝘃','w': '𝘄','x': '𝘅','y': '𝘆','z': '𝘇',
    'A': '𝗔','B': '𝗕','C': '𝗖','D': '𝗗','E': '𝗘','F': '𝗙','G': '𝗚','H': '𝗛','I': '𝗜','J': '𝗝',
    'K': '𝗞','L': '𝗟','M': '𝗠','N': '𝗡','O': '𝗢','P': '𝗣','Q': '𝗤','R': '𝗥','S': '𝗦','T': '𝗧',
    'U': '𝗨','V': '𝗩','W': '𝗪','X': '𝗫','Y': '𝗬','Z': '𝗭',
  };
  return text.split('').map(ch => boldMap[ch] || ch).join('');
}

// === CONFIG ===
module.exports.config = {
  name: 'nova',
  version: '1.0.1',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['llama4', 'llama', 'ary', 'aryan'],
  description: "Ask LLama-4 Maverick AI (17B Instruct)",
  usages: "maverick [prompt]",
  credits: "Aryan Chauhan API + customized by user",
  cooldowns: 0,
};

// === RUN FUNCTION ===
module.exports.run = async function({ api, event, args }) {
  const uid = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;

  const input = args.join(' ').trim();
  if (!input) return api.sendMessage("❓ Please enter a prompt.", threadID, messageID);

  // Check if replying to a photo
  const isPhotoReply =
    event.type === "message_reply" &&
    event.messageReply?.attachments?.[0]?.type === "photo";

  // Optional image URL
  const imageUrl = isPhotoReply ? event.messageReply.attachments[0].url : "";

  // Send temporary processing message
  await api.sendMessage("🧠 Thinking with Maverick 17B...", threadID);

  try {
    // API CALL
    const res = await axios.get('https://arychauhann.onrender.com/api/llama-4-maverick-17b-128e-instruct', {
      params: {
        uid: uid,
        prompt: input,
        url: imageUrl
      }
    });

    const data = res.data;

    if (!data.status || !data.reply) {
      return api.sendMessage("⚠️ API returned no reply or an error occurred.", threadID, messageID);
    }

    // Compose message
    const reply =
      `🤖 ${convertToBold("Maverick 17B AI")}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 ${convertToBold("Prompt")}: ${input}\n` +
      (imageUrl ? `🖼️ Image: (attached)\n` : '') +
      `📨 ${convertToBold("Reply")}:\n${data.reply}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 User ID: ${uid}\n` +
      `👨‍💻 Operator: ${data.operator || "Aryan Chauhan"}`;

    return api.sendMessage(reply, threadID, messageID);

  } catch (err) {
    console.error("❌ Maverick API Error:", err.message);
    return api.sendMessage("❌ Error occurred while calling Maverick API.", threadID, messageID);
  }
};
