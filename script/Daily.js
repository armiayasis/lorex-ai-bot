const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '..', 'userData.json');

const DAILY_REWARD = 5000;
const COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

module.exports.config = {
  name: 'daily',
  version: '1.0.0',
  hasPermission: 0,
  usePrefix: false,
  description: 'Claim your daily reward of ₱5,000',
  usages: 'daily',
  credits: 'LorexAi + ChatGPT',
  cooldowns: 5
};

module.exports.run = async function({ api, event }) {
  const uid = event.senderID;

  try {
    // Load user data
    let data = {};
    if (fs.existsSync(userDataPath)) {
      data = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
    }

    // Initialize user data if not existing
    if (!data[uid]) {
      data[uid] = {
        balance: 0,
        lastSpin: 0,
        lastDaily: 0
      };
    }

    const now = Date.now();

    // Check cooldown
    const lastClaim = data[uid].lastDaily || 0;
    if (now - lastClaim < COOLDOWN) {
      const remaining = COOLDOWN - (now - lastClaim);

      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

      return api.sendMessage(
        `🕓 You've already claimed your daily bonus!\n⏳ Come back in ${hours}h ${minutes}m ${seconds}s.`,
        event.threadID,
        event.messageID
      );
    }

    // Give reward
    data[uid].balance += DAILY_REWARD;
    data[uid].lastDaily = now;

    // Save data
    fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));

    // Send confirmation
    api.sendMessage(
      `🎁 You have claimed your daily bonus!\n💵 You received ₱${DAILY_REWARD.toLocaleString()}.\n🤑 New balance: ₱${data[uid].balance.toLocaleString()}`,
      event.threadID,
      event.messageID
    );

  } catch (err) {
    console.error('❌ Error in daily command:', err);
    api.sendMessage('❌ Something went wrong. Please try again later.', event.threadID, event.messageID);
  }
};
