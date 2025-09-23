const axios = require('axios');

// === FONT STYLING FUNCTION ===
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

// === GLOBAL VARIABLES ===
let userUsage = {};        // userID => usage count (max 9)
let bannedUsers = new Set();

const badWords = [
  'bobo', 'tanga', 'gago', 'ulol', 'pakyu', 'puke', 'putangina', 'puta', 'kantot',
];

const usageStats = {
  fast: [],
  medium: [],
  slow: [],
};

const UPTIME_LIMIT_MINUTES = 300; // 5 hours
let uptimeStartedAt = Date.now();

// === HELPERS ===
function getResponseCategory(ms) {
  if (ms <= 1000) return 'fast';
  if (ms <= 3000) return 'medium';
  return 'slow';
}

function getUptimeLeft() {
  const elapsed = Math.floor((Date.now() - uptimeStartedAt) / 60000);
  const remaining = Math.max(UPTIME_LIMIT_MINUTES - elapsed, 0);
  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;
  return `${hours}h ${minutes}m`;
}

function getCurrentTime() {
  const now = new Date();
  return now.toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
}

async function sendTemp(api, threadID, message) {
  return new Promise(resolve => {
    api.sendMessage(message, threadID, (err, info) => resolve(info));
  });
}

// === CONFIG ===
module.exports.config = {
  name: 'nova',
  version: '2.0.0',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['gpt', 'lorex'],
  description: "An AI command powered by Gemini Vision",
  usages: "nova [prompt]",
  credits: 'LorexAi',
  cooldowns: 0,
};

// === RUN FUNCTION ===
module.exports.run = async function({ api, event, args }) {
  const uid = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;
  const input = args.join(' ').trim();
  const command = args[0]?.toLowerCase();

  // === HANDLE RESET COMMANDS ===
  if (command === 'reset') {
    // Reset usage and unban user
    userUsage[uid] = 0;
    bannedUsers.delete(uid);

    // If resetting uptime as well
    if (args[1]?.toLowerCase() === 'uptime') {
      uptimeStartedAt = Date.now();
      return api.sendMessage("🔄 AI uptime has been reset to 5 hours.", threadID, messageID);
    }

    return api.sendMessage("✅ Your usage and ban status have been reset.", threadID, messageID);
  }

  // === CHECK IF USER IS BANNED ===
  if (bannedUsers.has(uid)) {
    return api.sendMessage(
      "❌ You are banned from using this command due to inappropriate language.\n🔄 Type 'nova reset' to unban.",
      threadID,
      messageID
    );
  }

  // === BAD WORD FILTER ===
  const lowerInput = input.toLowerCase();
  if (badWords.some(word => lowerInput.includes(word))) {
    bannedUsers.add(uid);
    return api.sendMessage(
      "🚫 You used inappropriate language. You are now banned from using the AI.\n🔄 Type 'nova reset' to unban.",
      threadID,
      messageID
    );
  }

  // === CHECK UPTIME ===
  const elapsedMinutes = Math.floor((Date.now() - uptimeStartedAt) / 60000);
  const uptimeLeftMinutes = Math.max(UPTIME_LIMIT_MINUTES - elapsedMinutes, 0);
  if (uptimeLeftMinutes <= 0) {
    return api.sendMessage(
      "🚫 AI is currently offline. Uptime has ended.\n🛠 Use 'nova reset uptime' to restart it.",
      threadID,
      messageID
    );
  }

  // === CHECK USAGE LIMIT ===
  userUsage[uid] = userUsage[uid] || 0;
  if (userUsage[uid] >= 9) {
    return api.sendMessage(
      "⚠️ You've reached the 9/9 usage limit.\n🔄 Type 'nova reset' to reset your usage.",
      threadID,
      messageID
    );
  }

  if (!input) {
    return api.sendMessage("❓ Please enter a prompt to ask the AI.", threadID, messageID);
  }

  // === DETECT IF PHOTO REPLY ===
  const isPhotoReply =
    event.type === "message_reply" &&
    Array.isArray(event.messageReply?.attachments) &&
    event.messageReply.attachments.some(att => att.type === "photo");

  const tempMsg = await sendTemp(api, threadID, "🔍 Processing...");

  try {
    const startTime = Date.now();

    let response;

    if (isPhotoReply) {
      const photoUrl = event.messageReply.attachments?.[0]?.url;
      if (!photoUrl) return api.sendMessage("❌ Could not get image URL.", threadID, messageID);

      response = await axios.get('https://daikyu-api.up.railway.app/api/gemini-pro', {
        params: { ask: input, uid: uid, imageURL: photoUrl }
      });
    } else {
      response = await axios.get('https://daikyu-api.up.railway.app/api/gemini-pro', {
        params: { ask: input, uid: uid }
      });
    }

    const endTime = Date.now();
    const elapsed = endTime - startTime;
    const category = getResponseCategory(elapsed);
    const kmNumber = usageStats[category].length + 1;
    usageStats[category].push({ user: uid, ms: elapsed, km: kmNumber });

    userUsage[uid] += 1;

    const timeNow = getCurrentTime();
    const uptimeLeft = getUptimeLeft();

    // Dashboard stats
    const fastCount = usageStats.fast.length;
    const mediumCount = usageStats.medium.length;
    const slowCount = usageStats.slow.length;

    const dashboard =
      `📊 ${convertToBold("FAST")}: ${fastCount} km\n` +
      `⚖️ ${convertToBold("MEDIUM")}: ${mediumCount} km\n` +
      `🐢 ${convertToBold("SLOW")}: ${slowCount} km\n` +
      `⏱️ ${convertToBold("Uptime Left")}: ${uptimeLeft}`;

    const reply =
      `✨ ${convertToBold("Super Nova")} AI Response ✨\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 ${convertToBold("Prompt")}: ${input}\n` +
      `📨 ${convertToBold("Reply")}:\n${response.data.answer}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🕒 ${convertToBold("Time")}: ${timeNow}\n` +
      `🔋 ${convertToBold("Powered by Messandra AI")}\n` +
      `📊 ${convertToBold("Usage")}: ${userUsage[uid]}/9\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      dashboard;

    return api.sendMessage(reply, threadID, messageID);
  } catch (error) {
    console.error(error);
    return api.sendMessage("❌ An error occurred while processing your request.", threadID, messageID);
  }
};
