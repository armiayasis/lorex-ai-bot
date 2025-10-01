const fs = require('fs');
const path = require('path');

const banFilePath = path.join(__dirname, 'banned.json');

// Helpers
const getBanList = () => {
  if (!fs.existsSync(banFilePath)) return [];
  return JSON.parse(fs.readFileSync(banFilePath, 'utf-8'));
};

const saveBanList = (list) => {
  fs.writeFileSync(banFilePath, JSON.stringify(list, null, 2));
};

module.exports.config = {
  name: "unban",
  version: "1.0.0",
  hasPermission: 2, // Admin only
  usePrefix: false,
  aliases: [],
  description: "Unban a user by replying to their message",
  usages: "unban (reply to user)",
  credits: "GPT",
  cooldowns: 0
};

module.exports.run = async function({ api, event }) {
  const { messageReply, threadID, messageID } = event;

  if (!messageReply) {
    return api.sendMessage("❌ Please reply to the banned user's message to unban them.", threadID, messageID);
  }

  const targetID = messageReply.senderID;
  const banList = getBanList();

  if (!banList.includes(targetID)) {
    return api.sendMessage("⚠️ That user is not banned.", threadID, messageID);
  }

  const updatedList = banList.filter(id => id !== targetID);
  saveBanList(updatedList);

  return api.sendMessage(`✅ User [${targetID}] has been unbanned.`, threadID, messageID);
};
