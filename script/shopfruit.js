const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '..', 'userData.json');

const availableFruits = [
  { emoji: '🍒', name: 'Cherry', price: 150 },
  { emoji: '🍋', name: 'Lemon', price: 100 },
  { emoji: '🍇', name: 'Grapes', price: 120 },
  { emoji: '🍉', name: 'Watermelon', price: 200 },
  { emoji: '🥝', name: 'Kiwi', price: 180 },
  { emoji: '🍎', name: 'Apple', price: 130 },
  { emoji: '🍌', name: 'Banana', price: 110 }
];

module.exports.config = {
  name: 'shopfruits',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  description: 'Listahan ng prutas sa shop mo.',
  usages: 'shopfruits',
  credits: 'LorexAi + ChatGPT',
  cooldowns: 0
};

module.exports.run = async function({ api, event }) {
  const uid = event.senderID;

  try {
    let data = fs.existsSync(userDataPath) ? JSON.parse(fs.readFileSync(userDataPath, 'utf8')) : {};
    if (!data[uid] || !data[uid].shopName) return api.sendMessage('❌ Wala kang shop.', event.threadID, event.messageID);

    const fruits = data[uid].fruits || {};
    let msg = `🍉 Prutas for Sale sa "${data[uid].shopName}":\n\n`;

    availableFruits.forEach(f => {
      const stock = fruits[f.name] || 0;
      msg += `${f.emoji} ${f.name} — ₱${f.price} (${stock} in stock)\n`;
    });

    api.sendMessage(msg, event.threadID, event.messageID);
  } catch (e) {
    console.error(e);
    api.sendMessage('❌ Error loading fruits.', event.threadID, event.messageID);
  }
};
