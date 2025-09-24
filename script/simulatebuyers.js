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

// Generate 54 fake users (IDs 900001 to 900054)
const fakeUsers = Array.from({ length: 54 }, (_, i) => ({
  id: 900001 + i,
  name: `Customer_${i + 1}`
}));

module.exports.config = {
  name: 'simulatebuyers',
  version: '1.0.0',
  hasPermission: 2,
  usePrefix: false,
  description: 'Auto simulate 54 virtual buyers buying fruits from real shops.',
  usages: 'simulatebuyers',
  credits: 'LorexAi + ChatGPT',
  cooldowns: 0
};

module.exports.run = async function ({ api, event }) {
  const threadID = event.threadID;

  try {
    let data = fs.existsSync(userDataPath) ? JSON.parse(fs.readFileSync(userDataPath, 'utf8')) : {};

    // Find all real users with shops
    const sellers = Object.entries(data)
      .filter(([id, user]) => user.shopName && user.fruits)
      .map(([id, user]) => ({ id, name: user.shopName }));

    if (sellers.length === 0) {
      return api.sendMessage('❌ Walang available na shop para pagbentahan.', threadID, event.messageID);
    }

    let successCount = 0;

    for (const buyer of fakeUsers) {
      const seller = sellers[Math.floor(Math.random() * sellers.length)];
      const fruit = availableFruits[Math.floor(Math.random() * availableFruits.length)];
      const quantity = Math.floor(Math.random() * 3) + 1; // Buy 1–3

      const sellerData = data[seller.id];

      // Skip if seller has no or insufficient stock
      if (!sellerData.fruits[fruit.name] || sellerData.fruits[fruit.name] < quantity) continue;

      const totalCost = fruit.price * quantity;

      // Add buyer to data if not yet
      if (!data[buyer.id]) data[buyer.id] = { balance: 100000, fruits: {} };
      if (!data[buyer.id].fruits) data[buyer.id].fruits = {};

      // Deduct from buyer
      data[buyer.id].balance -= totalCost;
      data[buyer.id].fruits[fruit.name] = (data[buyer.id].fruits[fruit.name] || 0) + quantity;

      // Add to seller
      data[seller.id].balance += totalCost;
      data[seller.id].fruits[fruit.name] -= quantity;

      successCount++;

      // Notify seller
      api.sendMessage(
        `📢 [AUTO BUYER]\n🛍️ ${buyer.name} bumili ng ${quantity} ${fruit.emoji} ${fruit.name} sa "${sellerData.shopName}"\n💰 Kita: ₱${totalCost.toLocaleString()}`,
        seller.id
      );
    }

    fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));

    api.sendMessage(`✅ ${successCount} auto-buy transactions done by 54 fake customers.`, threadID, event.messageID);

  } catch (err) {
    console.error('❌ simulatebuyers error:', err);
    api.sendMessage('❌ May error habang nag-simulate ng buyers.', threadID, event.messageID);
  }
};
