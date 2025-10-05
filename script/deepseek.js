const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Admin user ID who can toggle and ban/unban/kick
const ADMIN_ID = "61580959514473"; // Replace with actual admin ID

// Paths for persistent storage
const BAN_LIST_PATH = path.join(__dirname, "deepseek_banlist.json");
const TOGGLE_PATH = path.join(__dirname, "deepseek_toggle.json");
const AUTOKICK_PATH = path.join(__dirname, "deepseek_autokick.json");

// Load ban list or initialize empty
let banList = [];
if (fs.existsSync(BAN_LIST_PATH)) {
  try {
    banList = JSON.parse(fs.readFileSync(BAN_LIST_PATH));
  } catch {
    banList = [];
  }
}

// Load toggle status or default to ON (true)
let deepseekEnabled = true;
if (fs.existsSync(TOGGLE_PATH)) {
  try {
    deepseekEnabled = JSON.parse(fs.readFileSync(TOGGLE_PATH));
  } catch {
    deepseekEnabled = true;
  }
}

// Load autokick status or default OFF (false)
let autoKickEnabled = false;
if (fs.existsSync(AUTOKICK_PATH)) {
  try {
    autoKickEnabled = JSON.parse(fs.readFileSync(AUTOKICK_PATH));
  } catch {
    autoKickEnabled = false;
  }
}

// Helpers to save data
function saveBanList() {
  fs.writeFileSync(BAN_LIST_PATH, JSON.stringify(banList, null, 2));
}

function saveToggle() {
  fs.writeFileSync(TOGGLE_PATH, JSON.stringify(deepseekEnabled));
}

function saveAutoKick() {
  fs.writeFileSync(AUTOKICK_PATH, JSON.stringify(autoKickEnabled));
}

// Emojis for auto reaction
const reactionEmojis = [
  "😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊",
  "😋","😎","😍","😘","😗","😙","😚","☺","🙂","🤗",
  "😇","🤠","🤡","🤓","🤔","😐","😑","💀","👻","😻",
  "😺","😻","😼","🍇","🍓","🌿","📁"
];

module.exports.config = {
  name: "deepseek",
  version: "1.5.0",
  hasPermission: 0,
  usePrefix: true,
  aliases: ["dseek", "ds"],
  description: "Chat with DeepSeek AI with admin toggle, ban/kick, auto reaction, autokick on member add, banned list, owner info",
  usages: `
deepseek <your question>
deepseek on - (admin only) enable DeepSeek
deepseek off - (admin only) disable DeepSeek
deepseek ban - (admin only, reply) ban user
deepseek unban - (admin only, reply) unban user
deepseek banall - (admin only) ban all users in thread
deepseek unbanall - (admin only) unban all users in thread
deepseek kick - (admin only, reply) kick user from thread
deepseek banned - (admin only) show banned users list
deepseek autokick on - (admin only) enable auto kick on member add
deepseek autokick off - (admin only) disable auto kick on member add
`,
  credits: "You + Daikyu API",
  cooldowns: 0
};

// To handle auto kick when new users added, export another event handler if your bot supports
// Otherwise, call this from your main event handler when 'event.logMessageType === "log:subscribe"'

module.exports.handleEvent = async function({ api, event }) {
  const { logMessageType, author, addedParticipants, threadID } = event;

  // Auto reaction for every message except bot itself
  if (event.messageID && author) {
    const botID = api.getCurrentUserID?.() || "your_bot_id_here";
    if (author !== botID) {
      const emoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
      api.setMessageReaction(emoji, event.messageID, () => {}, true);
    }
  }

  // Auto kick on user added to group
  if (logMessageType === "log:subscribe" && autoKickEnabled && Array.isArray(addedParticipants)) {
    // Kick the user who added the new participant(s) — that is the author of the event
    try {
      // Prevent kicking self
      const botID = api.getCurrentUserID?.() || "your_bot_id_here";
      if (author !== botID) {
        await api.removeUserFromGroup(author, threadID);
        api.sendMessage(`👢 Auto-kicked user ${author} for adding new members.`, threadID);
      }
    } catch (err) {
      console.error("❌ AutoKick Error:", err);
      // Optionally notify failure or silently ignore
    }
  }
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID, messageReply } = event;

  // === AUTO REACTION to all user messages ===
  const botID = api.getCurrentUserID?.() || "your_bot_id_here";
  if (senderID !== botID) {
    const emoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
    api.setMessageReaction(emoji, messageID, () => {}, true);
  }
  // ===========================================

  if (!args[0]) {
    return api.sendMessage("❓ Usage: deepseek <your question>", threadID, messageID);
  }

  const cmd = args[0].toLowerCase();

  // Admin only commands:
  if ([
    "on", "off", "ban", "unban", "banall", "unbanall", "kick", "banned",
    "autokick"
  ].includes(cmd)) {
    if (senderID !== ADMIN_ID) {
      return api.sendMessage("❌ You do not have permission to use this command.", threadID, messageID);
    }

    if (cmd === "on" || cmd === "off") {
      deepseekEnabled = (cmd === "on");
      saveToggle();
      return api.sendMessage(`✅ DeepSeek has been turned ${cmd.toUpperCase()}.`, threadID, messageID);
    }

    if (cmd === "autokick") {
      if (!args[1] || !["on", "off"].includes(args[1].toLowerCase())) {
        return api.sendMessage("❓ Usage: deepseek autokick <on|off>", threadID, messageID);
      }
      autoKickEnabled = (args[1].toLowerCase() === "on");
      saveAutoKick();
      return api.sendMessage(`✅ Auto-kick on member add is now ${autoKickEnabled ? "ENABLED" : "DISABLED"}.`, threadID, messageID);
    }

    if (cmd === "ban" || cmd === "unban" || cmd === "kick") {
      if (!messageReply || !messageReply.senderID) {
        return api.sendMessage(`❗ Please reply to the user's message you want to ${cmd}.`, threadID, messageID);
      }
      const targetID = messageReply.senderID;

      if (cmd === "ban") {
        if (banList.includes(targetID)) {
          return api.sendMessage("⚠️ This user is already banned from DeepSeek.", threadID, messageID);
        }
        banList.push(targetID);
        saveBanList();
        return api.sendMessage("🚫 User has been banned from using DeepSeek.", threadID, messageID);
      }

      if (cmd === "unban") {
        if (!banList.includes(targetID)) {
          return api.sendMessage("⚠️ This user is not banned.", threadID, messageID);
        }
        banList = banList.filter(id => id !== targetID);
        saveBanList();
        return api.sendMessage("✅ User has been unbanned and can now use DeepSeek.", threadID, messageID);
      }

      if (cmd === "kick") {
        try {
          await api.removeUserFromGroup(targetID, threadID);
          return api.sendMessage("👢 User has been kicked from the thread.", threadID, messageID);
        } catch (err) {
          console.error("❌ Kick Error:", err);
          return api.sendMessage("❌ Failed to kick user. Make sure I have permissions.", threadID, messageID);
        }
      }
    }

    if (cmd === "banall") {
      try {
        const threadInfo = await api.getThreadInfo(threadID);
        const members = threadInfo.participantIDs || [];

        let newBans = 0;
        for (const id of members) {
          if (id !== ADMIN_ID && !banList.includes(id)) {
            banList.push(id);
            newBans++;
          }
        }
        saveBanList();

        return api.sendMessage(`🚫 Banned ${newBans} users in this thread.`, threadID, messageID);
      } catch (err) {
        console.error("❌ banall error:", err);
        return api.sendMessage("❌ Failed to ban all users.", threadID, messageID);
      }
    }

    if (cmd === "unbanall") {
      try {
        const threadInfo = await api.getThreadInfo(threadID);
        const members = threadInfo.participantIDs || [];

        let unbannedCount = 0;
        banList = banList.filter(id => {
          if (members.includes(id)) {
            unbannedCount++;
            return false;
          }
          return true;
        });
        saveBanList();

        return api.sendMessage(`✅ Unbanned ${unbannedCount} users in this thread.`, threadID, messageID);
      } catch (err) {
        console.error("❌ unbanall error:", err);
        return api.sendMessage("❌ Failed to unban all users.", threadID, messageID);
      }
    }

    if (cmd === "banned") {
      if (banList.length === 0) {
        return api.sendMessage("✅ There are currently no banned users.", threadID, messageID);
      }
      // Show banned user IDs in a neat list
      const bannedListText = banList.map((id, i) => `${i + 1}. ${id}`).join("\n");
      return api.sendMessage(`🚫 Banned Users List:\n${bannedListText}`, threadID, messageID);
    }
  }

  // Block if DeepSeek is off for non-admin
  if (!deepseekEnabled && senderID !== ADMIN_ID) {
    return api.sendMessage("⚠️ DeepSeek AI is currently disabled by the admin.", threadID, messageID);
  }

  // Check if sender is banned
  if (banList.includes(senderID)) {
    return api.sendMessage("🚫 You are banned from using DeepSeek AI.", threadID, messageID);
  }

  // Normal deepseek question
  const question = args.join(" ");
  if (!question) {
    return api.sendMessage("❓ Usage: deepseek <your question>", threadID, messageID);
  }

  api.setMessageReaction("🤖", messageID, () => {}, true);

  try {
    const res = await axios.get("https://daikyu-api.up.railway.app/api/deepseekv3", {
      params: {
        ask: question,
        uid: senderID
      },
      timeout: 15000
    });

    const reply = res.data?.response || "⚠️ Sorry, no answer was found.";

    const formattedReply =
`━━━━━━━━━━━━━━━━━━━━
🤖 𝗗𝗘𝗘𝗣𝗦𝗘𝗘𝗞 𝗔𝗜 𝗥𝗘𝗦𝗣𝗢𝗡𝗦𝗘
━━━━━━━━━━━━━━━━━━━━

❓ Your Question:
${question}

💬 AI Says:
${reply}

━━━━━━━━━━━━━━━━━━━━
🔗 POWERED BY LOREX AI
👤 Owner: Manuelson Yasis (15 years old)
🌐 Profile: https://www.facebook.com/manuelson.267543`;

    return api.sendMessage(formattedReply, threadID, messageID);
  } catch (err) {
    console.error("❌ DeepSeek Error:", err.message || err);
    return api.sendMessage("❌ Unable to connect to DeepSeek API. Please try again later.", threadID, messageID);
  }
};
