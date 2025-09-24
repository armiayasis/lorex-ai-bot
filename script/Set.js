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
  return text.split('').map(c => boldMap[c] || c).join('');
}

let userUsage = {};
const bannedUsers = new Set();
const badWords = ['bobo','tanga','gago','ulol','pakyu','puke','putangina','puta','kantot'];

const UPTIME_LIMIT = 300; // minutes (5 hours)
let uptimeStart = Date.now();

const pendingGroups = []; // {threadID, name, requestedAt}
const approvedGroups = new Set();
const adminUserID = '61561386586142'; // Palitan ito ng admin Facebook ID mo

async function sendTemp(api, threadID, message) {
  return new Promise(resolve => {
    api.sendMessage(message, threadID, (err, info) => resolve(info));
  });
}

function uptimeLeft() {
  const mins = Math.max(0, UPTIME_LIMIT - Math.floor((Date.now() - uptimeStart)/60000));
  const h = Math.floor(mins/60);
  const m = mins%60;
  return `${h}h ${m}m`;
}

module.exports.config = {
  name: 'nova8',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  aliases: ['nova', 'novabot'],
  description: "NOVA AI bot with group approval & usage limits",
  usages: "nova [prompt] | approve [num] | pending | reset",
  credits: "LorexAi + SwordSlush",
  cooldowns: 0,
};

module.exports.run = async function({ api, event, args }) {
  const uid = event.senderID;
  const threadID = event.threadID;
  const messageID = event.messageID;
  const input = args.slice(1).join(' ').trim();
  const command = args[0]?.toLowerCase();

  if(command === 'pending') {
    if(uid !== adminUserID) return api.sendMessage("❌ Hindi ka authorized dito.", threadID, messageID);
    if(pendingGroups.length === 0) return api.sendMessage("✅ Walang pending groups.", threadID, messageID);

    let msg = "⏳ Pending Groups:\n";
    pendingGroups.forEach((g,i) => {
      msg += `${i+1}. ${g.name || "Unknown"} - ID: ${g.threadID}\n`;
    });
    return api.sendMessage(msg, threadID, messageID);
  }

  if(command === 'approve') {
    if(uid !== adminUserID) return api.sendMessage("❌ Hindi ka authorized dito.", threadID, messageID);
    const number = parseInt(args[1]);
    if(!number || number < 1 || number > pendingGroups.length) return api.sendMessage("❌ Invalid number.", threadID, messageID);

    const group = pendingGroups.splice(number -1, 1)[0];
    approvedGroups.add(group.threadID);
    return api.sendMessage(`✅ Na-approve ang group: ${group.name || "Unknown"} (ID: ${group.threadID})`, threadID, messageID);
  }

  if(command === 'reset') {
    userUsage[uid] = 0;
    bannedUsers.delete(uid);
    if(args[1]?.toLowerCase() === 'uptime') {
      uptimeStart = Date.now();
      return api.sendMessage("🔄 Uptime reset na sa 5 oras.", threadID, messageID);
    }
    return api.sendMessage("✅ Usage at ban status mo ay na-reset.", threadID, messageID);
  }

  if(event.isGroup) {
    if(!approvedGroups.has(threadID)) {
      if(!pendingGroups.some(g => g.threadID === threadID)) {
        let threadName = "Unknown";
        try {
          const info = await api.getThreadInfo(threadID);
          threadName = info.threadName || "Unknown";
        } catch{}
        pendingGroups.push({threadID, name: threadName, requestedAt: Date.now()});
      }
      return api.sendMessage(
        "⚠️ Group chat niyo hindi pa na-a-approve para magamit ang AI.\n" +
        "🚦 Hintayin ang approval ng admin.\n" +
        "📌 Admin: gamitin ang `pending` at `approve [number]` commands.",
        threadID, messageID
      );
    }
  }

  if(bannedUsers.has(uid)) {
    return api.sendMessage("❌ Banned ka dahil sa paggamit ng bad words.\n🔄 Type 'nova reset' para ma-unban.", threadID, messageID);
  }

  const lowerInput = input.toLowerCase();
  if(badWords.some(word => lowerInput.includes(word))) {
    bannedUsers.add(uid);
    return api.sendMessage("🚫 May bad words kang ginamit. Na-ban ka na.\n🔄 Type 'nova reset' para ma-unban.", threadID, messageID);
  }

  const minutesUsed = Math.floor((Date.now() - uptimeStart)/60000);
  if(minutesUsed >= UPTIME_LIMIT) {
    return api.sendMessage("🚫 Offline na ang AI. Uptime limit na.\n🛠 Gamitin ang 'nova reset uptime' para i-reset.", threadID, messageID);
  }

  userUsage[uid] = userUsage[uid] || 0;
  if(userUsage[uid] >= 9) {
    return api.sendMessage("⚠️ Naabot mo na ang 9/9 usage limit mo.\n🔄 Gamitin ang 'nova reset' para mag-reset.", threadID, messageID);
  }

  if(!input) {
    return api.sendMessage("❓ Please mag-type ng prompt para sa AI.", threadID, messageID);
  }

  const temp = await sendTemp(api, threadID, "⏳ Tumatanggap ng sagot mula sa AI...");

  try {
    const res = await axios.get('https://daikyu-api.up.railway.app/api/claude-ai', {
      params: { prompt: input, uid: uid }
    });

    userUsage[uid]++;
    const timeNow = new Date().toLocaleString('en-PH', {timeZone: 'Asia/Manila'});

    const reply = `✨ ${convertToBold("NOVA")} AI Response ✨\n` +
                  `━━━━━━━━━━━━━━━━━━\n` +
                  `📌 Prompt: ${input}\n\n` +
                  `📨 Reply:\n${res.data.reply || "Walang sagot."}\n` +
                  `━━━━━━━━━━━━━━━━━━\n` +
                  `⏰ Time: ${timeNow}\n` +
                  `🔋 Powered by Messandra AI\n` +
                  `📊 Usage: ${userUsage[uid]}/9\n` +
                  `⏳ Uptime Left: ${uptimeLeft()}`;

    return api.editMessage(reply, temp.messageID, threadID);

  } catch(err) {
    console.error(err);
    return api.editMessage("❌ Nag-error habang kinukuha ang sagot.", temp.messageID, threadID);
  }
};
