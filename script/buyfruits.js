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
  name: 'buyfruit',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  description: 'Bumili ng prutas mula sa ibang shop.',
  usages: 'buyfruit <fruit> <qty> <@shopowner>',
  credits: 'LorexAi + ChatGPT',
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const buyerId = event.senderID;
  const threadID = event.threadID;
  const mentions = event.mentions;

  if (args.length < 3 || Object.keys(mentions).length === 0) {
    return api.sendMessage('❗ Usage: buyfruit <fruit> <qty> <@shop owner>', threadID, event.messageID);
  }

  const fruitName = args[0].charAt(0).toUpperCase() + args[0].slice(1).toLowerCase();
  const quantity = parseInt(args[1]);
  const sellerId = Object.keys(mentions)[0];

  if (isNaN(quantity) || quantity <= 0) return api.sendMessage('❌ Invalid quantity.', threadID, event.messageID);
  const fruit = availableFruits.find(f => f.name === fruitName);
  if (!fruit) return api.sendMessage('❌ Prutas hindi kilala.', threadID, event.messageID);

  try {
    let data = fs.existsSync(userDataPath) ? JSON.parse(fs.readFileSync(userDataPath, 'utf8')) : {};
    if (!data[sellerId] || !data[sellerId].shopName) return api.sendMessage('❌ Wala siyang shop.', threadID, event.messageID);
    if (!data[sellerId].fruits || data[s
