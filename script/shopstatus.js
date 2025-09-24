const fs = require('fs');
const path = require('path');
const userDataPath = path.join(__dirname, '..', 'userData.json');

module.exports.config = {
  name: 'shopstatus',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  description: 'Status ng shop mo.',
  usages: 'shopstatus',
  credits: 'LorexAi + ChatGPT',
  cooldowns: 0
};

module.exports.run = async function({ api, event }) {
  const uid = event.senderID;

  try {
    if (!fs.existsSync(userDataPath)) return api.sendMessage('❌ Wala pang data.', event.threadID, event.messageID);
    const data = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));

    if (!data[uid] || !data[uid].shopName) return api.sendMessage('❌ Wala kang shop. Gumamit ng createshop.', event.threadID, event.messageID);

    const shop = data[uid];
    const created = new Date(shop.shopCreatedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

    const msg = `🏪 Shop Status\n\n📛 Pangalan: ${shop.shopName}\n📈 Level: ${shop.shopLevel}\n💰 Balance: ₱${shop.balance.toLocaleString()}\n📅 Created: ${created}`;
    api.sendMessage(msg, event.threadID, event.messageID);
  } catch (e) {
    console.error(e);
    api.sendMessage('❌ Error loading shop status.', event.threadID, event.messageID);
  }
};
