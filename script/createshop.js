const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '..', 'userData.json');
const availableFruits = ['Cherry', 'Lemon', 'Grapes', 'Watermelon', 'Kiwi', 'Apple', 'Banana'];

module.exports.config = {
  name: 'createshop',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  description: 'Gumawa ng sarili mong tindahan!',
  usages: 'createshop <pangalan>',
  credits: 'LorexAi + ChatGPT',
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const uid = event.senderID;
  const shopName = args.join(' ');

  if (!shopName) return api.sendMessage('❗ Usage: createshop <pangalan ng shop>', event.threadID, event.messageID);

  try {
    let data = fs.existsSync(userDataPath) ? JSON.parse(fs.readFileSync(userDataPath, 'utf8')) : {};

    if (!data[uid]) data[uid] = { balance: 1000 }; // start with 1k
    if (data[uid].shopName) return api.sendMessage(`⚠️ May shop ka na: "${data[uid].shopName}"`, event.threadID, event.messageID);

    data[uid].shopName = shopName;
    data[uid].shopLevel = 1;
    data[uid].shopCreatedAt = new Date().toISOString();
    data[uid].fruits = {};

    // Initialize with random stock
    availableFruits.forEach(fruit => {
      data[uid].fruits[fruit] = Math.floor(Math.random() * 10) + 1;
    });

    fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));
    api.sendMessage(`✅ Shop "${shopName}" successfully created!`, event.threadID, event.messageID);
  } catch (e) {
    console.error(e);
    api.sendMessage('❌ Error creating shop.', event.threadID, event.messageID);
  }
};
