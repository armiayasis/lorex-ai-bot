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

// === GLOBALS ===
let userUsage = {};
let bannedUsers = new Set();

const badWords = [
  'bobo','gago','ulol','tanga','kantot','puke','pakyu','putangina','puta',
];

const usageStats = {
  fast: [], medium: [], slow: []
};

const UPTIME_LIMIT_MINUTES = 300;
let uptimeStartedAt = Date.now();

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
  name: 'mova',
  version: '2.0.0',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['nova', 'aryan'],
  description: "Ask LLama-4 Maverick AI (w/ photo support)",
  usages: "maverick [prompt]",
  credits: "Aryan API + Nova-style by user",
  cooldowns: 0,
};

// === RUN ===
module.exports.run = async function({ api, event, args }) {
  const uid = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;
  const input = args.join(' ').trim();
  const command = args[0]?.toLowerCase();

  // === RESET ===
  if (command === 'reset') {
    userUsage[uid] = 0;
    bannedUsers.delete(uid);
    if (args[1]?.toLowerCase() === 'uptime') {
      uptimeStartedAt = Date.now();
      return api.sendMessage("🔄 Uptime reset to 5 hours.", threadID, messageID);
    }
    return api.sendMessage("✅ Usage and ban reset.", threadID, messageID);
  }

  // === BANNED USER CHECK ===
  if (bannedUsers.has(uid)) {
    return api.sendMessage("⛔ You are banned.\n🔄 Use 'maverick reset' to unban.", threadID, messageID);
  }

  // === BAD WORDS FILTER ===
  const lowerInput = input.toLowerCase();
  if (badWords.some(word => lowerInput.includes(word))) {
    bannedUsers.add(uid);
    return api.sendMessage("🚫 Inappropriate language detected. You are now banned.\n🔄 Type 'maverick reset' to unban.", threadID, messageID);
  }

  // === UPTIME CHECK ===
  const elapsedMinutes = Math.floor((Date.now() - uptimeStartedAt) / 60000);
  const uptimeLeft = Math.max(UPTIME_LIMIT_MINUTES - elapsedMinutes, 0);
  if (uptimeLeft <= 0) {
    return api.sendMessage("⚠️ Maverick AI is offline. Uptime ended.\n🔁 Type 'maverick reset uptime' to restart.", threadID, messageID);
  }

  // === USAGE CHECK ===
  userUsage[uid] = userUsage[uid] || 0;
  if (userUsage[uid] >= 9) {
    return api.sendMessage("⚠️ You've reached the 9/9 usage limit.\n🔁 Type 'maverick reset' to reset your usage.", threadID, messageID);
  }

  if (!input) {
    return api.sendMessage("❓ Please provide a prompt.", threadID, messageID);
  }

  // === PHOTO REPLY SUPPORT ===
  const isPhotoReply = event.type === "message_reply" &&
    event.messageReply?.attachments?.[0]?.type === "photo";
  const imageUrl = isPhotoReply ? event.messageReply.attachments[0].url : "";

  const tempMsg = await sendTemp(api, threadID, "🧠 Thinking with Maverick...");

  try {
    const start = Date.now();

    const res = await axios.get("https://arychauhann.onrender.com/api/llama-4-maverick-17b-128e-instruct", {
      params: {
        uid: uid,
        prompt: input,
        url: imageUrl
      }
    });

    const end = Date.now();
    const elapsed = end - start;
    const category = getResponseCategory(elapsed);
    usageStats[category].push({ user: uid, ms: elapsed });

    userUsage[uid] += 1;

    const reply =
      `🤖 ${convertToBold("Maverick 17B AI")} Response\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 ${convertToBold("Prompt")}: ${input}\n` +
      `📨 ${convertToBold("Reply")}:\n${res.data.reply || "⚠️ No reply"}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🧑 User: ${uid}\n` +
      `📊 Usage: ${userUsage[uid]}/9\n` +
      `⏱️ Uptime Left: ${getUptimeLeft()}\n` +
      `⚡ Speed: ${elapsed}ms (${category})\n` +
      `🕒 Time: ${getCurrentTime()}\n` +
      `🛠 Operator: ${res.data.operator || "Manuelson Yasis"}`;

    return api.sendMessage(reply, threadID, messageID);
  } catch (err) {
    console.error("Maverick Error:", err);
    return api.sendMessage("❌ Error occurred while calling Maverick API.", threadID, messageID);
  }
};
