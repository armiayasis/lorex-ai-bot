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
  return text.split('').map(c => boldMap[c] || c).join('');
}

// === PLANS ===
const plans = {
  0: { name: 'Free Plan', usageLimit: 3, durationDays: 4 },
  1: { name: 'Plan 10', usageLimit: 10, durationDays: 30 },
  2: { name: 'Plan 50', usageLimit: 50, durationDays: 30 },
  3: { name: 'Plan 100', usageLimit: 100, durationDays: 30 },
  4: { name: 'Daily Plan', usageLimit: 5, durationDays: 1 },
};

// === GLOBAL STORAGE ===
let userUsage = {};        // userID -> {used, limit, plan, planExpiry, key, keyUsedCount}
let bannedUsers = new Set();
let usedKeys = new Set();  // one-time use keys that are used
if (!global.keysDB) global.keysDB = {};  // keys storage (key -> plan info)

const badWords = ['bobo','tanga','gago','ulol','pakyu','puke','putangina','puta','kantot'];

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
  const h = Math.floor(remaining / 60);
  const m = remaining % 60;
  return `${h}h ${m}m`;
}

function getCurrentTime() {
  return new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
}

async function sendTemp(api, threadID, message) {
  return new Promise(resolve => {
    api.sendMessage(message, threadID, (err, info) => resolve(info));
  });
}

function generateKey(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < length; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// === MODULE CONFIG ===
module.exports.config = {
  name: 'nova23',
  version: '2.0.0',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['nova', 'supernova', 'sn'],
  description: "AI command with key login, reset, ban, usage limit, dashboard",
  usages: "supernova [prompt]",
  credits: 'LorexAi + SwordSlush + ChatGPT',
  cooldowns: 0,
};

// === RUN FUNCTION ===
module.exports.run = async function({ api, event, args }) {
  const uid = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;
  const input = args.join(' ').trim();
  const command = args[0]?.toLowerCase();

  // Initialize user usage record if not exist
  if (!userUsage[uid]) {
    userUsage[uid] = {
      used: 0,
      limit: plans[0].usageLimit,
      plan: 0,
      planExpiry: Date.now() + plans[0].durationDays * 24*60*60*1000,
      key: null,
      keyUsedCount: 0,
    };
  }

  // --- HANDLE RESET ---
  if (command === 'reset') {
    userUsage[uid] = {
      used: 0,
      limit: plans[0].usageLimit,
      plan: 0,
      planExpiry: Date.now() + plans[0].durationDays * 24*60*60*1000,
      key: null,
      keyUsedCount: 0,
    };
    uptimeStartedAt = Date.now();
    return api.sendMessage(
      "✅ Usage and plan reset to Free Plan.\n🔄 Uptime reset.\n🔑 Your login key has been invalidated.",
      threadID, messageID
    );
  }

  // --- BANNED USERS ---
  if (bannedUsers.has(uid)) {
    return api.sendMessage(
      "❌ You are banned for inappropriate language.\n🔄 Type 'supernova reset' to unban.",
      threadID, messageID
    );
  }

  // --- BAD WORD FILTER ---
  const lowerInput = input.toLowerCase();
  if (badWords.some(w => lowerInput.includes(w))) {
    bannedUsers.add(uid);
    return api.sendMessage(
      "🚫 Inappropriate language detected. You are now banned.\n🔄 Type 'supernova reset' to unban.",
      threadID, messageID
    );
  }

  // --- CHECK UPTIME ---
  const elapsedMin = Math.floor((Date.now() - uptimeStartedAt)/60000);
  const uptimeLeft = Math.max(UPTIME_LIMIT_MINUTES - elapsedMin, 0);
  if (uptimeLeft <= 0) {
    return api.sendMessage(
      "🚫 AI is offline. Uptime ended.\nUse 'supernova reset' to restart uptime.",
      threadID, messageID
    );
  }

  // --- LOGIN WITH KEY ---
  if (command === 'login') {
    const key = args[1]?.toUpperCase();
    if (!key) {
      return api.sendMessage("❌ Please provide a key. Usage: nova login <KEY>", threadID, messageID);
    }

    const keyData = global.keysDB[key];
    if (!keyData) {
      return api.sendMessage("❌ Invalid key.", threadID, messageID);
    }
    if (keyData.oneTimeUse && usedKeys.has(key)) {
      return api.sendMessage("❌ This key is one-time use and already used.", threadID, messageID);
    }

    // Apply plan and usage limits from key
    userUsage[uid].limit = keyData.usageLimit;
    userUsage[uid].used = 0;
    userUsage[uid].plan = keyData.planNumber;
    userUsage[uid].planExpiry = Date.now() + keyData.durationDays*24*60*60*1000;
    userUsage[uid].key = key;
    userUsage[uid].keyUsedCount = 0;

    if (keyData.oneTimeUse) usedKeys.add(key);

    return api.sendMessage(
      `✅ Logged in with key: ${key}\nPlan: ${plans[keyData.planNumber].name}\nUsage Limit: ${keyData.usageLimit}\nExpires in: ${keyData.durationDays} day(s)`,
      threadID, messageID
    );
  }

  // --- GENERATE KEY (ADMIN ONLY) ---
  if (command === 'generate' && args[1] === 'key') {
    if (!event.isAdmin) {
      return api.sendMessage("❌ Only admins can generate keys.", threadID, messageID);
    }

    const planNumber = Number(args[2]);
    const usageLimit = Number(args[3]);
    const durationDays = Number(args[4]);
    const oneTimeUse = args[5] === 'true';

    if (!plans[planNumber]) {
      return api.sendMessage(`❌ Invalid plan number. Available: ${Object.keys(plans).join(', ')}`, threadID, messageID);
    }
    if (!usageLimit || usageLimit <= 0) {
      return api.sendMessage("❌ Usage limit must be a positive number.", threadID, messageID);
    }
    if (!durationDays || durationDays <= 0) {
      return api.sendMessage("❌ Duration days must be a positive number.", threadID, messageID);
    }

    const newKey = generateKey();

    global.keysDB[newKey] = {
      planNumber,
      usageLimit,
      durationDays,
      oneTimeUse: !!oneTimeUse,
    };

    return api.sendMessage(
      `🔑 Key generated:\nKey: ${newKey}\nPlan: ${plans[planNumber].name}\nUsage: ${usageLimit}\nDuration: ${durationDays} days\nOne-time use: ${oneTimeUse ? "Yes" : "No"}`,
      threadID, messageID
    );
  }

  // --- CHECK PLAN EXPIRY ---
  if (Date.now() > userUsage[uid].planExpiry) {
    return api.sendMessage(
      `❌ Your plan (${plans[userUsage[uid].plan].name}) expired.\nPlease login with a key or buy a plan.`,
      threadID, messageID
    );
  }

  // --- CHECK USAGE LIMIT ---
  if (userUsage[uid].used >= userUsage[uid].limit) {
    return api.sendMessage(
      `⚠️ Usage limit reached for plan (${plans[userUsage[uid].plan].name}).\nPlease upgrade or buy a plan.`,
      threadID, messageID
    );
  }

  // --- SHOW PLANS ---
  if (command === 'plans') {
    let msg = '💼 Available Plans:\n\n';
    for (const [k, v] of Object.entries(plans)) {
      msg += `Plan ${k}: ${v.name}\nUsage Limit: ${v.usageLimit}\nDuration: ${v.durationDays} days\n\n`;
    }
    msg += `Buy a plan: supernova buy plan [plan number]\nExample: supernova buy plan 1`;
    return api.sendMessage(msg, threadID, messageID);
  }

  // --- BUY PLAN ---
  if (command === 'buy' && args[1] === 'plan') {
    const planNumber = args[2];
    if (!plans[planNumber]) {
      return api.sendMessage(`❌ Plan ${planNumber} does not exist. Type 'supernova plans'`, threadID, messageID);
    }
    userUsage[uid].limit = plans[planNumber].usageLimit;
    userUsage[uid].used = 0;
    userUsage[uid].plan = planNumber;
    userUsage[uid].planExpiry = Date.now() + plans[planNumber].durationDays * 24*60*60*1000;
    userUsage[uid].key = null; // clear key when buying plan
    userUsage[uid].keyUsedCount = 0;
    return api.sendMessage(
      `✅ Purchased ${plans[planNumber].name} with ${plans[planNumber].usageLimit} uses, valid for ${plans[planNumber].durationDays} days.`,
      threadID, messageID
    );
  }

  // --- NO PROMPT ---
  if (!input) {
    return api.sendMessage("❓ Enter a prompt to ask Nova AI.", threadID, messageID);
  }

  // --- PROCESS AI PROMPT ---
  const tempMsg = await sendTemp(api, threadID, "🔍 Processing...");

  try {
    const startTime = Date.now();
    const response = await axios.get('https://betadash-api-swordslush-production.up.railway.app/Llama70b', {
      params: { ask: input, uid }
    });
    const endTime = Date.now();
    const elapsed = endTime - startTime;

    const category = getResponseCategory(elapsed);
    const kmNumber = usageStats[category].length + 1;
    usageStats[category].push({ user: uid, ms: elapsed, km: kmNumber });

    userUsage[uid].used++;
    userUsage[uid].keyUsedCount++;

    const timeNow = getCurrentTime();
    const uptimeLeftStr = getUptimeLeft();

    const fastCount = usageStats.fast.length;
    const mediumCount = usageStats.medium.length;
    const slowCount = usageStats.slow.length;

    const daysLeft = Math.max(0, Math.floor((userUsage[uid].planExpiry - Date.now())/(1000*60*60*24)));

    // Dashboard message with all info
    const dashboard =
      `📊 ${convertToBold("FAST")}: ${fastCount} km\n` +
      `⚖️ ${convertToBold("MEDIUM")}: ${mediumCount} km\n` +
      `🐢 ${convertToBold("SLOW")}: ${slowCount} km\n` +
      `⏱️ ${convertToBold("Uptime Left")}: ${uptimeLeftStr}\n` +
      `📅 ${convertToBold("Date & Time")}: ${timeNow}\n` +
      `💼 ${convertToBold("Current Plan")}: ${plans[userUsage[uid].plan].name}\n` +
      `🔢 ${convertToBold("Usage")}: ${userUsage[uid].used}/${userUsage[uid].limit}\n` +
      `⌛ ${convertToBold("Plan Expires In")}: ${daysLeft} day(s)\n` +
      (userUsage[uid].key
        ? `🔑 ${convertToBold("Key Login")}: ${userUsage[uid].key}\n` +
          `🗝️ ${convertToBold("Key Used")}: ${userUsage[uid].keyUsedCount}`
        : '');

    return api.sendMessage(
      `${response.data.response}\n\n${dashboard}`, threadID, tempMsg.messageID
    );

  } catch (e) {
    return api.sendMessage(
      "❌ Error contacting AI server. Please try again later.", threadID, messageID
    );
  }
};
