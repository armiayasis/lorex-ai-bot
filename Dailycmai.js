const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '..', 'userData.json');
const settingsPath = path.join(__dirname, '..', 'settings.json');

const DAILY_BONUS = 470;
const COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

module.exports.config = {
  name: 'dailyclaim',
  version: '1.0.0',
  hasPermission: 0,
  description: 'Claim your daily ₱470 bonus!',
  usages: 'dailyclaim',
  cooldowns: 5
};

module.exports.run = async function({ api, event }) {
  const userId = event.senderID;
  const threadID = event.threadID;

  try {
    // Load settings
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } else {
      // Create default settings if not exist
      settings = { dailyClaimEnabled: true };
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    }

    if (!settings.dailyClaimEnabled) {
      return api.sendMessage('❌ Daily claim bonus is currently DISABLED.', threadID, event.messageID);
    }

    // Load user data
    let data = {};
    if (fs.existsSync(userDataPath)) {
      data = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
    }

    if (!data[userId]) {
      data[userId] = { balance: 0, savings: 0, fruits: {}, balanceProtection: false, lastDailyClaim: 0 };
    }

    const now = Date.now();

    if (now - (data[userId].lastDailyClaim || 0) < COOLDOWN) {
      const remaining = COOLDOWN - (now - data[userId].lastDailyClaim);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      return api.sendMessage(`⏳ You already claimed your daily bonus. Please wait ${hours}h ${minutes}m before claiming again.`, threadID, event.messageID);
    }

    // Add bonus
    data[userId].balance += DAILY_BONUS;
    data[userId].lastDailyClaim = now;

    fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));

    api.sendMessage(`🎉 Congrats! You claimed your daily ₱${DAILY_BONUS.toLocaleString()} bonus!`, threadID, event.messageID);

  } catch (err) {
    console.error('Error in dailyclaim command:', err);
    api.sendMessage('❌ Something went wrong. Please try again later.', threadID, event.messageID);
  }
};
