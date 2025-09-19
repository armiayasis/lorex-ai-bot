const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '..', 'userData.json');

const MIN_EARN = 80000;
const MAX_EARN = 5000000;

module.exports.config = {
  name: 'work',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: true,
  description: 'Work to earn money (no cooldown)',
  usages: 'work',
  cooldowns: 0
};

module.exports.run = async function({ api, event }) {
  const uid = event.senderID;

  // Load user data
  const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
  userData[uid] = userData[uid] || {};
  userData[uid].balance = userData[uid].balance || 0;

  // Calculate random earnings between MIN_EARN and MAX_EARN
  const earn = Math.floor(Math.random() * (MAX_EARN - MIN_EARN + 1)) + MIN_EARN;

  // Add earnings to balance
  userData[uid].balance += earn;

  // Save data
  fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));

  // Send message
  return api.sendMessage(`💼 You worked hard and earned ₱${earn.toLocaleString()}! Keep it up!`, event.threadID);
};
