const fs = require('fs');
const path = require('path');
const userDataPath = path.join(__dirname, '..', 'userData.json');

module.exports.config = {
  name: 'protection',
  version: '1.0.0',
  hasPermission: 0,
  description: 'Toggle balance protection ON/OFF',
  usages: 'balanceprotection <on|off>',
  cooldowns: 0
};

module.exports.run = async function ({ api, event, args }) {
  const userId = event.senderID;
  const threadID = event.threadID;

  if (!args[0] || !['on', 'off'].includes(args[0].toLowerCase())) {
    return api.sendMessage('❗ Usage: balanceprotection <on|off>', threadID, event.messageID);
  }

  try {
    let data = fs.existsSync(userDataPath) ? JSON.parse(fs.readFileSync(userDataPath, 'utf8')) : {};
    if (!data[userId]) data[userId] = { balance: 0, savings: 0, fruits: {}, balanceProtection: false };

    data[userId].balanceProtection = args[0].toLowerCase() === 'on';

    fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));

    api.sendMessage(`✅ Balance protection is now ${data[userId].balanceProtection ? 'ON' : 'OFF'}.`, threadID, event.messageID);

  } catch (err) {
    console.error('Error in balanceprotection command:', err);
    api.sendMessage('❌ May error habang sine-set ang balance protection.', threadID, event.messageID);
  }
};
