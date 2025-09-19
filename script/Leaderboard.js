const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '..', 'userData.json');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

module.exports.config = {
  name: 'leaderboard',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: true,
  description: 'Show top users by balance',
  usages: 'leaderboard',
  cooldowns: 5
};

module.exports.run = async function({ api, event }) {
  const userData = readJson(userDataPath);

  // Convert userData object to array with [uid, balance]
  const leaderboard = Object.entries(userData)
    .map(([uid, data]) => ({ uid, balance: data.balance || 0 }))
    .filter(user => user.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 10); // Top 10

  if (leaderboard.length === 0) {
    return api.sendMessage('❌ No users with balance found.', event.threadID);
  }

  let message = '🏆 Top 10 Leaderboard 🏆\n\n';

  leaderboard.forEach((user, index) => {
    message += `${index + 1}. ${user.uid} - ₱${user.balance.toLocaleString()}\n`;
  });

  return api.sendMessage(message, event.threadID);
};
