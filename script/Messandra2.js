const axios = require('axios');

// Bold text conversion
function convertToBold(text) {
  const boldMap = {
    'a': '𝗮','b': '𝗯','c': '𝗰','d': '𝗱','e': '𝗲','f': '𝗳','g': '𝗴','h': '𝗵','i': '𝗶','j': '𝗷',
    'k': '𝗸','l': '𝗹','m': '𝗺','n': '𝗻','o': '𝗼','p': '𝗽','q': '𝗾','r': '𝗿','s': '𝘀','t': '𝘁',
    'u': '𝘂','v': '𝘃','w': '𝘄','x': '𝘅','y': '𝘆','z': '𝘇',
    'A': '𝗔','B': '𝗕','C': '𝗖','D': '𝗗','E': '𝗘','F': '𝗙','G': '𝗚','H': '𝗛','I': '𝗜','J': '𝗝',
    'K': '𝗞','L': '𝗟','M': '𝗠','N': '𝗡','O': '𝗢','P': '𝗣','Q': '𝗤','R': '𝗥','S': '𝗦','T': '𝗧',
    'U': '𝗨','V': '𝗩','W': '𝗪','X': '𝗫','Y': '𝗬','Z': '𝗭',
  };
  return text.split('').map(c => boldMap[c] || c).join('');
}

const responseOpeners = [
  "🤖𝙂𝙋𝙏 𝘼𝙎𝙎𝙄𝙎𝙏𝘼𝙉𝙏"
];

const ADMIN_UID = "61575137262643";

const USAGE_LIMIT = 9;
const MAX_USAGE = 10; // Ban at 10
const BAN_DURATION = 9 * 60 * 60 * 1000; // 9 hours in ms
const RESET_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms

// In-memory usage & ban tracking
const userUsage = {}; // { uid: { count, lastReset } }
const userBans = {};  // { uid: banExpiresTimestamp }

function getPHTime() {
  return new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hours}h ${mins}m ${secs}s`;
}

function isUserBanned(uid) {
  if (!userBans[uid]) return false;
  if (Date.now() > userBans[uid]) {
    delete userBans[uid];
    return false;
  }
  return true;
}

function banTimeLeft(uid) {
  if (!userBans[uid]) return 0;
  return Math.ceil((userBans[uid] - Date.now()) / (60 * 1000)); // minutes left
}

function checkAndUpdateUsage(uid) {
  const now = Date.now();

  // Check ban
  if (isUserBanned(uid)) {
    return { banned: true, banLeft: banTimeLeft(uid) };
  }

  // Check usage
  if (!userUsage[uid]) {
    userUsage[uid] = { count: 1, lastReset: now };
    return { banned: false, allowed: true, count: 1 };
  }

  // Reset usage after 24 hours
  if (now - userUsage[uid].lastReset > RESET_DURATION) {
    userUsage[uid] = { count: 1, lastReset: now };
    return { banned: false, allowed: true, count: 1 };
  }

  // If user already hit max usage, ban them
  if (userUsage[uid].count >= MAX_USAGE) {
    userBans[uid] = now + BAN_DURATION;
    return { banned: true, banLeft: BAN_DURATION / (60 * 1000) };
  }

  userUsage[uid].count++;
  return { banned: false, allowed: true, count: userUsage[uid].count };
}

function usageMessage(uid, count) {
  // White circle at 1, chart emoji after
  const emoji = count === 1 ? '⚪️' : '📈';
  // Average score percentage (count * 10)%
  return `${emoji} 𝗔𝘃𝗲𝗿𝗮𝗴𝗲 ${convertToBold(uid)}: ${count * 10}%\n` +
         `📊 Usage: ${count}/${USAGE_LIMIT}\n` +
         `🕒 Current Time (PH): ${getPHTime()}\n\n` +
         `POWERED BY MESSANDRA AI`;
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
  aliases: ['messandra', 'lorex', 'reset', 'bannedlist', 'recover', 'recoverall', 'feedback'],
  description: "An AI command powered by GPT-5 + Gemini Vision",
  usages: "ai [prompt] | reset | bannedlist | recover <UID> | recoverall | feedback <message>",
  credits: 'LorexAi',
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const input = args.join(' ').trim();
  const uid = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;
  const cmd = event.commandName?.toLowerCase();

  // --- FEEDBACK command ---
  if (cmd === 'feedback') {
    if (!input) {
      return api.sendMessage("❌ Please provide a feedback message.\n\nExample: messandra feedback The bot is awesome!", threadID, messageID);
    }
    const userName = event.senderName || `User ${uid}`;
    const forwardMsg = `📩 Feedback/Report from: ${userName} (UID: ${uid})\n\n${input}`;
    try {
      await api.sendMessage(forwardMsg, ADMIN_UID);
      return api.sendMessage("✅ Thank you! Your feedback has been sent to the admin.", threadID, messageID);
    } catch (err) {
      console.error(err);
      return api.sendMessage("❌ Failed to send feedback. Please try again later.", threadID, messageID);
    }
  }

  // Admin-only commands:
  if (['reset', 'bannedlist', 'recover', 'recoverall'].includes(cmd) && uid !== ADMIN_UID) {
    return api.sendMessage("❌ You are not authorized to use this command.", threadID, messageID);
  }

  if (cmd === 'reset' && uid === ADMIN_UID) {
    delete userUsage[uid];
    delete userBans[uid];
    return api.sendMessage("✅ Your usage and ban have been reset.", threadID, messageID);
  }

  if (cmd === 'bannedlist' && uid === ADMIN_UID) {
    const bannedUsers = Object.entries(userBans);
    if (!bannedUsers.length) return api.sendMessage("ℹ️ No users currently banned.", threadID, messageID);
    let msg = "🚫 Banned Users:\n";
    const now = Date.now();
    bannedUsers.forEach(([buid, banExpires], i) => {
      const timeLeft = banExpires - now;
      msg += `${i + 1}. UID: ${buid} — Expires in: ${formatTime(timeLeft > 0 ? timeLeft : 0)}\n`;
    });
    return api.sendMessage(msg.trim(), threadID, messageID);
  }

  if (cmd === 'recover' && uid === ADMIN_UID) {
    if (!args[0]) return api.sendMessage("❌ Please provide a UID to recover.", threadID, messageID);
    const targetUID = args[0];
    let didRecover = false;
    if (userUsage[targetUID]) {
      delete userUsage[targetUID];
      didRecover = true;
    }
    if (userBans[targetUID]) {
      delete userBans[targetUID];
      didRecover = true;
    }
    if (didRecover) return api.sendMessage(`✅ Usage and ban reset for user ID ${targetUID}.`, threadID, messageID);
    else return api.sendMessage(`ℹ️ No usage or ban record found for user ID ${targetUID}.`, threadID, messageID);
  }

  if (cmd === 'recoverall' && uid === ADMIN_UID) {
    Object.keys(userUsage).forEach(k => delete userUsage[k]);
    Object.keys(userBans).forEach(k => delete userBans[k]);
    return api.sendMessage("✅ All users usage and bans have been reset.", threadID, messageID);
  }

  // --- USAGE AND BAN CHECK ---
  const usageStatus = checkAndUpdateUsage(uid);

  if (usageStatus.banned) {
    return api.sendMessage(`⛔️ You are banned due to excessive usage.\n⏳ Wait ${usageStatus.banLeft} minute(s).`, threadID, messageID);
  }

  if (!usageStatus.allowed) {
    return api.sendMessage(`⚠️ Usage limit reached (${USAGE_LIMIT}/${USAGE_LIMIT}). Try again in 24 hours.`, threadID, messageID);
  }

  // Show usage summary before processing input
  await api.sendMessage(usageMessage(uid, usageStatus.count), threadID);

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
        params: { prompt: input, imgUrl: photoUrl }
      });

      if (data?.result) {
        const opener = responseOpeners[Math.floor(Math.random() * responseOpeners.length)];
        return api.editMessage(`${opener}\n\n${data.result}`, tempMsg.messageID, threadID);
      }

      return api.editMessage("⚠️ Unexpected response from Gemini Vision API.", tempMsg.messageID, threadID);
    } catch (err) {
      console.error(err);
      return api.editMessage("❌ Error analyzing image.", tempMsg.messageID, threadID);
    }
  }

  // === GPT-5 TEXT MODE ===
  if (!input) return api.sendMessage("❌ Please provide a prompt.", threadID, messageID);

  const tempMsg = await sendTemp(api, threadID, "🔎 Thinking...");

  try {
    const response = await axios.get("https://arychauhann.onrender.com/api/gpt-proxy", {
      params: { prompt: input }
    });

    if (response.data?.result) {
      const opener = responseOpeners[Math.floor(Math.random() * responseOpeners.length)];
      return api.editMessage(`${opener}\n\n${response.data.result}`, tempMsg.messageID, threadID);
    }

    return api.editMessage("⚠️ Unexpected response from GPT-5 API.", tempMsg.messageID, threadID);
  } catch (err) {
    console.error(err);
    return api.editMessage("❌ Error getting response from GPT-5 API.", tempMsg.messageID, threadID);
  }
};
