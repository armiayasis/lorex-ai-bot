const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '..', 'userData.json');

// Admin ID and name - Replace ADMIN_ID with your actual admin ID string
const ADMIN_ID = '123456789';
const ADMIN_NAME = 'Manuelson Yasis';
const SYSTEM_NAME = 'Ai Llama Ai';

function loadUserData() {
  if (!fs.existsSync(userDataPath)) return {};
  return JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
}

function saveUserData(data) {
  fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));
}

module.exports.config = {
  name: 'settings',
  version: '1.4.0',
  hasPermission: 2,
  usePrefix: true,
  description: 'System commands: restart, status, send',
  usages: 'system restart | system status | system send <amount>',
  cooldowns: 0,
};

module.exports.run = async function({ api, event, args }) {
  const uid = event.senderID;
  const senderName = event.senderName || 'Unknown';

  const data = loadUserData();

  // Save or update user name if missing or different
  if (!data[uid]) data[uid] = {};
  if (data[uid].name !== senderName) {
    data[uid].name = senderName;
    saveUserData(data);
  }

  if (!args.length) {
    return api.sendMessage(`❌ Usage: system restart | system status | system send <amount>`, event.threadID);
  }

  const cmd = args[0].toLowerCase();

  if (cmd === 'restart') {
    let totalLost = 0;

    for (const id in data) {
      if (id === ADMIN_ID) continue;

      const bal = data[id].balance || 0;
      if (bal > 0) {
        totalLost += bal;
        data[id].balance = 0;
        data[id].losses = (data[id].losses || 0) + bal;
      }
    }

    data[ADMIN_ID] = data[ADMIN_ID] || {};
    data[ADMIN_ID].balance = (data[ADMIN_ID].balance || 0) + totalLost;

    saveUserData(data);

    return api.sendMessage(
      `🔄 System restarted by ${ADMIN_NAME}!\nAll user balances reset.\n₱${totalLost.toLocaleString()} transferred to admin.`,
      event.threadID
    );
  } 
  else if (cmd === 'status') {
    const stock = data.stock || 1000;

    let msg = `🤖 System: ${SYSTEM_NAME}\n👑 Admin: ${ADMIN_NAME}\n\n📊 System Status:\n\n💎 Stock: ${stock.toLocaleString()}\n\n`;

    for (const id in data) {
      const user = data[id];
      const name = user.name || 'Unknown User';
      const bal = user.balance || 0;
      const wins = user.wins || 0;
      const losses = user.losses || 0;
      msg += `👤 ${name} (ID: ${id}):\n  💰 Balance: ₱${bal.toLocaleString()}\n  🏆 Wins: ₱${wins.toLocaleString()}\n  ❌ Losses: ₱${losses.toLocaleString()}\n\n`;
    }

    return api.sendMessage(msg, event.threadID);
  } 
  else if (cmd === 'send') {
    if (args.length < 2) {
      return api.sendMessage('❌ Usage: system send <amount>', event.threadID);
    }

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
      return api.sendMessage('❌ Please enter a valid positive amount.', event.threadID);
    }

    data[ADMIN_ID] = data[ADMIN_ID] || {};
    data[ADMIN_ID].balance = data[ADMIN_ID].balance || 0;

    // Count users excluding admin
    const userIDs = Object.keys(data).filter(id => id !== ADMIN_ID);
    const userCount = userIDs.length;

    const totalCost = amount * userCount;

    if (data[ADMIN_ID].balance < totalCost) {
      return api.sendMessage(`❌ Insufficient funds. Admin balance is ₱${data[ADMIN_ID].balance.toLocaleString()}, total needed ₱${totalCost.toLocaleString()}.`, event.threadID);
    }

    data[ADMIN_ID].balance -= totalCost;

    for (const id of userIDs) {
      data[id].balance = (data[id].balance || 0) + amount;
      data[id].wins = (data[id].wins || 0) + amount;
    }

    saveUserData(data);

    return api.sendMessage(
      `✅ Sent ₱${amount.toLocaleString()} to all ${userCount} users.\nTotal deducted from admin: ₱${totalCost.toLocaleString()}`,
      event.threadID
    );
  } 
  else {
    return api.sendMessage('❌ Unknown system command. Use restart, status or send.', event.threadID);
  }
};

// Helper functions to update stock and balances on user win/lose:

module.exports.onUserWin = function(uid, amountWon) {
  const data = loadUserData();
  data[uid] = data[uid] || {};
  data.stock = data.stock || 1000;

  data[uid].balance = (data[uid].balance || 0) + amountWon;
  data[uid].wins = (data[uid].wins || 0) + amountWon;

  data.stock = Math.max(0, data.stock - amountWon);

  saveUserData(data);
};

module.exports.onUserLose = function(uid, amountLost) {
  const data = loadUserData();
  data[uid] = data[uid] || {};
  data.stock = data.stock || 1000;

  data[uid].balance = Math.max(0, (data[uid].balance || 0) - amountLost);
  data[uid].losses = (data[uid].losses || 0) + amountLost;

  data.stock += amountLost;

  saveUserData(data);
};
