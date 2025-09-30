const axios = require('axios');

// Convert text to bold
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
  "🤖 𝗟𝗢𝗥𝗘𝗫 𝗣𝗘𝗥𝗦𝗢𝗡𝗔𝗟 𝗔𝗦𝗦𝗜𝗦𝗧𝗔𝗡𝗧"
];

const USAGE_LIMIT = 9;
const RESET_TIME_MS = 24 * 60 * 60 * 1000;

const userUsage = {};
let maintenanceMode = false;

const ADMIN_ID = '61575137262643';

function getPHTime() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const phTime = new Date(utc + 8 * 3600000);
  const h = phTime.getHours(), m = phTime.getMinutes();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hour12}:${m < 10 ? '0' + m : m} ${ampm}`;
}

async function sendTemp(api, threadID, message) {
  return new Promise((resolve, reject) => {
    api.sendMessage(message, threadID, (err, info) => {
      if (err) return reject(err);
      resolve(info);
    });
  });
}

module.exports.config = {
  name: 'lorex',
  version: '2.0.1',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['lorexai', 'assistant', 'lpa'],
  description: "LOREX PERSONAL ASSISTANT powered by GPT-5 + Gemini",
  usages: "lorex [your question]",
  credits: 'LorexAi',
  cooldowns: 0
};

module.exports.run = async function({ api, event, args, permission }) {
  const input = args.join(' ');
  const uid = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;
  const inputLower = input.toLowerCase();

  // Maintenance mode control
  if (uid === ADMIN_ID) {
    if (inputLower === 'maintenance on' || inputLower === 'maintaince on') {
      maintenanceMode = true;
      return api.sendMessage("🛠️ LOREX Assistant is now in maintenance mode.", threadID, messageID);
    }
    if (inputLower === 'maintenance off' || inputLower === 'maintaince off') {
      maintenanceMode = false;
      return api.sendMessage("✅ LOREX Assistant maintenance is now off.", threadID, messageID);
    }
  }

  if (maintenanceMode && uid !== ADMIN_ID) {
    return api.sendMessage("⛔ LOREX is currently under maintenance. Please try again later.", threadID, messageID);
  }

  // Usage limiting
  if (permission === 0) {
    const now = Date.now();
    if (!userUsage[uid]) userUsage[uid] = { count: 1, lastReset: now };
    else {
      const elapsed = now - userUsage[uid].lastReset;
      if (elapsed > RESET_TIME_MS) {
        userUsage[uid] = { count: 1, lastReset: now };
      } else {
        if (userUsage[uid].count >= USAGE_LIMIT) {
          const remaining = Math.ceil((RESET_TIME_MS - elapsed) / 60000);
          return api.sendMessage(`⚠️ You’ve reached your daily limit (${USAGE_LIMIT}).\n⏳ Try again in ${remaining} minute(s).`, threadID, messageID);
        }
        userUsage[uid].count++;
      }
    }
  }

  const timePH = getPHTime();
  const timeBox = `🕒 𝗧𝗶𝗺𝗲 (𝗣𝗛): ${timePH}`;
  const usageInfo = permission === 0 ? `📊 𝗨𝘀𝗮𝗴𝗲: ${userUsage[uid]?.count}/${USAGE_LIMIT}` : '';

  const poweredBy = `
╔══════════════════════════════╗
║ 🤖 LOREX PERSONAL ASSISTANT ║
║ 🔵 Powered by GPT-5 + Aria Ai║
╚══════════════════════════════╝
`.trim();

  // If replying to image
  const isPhotoReply = event.type === "message_reply"
    && Array.isArray(event.messageReply?.attachments)
    && event.messageReply.attachments.some(att => att.type === "photo");

  if (isPhotoReply) {
    const photoUrl = event.messageReply.attachments?.[0]?.url;
    if (!photoUrl) return api.sendMessage("❌ Could not fetch image URL.", threadID, messageID);
    if (!input) return api.sendMessage("📝 Please enter a prompt along with the image.", threadID, messageID);

    const tempMsg = await sendTemp(api, threadID, "📷 Analyzing image with Gemini...");

    try {
      const { data } = await axios.get('https://arychauhann.onrender.com/api/gemini-proxy', {
        params: { prompt: input, imgUrl: photoUrl }
      });

      if (data?.result) {
        const opener = responseOpeners[Math.floor(Math.random() * responseOpeners.length)];
        return api.editMessage(
          `${opener}\n\n${data.result}\n\n${timeBox}\n${usageInfo}\n\n${poweredBy}`,
          tempMsg.messageID,
          threadID
        );
      }

      return api.editMessage("⚠️ Unexpected response from Gemini Vision API.", tempMsg.messageID, threadID);
    } catch (err) {
      console.error(err);
      return api.editMessage("❌ Error analyzing image.", tempMsg.messageID, threadID);
    }
  }

  // If no text input
  if (!input) {
    return api.sendMessage("❌ Please enter a prompt.\nExample: lorex what is AI?", threadID, messageID);
  }

  // GPT-5 text generation
  const tempMsg = await sendTemp(api, threadID, "⏳ Generating response with GPT-5...");

  try {
    const { data } = await axios.get('https://daikyu-api.up.railway.app/api/gpt-5', {
      params: { ask: input, uid: uid }
    });

    if (!data?.response) {
      return api.editMessage("❌ No response received. Try again.", tempMsg.messageID, threadID);
    }

    const formatted = data.response
      .replace(/\*\*(.*?)\*\*/g, (_, t) => convertToBold(t))
      .replace(/##(.*?)##/g, (_, t) => convertToBold(t))
      .replace(/###\s*/g, '');

    const opener = responseOpeners[Math.floor(Math.random() * responseOpeners.length)];

    return api.editMessage(
      `${opener}\n\n${formatted}\n\n${timeBox}\n${usageInfo}\n\n${poweredBy}`,
      tempMsg.messageID,
      threadID
    );

  } catch (err) {
    console.error(err);
    return api.editMessage("❌ Error generating response.", tempMsg.messageID, threadID);
  }
};
