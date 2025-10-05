const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '..', 'users.json');

function loadJSON(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function formatNumber(num) {
  return Number(num).toLocaleString();
}

module.exports.config = {
  name: 'ultrabalance',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: true,
  description: 'Check your Ultra balance (points and dollars)',
  usages: 'ultrabalance',
  cooldowns: 0,
};

module.exports.run = async function ({ api, event }) {
  const uid = event.senderID;
  const users = loadJSON(usersPath);

  if (!users[uid]) {
    return api.sendMessage('❌ You are not registered. Use: ultra register', event.threadID, event.messageID);
  }

  const user = users[uid];
  const points = formatNumber(user.points || 0);
  const dollars = formatNumber((user.dollars || 0).toFixed(2));
  const earnings = formatNumber((user.earnings || 0).toFixed(2)); // Optional field

  let msg = `💳 Ultra Balance\n\n` +
            `💎 Points: ${points}\n` +
            `💵 Dollars: ₱${dollars}`;

  if (user.earnings) {
    msg += `\n💰 Earnings: ₱${earnings}`;
  }

  return api.sendMessage(msg, event.threadID, event.messageID);
};
