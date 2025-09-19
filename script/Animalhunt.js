const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '..', 'userData.json');

const animals = [
  { name: '🐅 Tiger', minReward: 1000, maxReward: 50000 },
  { name: '🦁 Lion', minReward: 2000, maxReward: 40000 },
  { name: '🐍 Snake', minReward: 500, maxReward: 15000 },
  { name: '🦌 Deer', minReward: 1500, maxReward: 30000 },
  { name: '🐒 Monkey', minReward: 1000, maxReward: 25000 },
  { name: '🐘 Elephant', minReward: 3000, maxReward: 60000 },
  { name: '🦉 Owl', minReward: 800, maxReward: 20000 },
  { name: '🐦 Bird', minReward: 500, maxReward: 10000 },
  { name: '🐺 Wolf', minReward: 1800, maxReward: 35000 },
  { name: '🐻 Bear', minReward: 2500, maxReward: 45000 }
];

function loadUserData() {
  if (!fs.existsSync(userDataPath)) return {};
  return JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
}

function saveUserData(data) {
  fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports.config = {
  name: 'animalhunt',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: true,
  description: 'Hunt animals and earn money',
  usages: 'animalhunt',
  cooldowns: 0
};

module.exports.run = async function({ api, event }) {
  const uid = event.senderID;
  const senderName = event.senderName || 'Unknown';

  const data = loadUserData();

  // Save or update user name if missing or different
  if (!data[uid]) data[uid] = {};
  if (data[uid].name !== senderName) {
    data[uid].name = senderName;
  }

  // Pick random animal
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const reward = getRandomInt(animal.minReward, animal.maxReward);

  // Update balance and wins
  data[uid].balance = (data[uid].balance || 0) + reward;
  data[uid].wins = (data[uid].wins || 0) + reward;

  saveUserData(data);

  // Send message with results
  return api.sendMessage(
    `🎯 ${senderName}, you hunted a ${animal.name}!\n💰 You earned ₱${reward.toLocaleString()}!\n\nKeep hunting to increase your balance!`,
    event.threadID,
    event.messageID
  );
};
