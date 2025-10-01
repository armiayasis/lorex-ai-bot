const fs = require('fs');
const path = require('path');

const banFilePath = path.join(__dirname, 'banned.json');

// Helper to read and write ban list
const getBanList = () => {
  if (!fs.existsSync(banFilePath)) return [];
  return JSON.parse(fs.readFileSync(banFilePath, 'utf-8'));
};

const saveBanList = (list) => {
  fs.writeFileSync(banFilePath, JSON.stringify(list, null, 2));
};

module.exports.config = {
  name: "ban",
  version: "1.0.0",
  hasPermission: 2, // admin only
  usePrefix: false,
  aliases: [],
  description: "Ban a user by replying to their message",
  usages: "ban (reply to user)",
  credits: "GPT-5",
  cooldowns: 0
};

module.exports.run = async function({ api, event }) {
  const { messageReply, threadID, messageID, senderID } = event;

  // Check if reply exists
  if (!messageReply) {
    return api.sendMessage("❌ Please reply to the user's message you want to ban.", threadID, messageID);
  }

  const targetID = messageReply.senderID;

  if (targetID === senderID) {
    return api.sendMessage("❌ You can't ban yourself.", threadID, messageID);
  }

  const banList = getBanList();

  if (banList.includes(targetID)) {
    return api.sendMessage("⚠️ That user is already banned.", threadID, messageID);
  }

  banList.push(targetID);
  saveBanList(banList);

  return api.sendMessage(`✅ User [${targetID}] has been banned.`, threadID, messageID);
};
