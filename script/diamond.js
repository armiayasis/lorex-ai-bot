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

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Shop items
const diamondShopItems = [
  { id: 1, name: '💎 Diamond Ring', price: 50 },
  { id: 2, name: '📿 Beaded Necklace', price: 30 },
  { id: 3, name: '🎩 Fancy Hat', price: 20 },
  { id: 4, name: '🕶️ Stylish Glasses', price: 25 },
  { id: 5, name: '👟 Sneakers', price: 40 },
  { id: 6, name: '⌚ Smart Watch', price: 60 },
  { id: 7, name: '🎒 Backpack', price: 15 },
  { id: 8, name: '📱 Smartphone', price: 70 },
  { id: 9, name: '🧥 Jacket', price: 35 },
  { id: 10, name: '🎮 Game Console', price: 80 },
];

const goldShopItems = [
  { id: 1, name: '🏅 Gold Medal', price: 40 },
  { id: 2, name: '⚱️ Golden Vase', price: 60 },
  { id: 3, name: '👑 Gold Crown', price: 100 },
  { id: 4, name: '💰 Gold Coins', price: 25 },
  { id: 5, name: '🪙 Gold Necklace', price: 55 },
  { id: 6, name: '🥇 Trophy', price: 70 },
  { id: 7, name: '💎 Golden Ring', price: 90 },
  { id: 8, name: '📿 Gold Bracelet', price: 35 },
  { id: 9, name: '🛡️ Gold Shield', price: 80 },
  { id: 10, name: '🎖️ Medal', price: 45 },
];

const stoneShopItems = [
  { id: 1, name: '🪨 Stone Axe', price: 15 },
  { id: 2, name: '🛠️ Stone Hammer', price: 20 },
  { id: 3, name: '🏹 Stone Bow', price: 25 },
  { id: 4, name: '🗿 Stone Statue', price: 35 },
  { id: 5, name: '🔨 Stone Chisel', price: 10 },
  { id: 6, name: '⛏️ Stone Pickaxe', price: 30 },
  { id: 7, name: '🪓 Stone Cleaver', price: 22 },
];

// Gift items (free gifts)
const giftItems = [
  { id: 101, name: '🎁 Gift Diamond Ring', type: 'diamond', price: 0 },
  { id: 102, name: '🎁 Gift Gold Medal', type: 'gold', price: 0 },
  { id: 103, name: '🎁 Gift Stone Axe', type: 'stone', price: 0 },
  { id: 104, name: '🎁 Gift Smartphone', type: 'diamond', price: 0 },
  { id: 105, name: '🎁 Gift Trophy', type: 'gold', price: 0 },
];

// Sell multiplier (selling price = item price * this)
const SELL_MULTIPLIER = 3;

// Get shop items by currency type
function getShopItems(type) {
  switch(type) {
    case 'diamond': return diamondShopItems;
    case 'gold': return goldShopItems;
    case 'stone': return stoneShopItems;
    default: return [];
  }
}

// Get rank based on balance
function getRank(balance) {
  if (balance >= 200000) return { rank: 'Master', emoji: '🔴' };
  if (balance >= 50000) return { rank: 'Expert', emoji: '🟠' };
  if (balance >= 10000) return { rank: 'Skilled', emoji: '🟣' };
  if (balance >= 1000) return { rank: 'Novice', emoji: '🔵' };
  return { rank: 'Beginner', emoji: '🟢' };
}

// Help message
const helpMessage = `
🛠️ Commands List:

📋 profile
  - Show your balance, rank, and inventory stocks.

💎 diamond buy|see|shop|sell <item_number>
🏅 gold buy|see|shop|sell <item_number>
🪨 stone buy|see|shop|sell <item_number>
  - Manage currency shops and inventories.

🎁 gift claim
  - Claim a free gift item (one-time).

❓ help
  - Show this help message.
`;

module.exports.config = {
  name: 'diamond',
  version: '1.1.0',
  hasPermission: 0,
  usePrefix: true,
  description: 'Currency shop system for diamond, gold, and stone with profile, rank, gifts, and help',
  usages: 'diamond|gold|stone buy|see|shop|sell <item_number>\nprofile\ngift claim\nhelp',
  cooldowns: 0,
};

module.exports.run = async function({ api, event, args }) {
  const uid = event.senderID;
  const userData = readJson(userDataPath);

  userData[uid] = userData[uid] || {};
  userData[uid].balance = userData[uid].balance || 0;
  userData[uid].diamond = userData[uid].diamond || 0;
  userData[uid].gold = userData[uid].gold || 0;
  userData[uid].stone = userData[uid].stone || 0;
  userData[uid].diamondInventory = userData[uid].diamondInventory || [];
  userData[uid].goldInventory = userData[uid].goldInventory || [];
  userData[uid].stoneInventory = userData[uid].stoneInventory || [];
  userData[uid].giftClaimed = userData[uid].giftClaimed || false;

  if (args.length === 0) {
    return api.sendMessage('❌ Usage: help | profile | diamond|gold|stone buy|see|shop|sell <item_number> | gift claim', event.threadID);
  }

  const cmd = args[0].toLowerCase();

  // HELP command
  if (cmd === 'help' || cmd === '?') {
    return api.sendMessage(helpMessage, event.threadID);
  }

  // GIFT command
  if (cmd === 'gift') {
    const sub = args[1]?.toLowerCase();
    if (sub === 'claim') {
      if (userData[uid].giftClaimed) {
        return api.sendMessage('🎁 You have already claimed your gift!', event.threadID);
      }
      // Give 1 random gift item to user inventory
      const randomGift = giftItems[Math.floor(Math.random() * giftItems.length)];
      userData[uid][`${randomGift.type}Inventory`].push(randomGift);
      userData[uid].giftClaimed = true;
      writeJson(userDataPath, userData);
      return api.sendMessage(`🎉 Congrats! You received a free gift: ${randomGift.name}`, event.threadID);
    } else {
      return api.sendMessage('❌ Usage: gift claim', event.threadID);
    }
  }

  // PROFILE command
  if (cmd === 'profile') {
    const balance = userData[uid].balance;
    const rankInfo = getRank(balance);

    const diamondInv = userData[uid].diamondInventory;
    const goldInv = userData[uid].goldInventory;
    const stoneInv = userData[uid].stoneInventory;

    let msg = `📋 Profile\n\n` +
              `💰 Balance: ₱${balance.toLocaleString()}\n` +
              `⭐ Rank: ${rankInfo.emoji} ${rankInfo.rank}\n\n` +
              `📦 Inventory Stocks:\n` +
              `💎 Diamond: ${diamondInv.length} item(s)\n` +
              `🏅 Gold: ${goldInv.length} item(s)\n` +
              `🪨 Stone: ${stoneInv.length} item(s)\n\n` +
              `🛍️ Use "diamond see", "gold see", "stone see" to check details.`;
    return api.sendMessage(msg, event.threadID);
  }

  // diamond/gold/stone commands
  if (!['diamond','gold','stone'].includes(cmd)) {
    return api.sendMessage('❌ Currency must be diamond, gold, or stone.', event.threadID);
  }

  const currency = cmd;
  const subcommand = args[1]?.toLowerCase();

  if (!['buy','see','shop','sell'].includes(subcommand)) {
    return api.sendMessage('❌ Subcommand must be buy, see, shop, or sell.', event.threadID);
  }

  const shopItems = getShopItems(currency);

  if (subcommand === 'shop') {
    // Show shop items list
    let shopMsg = `🛒 ${currency.charAt(0).toUpperCase() + currency.slice(1)} Shop Items:\n\n`;
    for (const item of shopItems) {
      shopMsg += `${item.id}. ${item.name} - ₱${item.price}\n`;
    }
    return api.sendMessage(shopMsg, event.threadID);
  }

  if (subcommand === 'see') {
    // Show inventory details for the currency
    const inventory = userData[uid][`${currency}Inventory`];
    if (!inventory.length) return api.sendMessage(`📦 You have no ${currency} items in inventory.`, event.threadID);
    let invMsg = `📦 Your ${currency.charAt(0).toUpperCase() + currency.slice(1)} Inventory:\n\n`;
    inventory.forEach((item, idx) => {
      invMsg += `${idx + 1}. ${item.name}\n`;
    });
    return api.sendMessage(invMsg, event.threadID);
  }

  if (subcommand === 'buy') {
    if (args.length !== 3) return api.sendMessage(`❌ Usage: ${currency} buy <item_number>`, event.threadID);
    const itemNumber = parseInt(args[2]);
    if (isNaN(itemNumber)) return api.sendMessage('❌ Please enter a valid item number.', event.threadID);
    const item = shopItems.find(i => i.id === itemNumber);
    if (!item) return api.sendMessage('❌ Item not found.', event.threadID);

    if (userData[uid].balance < item.price) {
      return api.sendMessage(`❌ You don't have enough balance to buy ${item.name}.`, event.threadID);
    }

    // Deduct price and add item to inventory
    userData[uid].balance -= item.price;
    userData[uid][`${currency}Inventory`].push(item);
    writeJson(userDataPath, userData);

    return api.sendMessage(`✅ You bought ${item.name} for ₱${item.price}. Your new balance: ₱${userData[uid].balance.toLocaleString()}`, event.threadID);
  }

  if (subcommand === 'sell') {
    if (args.length !== 3) return api.sendMessage(`❌ Usage: ${currency} sell <item_number>`, event.threadID);
    const invIndex = parseInt(args[2]) - 1;
    const inventory = userData[uid][`${currency}Inventory`];

    if (isNaN(invIndex) || invIndex < 0 || invIndex >= inventory.length) {
      return api.sendMessage('❌ Invalid item number in your inventory.', event.threadID);
    }

    const item = inventory[invIndex];
    // Sell price with multiplier but max payout 8,000,000
    const sellPrice = Math.min(item.price * SELL_MULTIPLIER, 8000000);

    // Remove item and add balance
    inventory.splice(invIndex, 1);
    userData[uid].balance += sellPrice;
    writeJson(userDataPath, userData);

    return api.sendMessage(`💰 You sold ${item.name} for ₱${sellPrice.toLocaleString()}. Your new balance: ₱${userData[uid].balance.toLocaleString()}`, event.threadID);
  }

  return api.sendMessage('❌ Unknown error occurred.', event.threadID);
};
