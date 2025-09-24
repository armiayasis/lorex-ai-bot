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

// === PLANS ===
const plans = {
  0: { name: 'Free Plan', usageLimit: 3, durationDays: 4 },     // 3 uses, 4 days
  1: { name: 'Plan 10', usageLimit: 10, durationDays: 30 },     // 10 uses, 30 days
  2: { name: 'Plan 50', usageLimit: 50, durationDays: 30 },     // 50 uses, 30 days
  3: { name: 'Plan 100', usageLimit: 100, durationDays: 30 },   // 100 uses, 30 days
  4: { name: 'Daily Plan', usageLimit: 5, durationDays: 1 },    // 5 uses, 1 day
};

// === GLOBAL VARIABLES ===
let userUsage = {};        // userID => { used, limit, plan, planExpiry }
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
  name: 'nova0',
  version: '2.0.0',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['nova', 'supernova', 'sn'],
  description: "An AI command powered by LLaMA 70B with reset, ban, and usage limit",
  usages: "supernova [prompt]",
  credits: 'LorexAi + SwordSlush',
  cooldowns: 0,
};

// === RUN FUNCTION ===
module.exports.run = async function({ api, event, args }) {
  const uid = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;
  const input = args.join(' ').trim();
  const command = args[0]?.toLowerCase();

  // Initialize userUsage entry if not exists
  if (!userUsage[uid]) {
    userUsage[uid] = {
      used: 0,
      limit: plans[0].usageLimit,
      plan: 0,
      planExpiry: Date.now() + plans[0].durationDays * 24 * 60 * 60 * 1000,
    };
  }

  // === HANDLE RESET COMMANDS ===
  if (command === 'reset') {
    userUsage[uid] = {
      used: 0,
      limit: plans[0].usageLimit,
      plan: 0,
      planExpiry: Date.now() + plans[0].durationDays * 24 * 60 * 60 * 1000,
    };
    uptimeStartedAt = Date.now();
    return api.sendMessage(
      "✅ Your usage and plan have been reset to Free Plan (4 days, 3 uses).\n🔄 AI uptime reset to 5 hours.",
      threadID,
      messageID
    );
  }

  // === CHECK IF USER IS BANNED ===
  if (bannedUsers.has(uid)) {
    return api.sendMessage(
      "❌ You are banned from using this command due to inappropriate language.\n🔄 Type 'supernova reset' to unban.",
      threadID,
      messageID
    );
  }

  // === BAD WORD FILTER ===
  const lowerInput = input.toLowerCase();
  if (badWords.some(word => lowerInput.includes(word))) {
    bannedUsers.add(uid);
    return api.sendMessage(
      "🚫 You used inappropriate language. You are now banned from using the AI.\n🔄 Type 'supernova reset' to unban.",
      threadID,
      messageID
    );
  }

  // === CHECK UPTIME ===
  const elapsedMinutes = Math.floor((Date.now() - uptimeStartedAt) / 60000);
  const uptimeLeftMinutes = Math.max(UPTIME_LIMIT_MINUTES - elapsedMinutes, 0);
  if (uptimeLeftMinutes <= 0) {
    return api.sendMessage(
      "🚫 AI is currently offline. Uptime has ended.\n🛠 Use 'supernova reset uptime' to restart it.",
      threadID,
      messageID
    );
  }

  // === CHECK PLAN VALIDITY ===
  if (Date.now() > userUsage[uid].planExpiry) {
    return api.sendMessage(
      `❌ Your current plan (${plans[userUsage[uid].plan].name}) has expired.\nPlease buy a plan to continue using the AI.\nType: 'supernova plans' to see available plans.`,
      threadID,
      messageID
    );
  }

  // === CHECK USAGE LIMIT ===
  if (userUsage[uid].used >= userUsage[uid].limit) {
    return api.sendMessage(
      `⚠️ You have reached your usage limit for your current plan (${plans[userUsage[uid].plan].name}).\nPlease buy or upgrade your plan.\nType: 'supernova plans' to see available plans.`,
      threadID,
      messageID
    );
  }

  // === SHOW PLANS ===
  if (command === 'plans') {
    let msg = '💼 Available Plans:\n\n';
    for (const [key, val] of Object.entries(plans)) {
      msg += `Plan ${key}: ${val.name}\nUsage Limit: ${val.usageLimit}\nDuration: ${val.durationDays} day(s)\n\n`;
    }
    msg += `To buy a plan, type: supernova buy plan [plan number]\nExample: supernova buy plan 1`;
    return api.sendMessage(msg, threadID, messageID);
  }

  // === BUY PLAN ===
  if (command === 'buy' && args[1] === 'plan') {
    const planNumber = args[2];
    if (!plans[planNumber]) {
      return api.sendMessage(
        `❌ Plan ${planNumber} does not exist. Type 'supernova plans' to see available plans.`,
        threadID,
        messageID
      );
    }

    userUsage[uid].limit = plans[planNumber].usageLimit;
    userUsage[uid].used = 0;
    userUsage[uid].plan = planNumber;
    userUsage[uid].planExpiry = Date.now() + plans[planNumber].durationDays * 24 * 60 * 60 * 1000;

    return api.sendMessage(
      `✅ You purchased ${plans[planNumber].name} with ${plans[planNumber].usageLimit} uses, valid for ${plans[planNumber].durationDays} day(s).`,
      threadID,
      messageID
    );
  }

  // === NO PROMPT GIVEN ===
  if (!input) {
    return api.sendMessage("❓ Please enter a prompt to ask the Nova AI.", threadID, messageID);
  }

  // === PROCESS AI REQUEST ===
  const tempMsg = await sendTemp(api, threadID, "🔍 Processing...");

  try {
    const startTime = Date.now();

    const response = await axios.get('https://betadash-api-swordslush-production.up.railway.app/Llama70b', {
      params: { ask: input, uid: uid }
    });

    const endTime = Date.now();
    const elapsed = endTime - startTime;
    const category = getResponseCategory(elapsed);
    const kmNumber = usageStats[category].length + 1;
    usageStats[category].push({ user: uid, ms: elapsed, km: kmNumber });

    userUsage[uid].used += 1;

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
      `⏱️ ${convertToBold("Uptime Left")}: ${uptimeLeft}\n` +
      `📅 ${convertToBold("Date & Time")}: ${timeNow}\n` +
      `💼 ${convertToBold("Current Plan")}: ${plans[userUsage[uid].plan].name}\n` +
      `🔢 ${convertToBold("Usage")}: ${userUsage[uid].used}/${userUsage[uid].limit}\n` +
      `⌛ ${convertToBold("Plan Expires In")}: ${Math.max(0, Math.floor((userUsage[uid].planExpiry - Date.now()) / (1000 * 60 * 60 * 24)))} day(s)`;

    const formatted = response.data.response
      .replace(/\*\*(.*?)\*\*/g, (_, t) => convertToBold(t))
      .replace(/##(.*?)##/g, (_, t) => convertToBold(t))
      .replace(/###\s*/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const reply =
      `✨ ${convertToBold("SUPER NOVA")} AI Response ✨\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 ${convertToBold("Prompt")}: ${input}\n` +
      `📨 ${convertToBold("Reply")}:\n${formatted}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      dashboard;

    return api.editMessage(reply, tempMsg.messageID, threadID);

  } catch (error) {
    console.error(error);
    return api.editMessage("❌ An error occurred while processing your request.", tempMsg.messageID, threadID);
  }
};
