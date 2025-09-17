const axios = require('axios');

// For bold conversion
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
  "🤖𝙂𝙋𝙏-5-𝘼𝙎𝙎𝙄𝙎𝙏𝘼𝙉𝙏"
];

// Usage limits: 9 uses per 24 hours
const USAGE_LIMIT = 9;
const RESET_TIME_MS = 24 * 60 * 60 * 1000; // 24 hours

// Stores usage and stats per user (in-memory)
const userUsage = {};
const userStats = {};

function getPHTime() {
  // Returns current time in Philippines timezone (UTC+8)
  const now = new Date();
  // convert to UTC +8
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const philippinesTime = new Date(utc + 8 * 3600000);
  const hours = philippinesTime.getHours();
  const minutes = philippinesTime.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const minuteStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hour12}:${minuteStr} ${ampm}`;
}

function generateScoreBar(percent) {
  const filledBlocks = Math.round(percent / 10);
  const emptyBlocks = 10 - filledBlocks;
  return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
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
  name: 'messandra2',
  version: '1.2.1',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['messandra', 'lorex'],
  description: "An AI command powered by GPT-5 + Gemini Vision",
  usages: "ai [prompt]",
  credits: 'LorexAi',
  cooldowns: 0
};

module.exports.run = async function({ api, event, args, permission }) {
  const input = args.join(' ');
  const uid = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;
  const userName = event.senderName || "User";

  // === Usage limit logic for Role 0 users ===
  if (permission === 0) {
    const now = Date.now();
    if (!userUsage[uid]) {
      userUsage[uid] = { count: 1, lastReset: now };
    } else {
      const timeSinceReset = now - userUsage[uid].lastReset;
      if (timeSinceReset > RESET_TIME_MS) {
        userUsage[uid].count = 1;
        userUsage[uid].lastReset = now;
      } else {
        if (userUsage[uid].count >= USAGE_LIMIT) {
          const remaining = Math.ceil((RESET_TIME_MS - timeSinceReset) / (60 * 1000));
          return api.sendMessage(`⚠️ You’ve reached your limit (${USAGE_LIMIT}/${USAGE_LIMIT}).\n⏳ Try again in ${remaining} minute(s).`, threadID, messageID);
        }
        userUsage[uid].count += 1;
      }
    }
  }

  // === Update score stats ===
  if (!userStats[uid]) {
    userStats[uid] = { totalPoints: 1, uses: 1 };
  } else {
    userStats[uid].totalPoints += 1;
    userStats[uid].uses += 1;
  }

  // === Create time box ===
  const timePH = getPHTime();
  const timeBox = `🕒 𝗧𝗶𝗺𝗲 (𝗣𝗛): 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝘁𝗶𝗺𝗲 𝗶𝘀 𝗻𝗼𝘄 𝗮𝘁 𝗵𝗲𝗿𝗲:  ${timePH}`;

  // === Usage info box ===
  let usageInfo = '';
  if (permission === 0 && userUsage[uid]) {
    usageInfo = `📊 𝗨𝘀𝗮𝗴𝗲: ${userUsage[uid].count}/${USAGE_LIMIT}`;
  }

  // === Average score bar + percentage ===
  const stats = userStats[uid];
  const percentage = ((stats.totalPoints / stats.uses) * 100).toFixed(0);
  const bar = generateScoreBar(percentage);
  const averageLine = `📈 𝗔𝘃𝗲𝗿𝗮𝗴𝗲 𝗳𝗼𝗿 ${userName}: ${bar} ${percentage}%`;

  // === Footer ===
  const poweredBy = "⚡ POWERED BY MESSANDRA AI";

  // === IMAGE HANDLING (Gemini Vision) ===
  const isPhotoReply = event.type === "message_reply"
    && Array.isArray(event.messageReply?.attachments)
    && event.messageReply.attachments.some(att => att.type === "photo");

  if (isPhotoReply) {
    const photoUrl = event.messageReply.attachments?.[0]?.url;
    if (!photoUrl) return api.sendMessage("❌ Could not get image URL.", threadID, messageID);
    if (!input) return api.sendMessage("📸 Please provide a prompt along with the image.", threadID, messageID);

    const tempMsg = await sendTemp(api, threadID, "🔍 Analyzing image...");

    try {
      const { data } = await axios.get('https://arychauhann.onrender.com/api/gemini-proxy', {
        params: {
          prompt: input,
          imgUrl: photoUrl
        }
      });

      if (data?.result) {
        const opener = responseOpeners[Math.floor(Math.random() * responseOpeners.length)];
        return api.editMessage(
          `${opener}\n\n${data.result}\n\n${timeBox}\n${usageInfo}\n${averageLine}\n\n${poweredBy}`,
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

  // === GPT-5 TEXT MODE ===
  if (!input) return api.sendMessage("❌ Paki‑type ang prompt mo.\n\nExample: messandra what is love?", threadID, messageID);

  const tempMsg = await sendTemp(api, threadID, "⏳GPT-5 GENERATING....");

  try {
    const { data } = await axios.get('https://daikyu-api.up.railway.app/api/gpt-5', {
      params: {
        ask: input,
        uid: uid
      }
    });

    if (!data?.response) {
      return api.editMessage("❌ No response received. Try again.", tempMsg.messageID, threadID);
    }

    const formatted = data.response
      .replace(/\*\*(.*?)\*\*/g, (_, t) => convertToBold(t))
      .replace(/##(.*?)##/g, (_, t) => convertToBold(t))
      .replace(/###\s*/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const opener = responseOpeners[Math.floor(Math.random() * responseOpeners.length)];

    return api.editMessage(
      `${opener}\n\n${formatted}\n\n${timeBox}\n${usageInfo}\n${averageLine}\n\n${poweredBy}`,
      tempMsg.messageID,
      threadID
    );

  } catch (err) {
    console.error(err);
    return api.editMessage("⚠️ Something went wrong. Try again later.", tempMsg.messageID, threadID);
  }
};
