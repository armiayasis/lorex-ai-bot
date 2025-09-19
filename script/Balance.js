const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '..', 'userData.json');

module.exports.config = {
  name: 'bal',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  description: 'Check your current balance',
  usages: 'money',
  credits: 'LorexAi',
  cooldowns: 0
};

module.exports.run = async function({ api, event }) {
  const uid = event.senderID;

  try {
    // Basahin ang userData.json
    const data = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));

    // I-check kung may record ang user, kung wala set balance sa 0
    const balance = (data[uid]?.balance || 0).toLocaleString();

    // Mag-send ng mensahe
    api.sendMessage(`💰 Your current balance is:\n\n💰 ₱${balance}`, event.threadID, event.messageID);
  } catch (err) {
    console.error('❌ Error reading userData.json:', err);
    api.sendMessage('❌ Could not retrieve your balance. Please try again later.', event.threadID, event.messageID);
  }
};
