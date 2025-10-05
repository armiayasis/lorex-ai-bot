const fs = require('fs');
const path = require('path');

const STOCK_FILE = path.join(__dirname, '..', 'gagstock_items.json');
const NOTIFY_INTERVAL = 2 * 60 * 1000; // 2 minutes

let intervalHandle = null;

// Load items from JSON
function loadStock() {
  if (!fs.existsSync(STOCK_FILE)) return null;
  return JSON.parse(fs.readFileSync(STOCK_FILE, 'utf8'));
}

// Save items to JSON
function saveStock(data) {
  data.updatedAt = Date.now();
  fs.writeFileSync(STOCK_FILE, JSON.stringify(data, null, 2));
}

// Random float in range
function randomFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

// Random int in range
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Start auto tracking
function startTracking(api, groupID) {
  if (intervalHandle) return; // already running

  intervalHandle = setInterval(() => {
    const data = loadStock();
    if (!data || !data.items) return;

    const notifications = [];

    data.items = data.items.map(item => {
      const oldPrice = item.currentPrice;
      const oldStock = item.currentStock;

      // Random price ±10%
      const changePercent = randomFloat(-0.1, 0.1);
      const newPrice = Math.max(1, parseFloat((oldPrice * (1 + changePercent)).toFixed(2)));

      // Random stock change ±2
      const newStock = Math.max(0, oldStock + randomInt(-2, 2));

      const priceChanged = newPrice !== oldPrice;

      // If price changed, push to notifications
      if (priceChanged) {
        notifications.push(
          `📦 ${item.name} (${item.category} | ${item.rarity})\n` +
          `📉 Price: ₱${oldPrice} → ₱${newPrice}\n` +
          `📦 Stock: ${oldStock} → ${newStock}\n` +
          (item.earning ? `💰 Earning: ₱${item.earning}\n` : '')
        );
      }

      // Add to history
      const historyEntry = {
        timestamp: Date.now(),
        price: newPrice,
        stock: newStock
      };

      if (!item.history) item.history = [];
      item.history.unshift(historyEntry);
      if (item.history.length > 10) item.history.pop(); // Keep last 10

      return {
        ...item,
        currentPrice: newPrice,
        currentStock: newStock,
        history: item.history
      };
    });

    saveStock(data);

    // Notify group
    if (notifications.length > 0 && groupID) {
      const message = '📊 Gagstock Items Updated:\n\n' + notifications.join('\n');
      api.sendMessage(message, groupID);
    }

  }, NOTIFY_INTERVAL);
}

module.exports.config = {
  name: 'gagstock',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: true,
  description: 'Track item price & stock every 2 mins and notify group',
  usages: 'gagstock on [groupID] | gagstock off | gagstock status',
  cooldowns: 0,
};

module.exports.run = async function({ api, event, args }) {
  const sub = args[0]?.toLowerCase();
  const groupID = args[1] || event.threadID;

  if (sub === 'on') {
    startTracking(api, groupID);
    return api.sendMessage(`✅ Gagstock tracker started. Sending updates to: ${groupID}`, event.threadID, event.messageID);
  }

  if (sub === 'off') {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
      return api.sendMessage('🛑 Gagstock tracker stopped.', event.threadID, event.messageID);
    } else {
      return api.sendMessage('⚠️ Gagstock tracker is not currently running.', event.threadID, event.messageID);
    }
  }

  if (sub === 'status') {
    const data = loadStock();
    if (!data) return api.sendMessage('❌ No gagstock data found.', event.threadID, event.messageID);

    let msg = `📊 Gagstock Items Status\nLast Updated: ${new Date(data.updatedAt).toLocaleString()}\n\n`;

    data.items.forEach(item => {
      msg += `• ${item.name} (${item.category} | ${item.rarity})\n` +
             `   📉 Price: ₱${item.currentPrice}\n` +
             `   📦 Stock: ${item.currentStock}\n` +
             (item.earning ? `   💰 Earning: ₱${item.earning}\n` : '') +
             `\n`;
    });

    return api.sendMessage(msg.trim(), event.threadID, event.messageID);
  }

  // Help / fallback
  return api.sendMessage(
    '🧺 Gagstock Tracker Commands:\n' +
    '• gagstockitems on [groupID] – Start tracker\n' +
    '• gagstockitems off – Stop tracker\n' +
    '• gagstockitems status – Show item list with price, stock & earnings',
    event.threadID,
    event.messageID
  );
};
