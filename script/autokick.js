const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "autokick.json");

// Read or initialize autokick config
function getConfig() {
  if (!fs.existsSync(configPath)) return {};
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

function saveConfig(data) {
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

module.exports.config = {
  name: "autokick",
  version: "2.0.0",
  hasPermission: 1, // Allow moderators or higher to toggle
  usePrefix: false,
  aliases: ["autokick", "akick"],
  description: "Automatically kicks newly added members from group chats",
  usages: "autokick [on/off]",
  credits: "GPT",
  cooldowns: 3
};

// 🔁 Auto-kick new members if enabled
module.exports.handleEvent = async function ({ api, event }) {
  const { logMessageType, logMessageData, threadID } = event;

  if (logMessageType !== "log:subscribe") return;

  const config = getConfig();
  if (config[threadID] !== true) return; // Only run if enabled for this group

  const addedUsers = logMessageData.addedParticipants;

  for (const user of addedUsers) {
    const uid = user.userFbId;

    // Skip kicking the bot itself
    if (uid === api.getCurrentUserID()) continue;

    try {
      await api.removeUserFromGroup(uid, threadID);
      console.log(`✅ Removed user ${uid} from thread ${threadID}`);
    } catch (err) {
      console.error(`❌ Failed to remove user ${uid}:`, err.message);
    }
  }
};

// ⚙️ Command to toggle auto-kick on/off
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  if (!args[0]) {
    return api.sendMessage("📌 Usage:\n→ autokick on\n→ autokick off", threadID, messageID);
  }

  const config = getConfig();
  const input = args[0].toLowerCase();

  if (input === "on") {
    config[threadID] = true;
    saveConfig(config);
    return api.sendMessage("✅ Auto-kick is now **enabled** in this group.", threadID, messageID);
  }

  if (input === "off") {
    config[threadID] = false;
    saveConfig(config);
    return api.sendMessage("❌ Auto-kick is now **disabled** in this group.", threadID, messageID);
  }

  return api.sendMessage("⚠️ Invalid option. Use `autokick on` or `autokick off`.", threadID, messageID);
};
