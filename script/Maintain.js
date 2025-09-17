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

const USAGE_LIMIT = 9;
const RESET_TIME_MS = 24 * 60 * 60 * 1000;

const userUsage = {};
const userStats = {};

let maintenanceMode = false;
const ADMIN_ID = '61575137262643';

function getPHTime() {
  const now = new Date();
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
  aliases: ['messandra', 'lorex', 'maintenance', 'maintaince', 'maint'],
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

  // Maintenance mode toggle (admin only)
  if (uid === ADMIN_ID) {
    if (input.toLowerCase() === 'maintenance on' || input.toLowerCase() === 'maintaince on') {
      maintenanceMode = true;
      return api.sendMessage("🛠️ Maintenance mode is now ON.", threadID, messageID);
    }
    if (input.toLowerCase() === 'maintenance off' || input.toLowerCase() === 'maintaince off') {
      maintenanceMode = false;
      return api.sendMessage("✅ Maintenance mode is now OFF.", threadID, messageID);
    }
  }

  // Block non-admin users if maintenance mode is ON
  if (maintenanceMode && uid !== ADMIN_ID) {
    return api.sendMessage("⛔ The bot is currently under maintenance. Please try again later.", threadID, messageID);
  }

  // Usage limit for normal users
  if (permission === 0) {
    const now = Date.now();
    if (!userUsage[uid]) {
      userUsage[uid] = { count: 1, lastReset: now };
    } else {
      const elapsed = now - userUsage[uid].lastReset;
      if (elapsed > RESET_TIME_MS) {
        userUsage[uid] = { count: 1, lastReset: now };
      } else {
        if (userUsage[uid].count >= USAGE_LIMIT) {
          const remainMins = Math.ceil((RESET_TIME_MS - elapsed) / 60000);
          return api.sendMessage(`⚠️ You’ve reached your usage limit (${USAGE_LIMIT}/${USAGE_LIMIT}).\n⏳ Try again in ${remainMins} minute(s).`, threadID, messageID);
        }
        userUsage[uid].count++;
      }
    }
  }

  // Update stats
  if (!userStats[uid]) {
    userStats[uid] = { totalPoints: 1, uses: 1 };
  } else {
    userStats[uid].totalPoints++;
    userStats[uid].uses++;
  }

  // Time box
  const timePH = getPHTime();
  const timeBox = `🕒 𝗧𝗶𝗺𝗲 (𝗣𝗛): 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝘁𝗶𝗺𝗲 𝗶𝘀 𝗻𝗼𝘄 𝗮𝘁 𝗵𝗲𝗿𝗲:  ${timePH}`;

  // Usage info
  let usageInfo = '';
  if (permission === 0 && userUsage[uid]) {
    usageInfo = `📊 𝗨𝘀𝗮𝗴𝗲: ${userUsage[uid].count}/${USAGE_LIMIT}`;
  }

  // Average score bar & percentage
  const stats = userStats[uid];
  let percentage, bar;
  if (stats.uses < 3) {
    percentage = 10;
    bar = '█' + '░'.repeat(9);
  } else {
    percentage = Math.min(100, Math.round((stats.totalPoints / stats.uses) * 100));
    bar = generateScoreBar(percentage);
  }
  const averageLine = `📈 𝗔𝘃𝗲𝗿𝗮𝗴𝗲 𝗳𝗼𝗿 ${userName}: ${bar} ${percentage}%`;

  // Footer design
  const poweredBy = `
╔════════════════════════════╗
║ ⚡ 𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬 𝗠𝗘𝗦𝗦𝗔𝗡𝗗𝗥𝗔 𝗔𝗜 ⚡ ║
║ ✨ 𝐂𝐑𝐄𝐀𝐓𝐄𝐃 𝐁𝐘 𝗢𝗣𝗘𝗡𝗔𝗜 𝗚𝗣𝗧 5 ✨ ║
╚════════════════════════════╝
`.trim();

  // Check if user replied to photo message for Gemini Vision
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

  // GPT-5 Text mode
  if (!input) {
    return api.sendMessage("❌ Please type your prompt.\n\nExample: messandra what is love?", threadID, messageID);
  }

  const tempMsg = await sendTemp(api, threadID, "⏳ GPT-5 GENERATING...");

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

    // Format response text (bold replacements)
    const formatted = data.response
      .replace(/\*\*(.*?)\*\*/g, (_, t) => convertToBold(t))
      .replace(/##(.*?)##/g, (_, t) => convertToBold(t))
      .replace(/###\s*/g, '');

    const opener = responseOpeners[Math.floor(Math.random() * responseOpeners.length)];

    return api.editMessage(
      `${opener}\n\n${formatted}\n\n${timeBox}\n${usageInfo}\n${averageLine}\n\n${poweredBy}`,
      tempMsg.messageID,
      threadID
    );

  } catch (err) {
    console.error(err);
    return api.editMessage("❌ Error generating response.", tempMsg.messageID, threadID);
  }
};
