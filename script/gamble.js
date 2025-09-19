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

function getRandomSchoolSupply() {
  const items = ['📚 Books', '✏️ Pencil', '📏 Ruler', '🖊️ Pen', '📝 Notebook', '🎒 Backpack', '📐 Protractor', '📌 Pushpin'];
  return items[Math.floor(Math.random() * items.length)];
}

module.exports.config = {
  name: 'gamble',
  version: '1.1.0',
  hasPermission: 0,
  usePrefix: true,
  description: 'Gamble your money to earn or lose with school supplies theme',
  usages: 'gamble <amount>',
  cooldowns: 0
};

module.exports.run = async function({ api, event, args }) {
  const uid = event.senderID;
  const userData = readJson(userDataPath);

  if (args.length !== 2) {
    return api.sendMessage('❌ Usage: gamble <amount>', event.threadID);
  }

  const bet = parseInt(args[1]);
  if (isNaN(bet) || bet <= 0) {
    return api.sendMessage('❌ Please enter a valid positive number for amount.', event.threadID);
  }

  userData[uid] = userData[uid] || {};
  userData[uid].balance = userData[uid].balance || 0;

  if (userData[uid].balance < bet) {
    return api.sendMessage(`❌ You don't have enough balance to bet ₱${bet}. Your current balance is ₱${userData[uid].balance}`, event.threadID);
  }

  // Send initial spinning message with random school supplies
  const spinningMsg = await api.sendMessage(`🎲 Spinning the wheel... 🎡\n🎒 Your item: ${getRandomSchoolSupply()}`, event.threadID);

  // Simulate spinning effect delay
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Decide win or lose
  const win = Math.random() < 0.5;

  if (win) {
    userData[uid].balance += bet;
    writeJson(userDataPath, userData);
    // Edit message to show win
    return api.unsendMessage(spinningMsg.messageID)
      .then(() => api.sendMessage(
        `🎉 You won! 🥳\nYou earned ₱${bet} 💰\nYour prize: ${getRandomSchoolSupply()} 🏆\nNew balance: ₱${userData[uid].balance.toLocaleString()}`, 
        event.threadID
      ));
  } else {
    userData[uid].balance -= bet;
    writeJson(userDataPath, userData);
    // Edit message to show lose
    return api.unsendMessage(spinningMsg.messageID)
      .then(() => api.sendMessage(
        `😞 You lost ₱${bet} 💸\nBetter luck next time!\nItem lost: ${getRandomSchoolSupply()} 📉\nNew balance: ₱${userData[uid].balance.toLocaleString()}`, 
        event.threadID
      ));
  }
};
